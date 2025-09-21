const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const relationshipValidation = [
  body('patientId')
    .isUUID()
    .withMessage('Valid patient ID is required'),
  body('doctorId')
    .isUUID()
    .withMessage('Valid doctor ID is required'),
  body('relationshipType')
    .isIn(['primary_care', 'specialist', 'consultation', 'emergency'])
    .withMessage('Relationship type must be primary_care, specialist, consultation, or emergency'),
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'transferred', 'completed'])
    .withMessage('Status must be active, inactive, transferred, or completed')
];

// Get all patient-doctor relationships
router.get('/', async (req, res) => {
  console.log('GET /api/patient-doctors called');
  try {
    const { PatientDoctor, Patient, Doctor, User } = require('../models');
    const { Op } = require('sequelize');
    const { 
      page = 1, 
      limit = 10, 
      patientId, 
      doctorId, 
      relationshipType, 
      status,
      priority 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (patientId) whereClause.patientId = patientId;
    if (doctorId) whereClause.doctorId = doctorId;
    if (relationshipType) whereClause.relationshipType = relationshipType;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    
    // If user is doctor, only show their relationships
    if (req.user.role === 'doctor') {
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (userDoctor) {
        whereClause.doctorId = userDoctor.id;
      }
    }
    
    const { count, rows: relationships } = await PatientDoctor.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }]
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        relationships,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get relationships error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get relationship by ID
router.get('/:id', async (req, res) => {
  try {
    const { PatientDoctor, Patient, Doctor, User } = require('../models');
    const { id } = req.params;
    
    const relationship = await PatientDoctor.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }]
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }]
        }
      ]
    });
    
    if (!relationship) {
      return res.status(404).json({
        status: 'error',
        message: 'Relationship not found'
      });
    }
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== relationship.patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    if (req.user.role === 'doctor') {
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== relationship.doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: { relationship }
    });
  } catch (error) {
    console.error('Get relationship error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Create new patient-doctor relationship
router.post('/', relationshipValidation, async (req, res) => {
  console.log('POST /api/patient-doctors called');
  console.log('User role:', req.user?.role);
  console.log('User ID:', req.user?.id);
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { PatientDoctor, Patient, Doctor } = require('../models');
    const { patientId, doctorId, relationshipType, startDate, endDate, notes, referralReason, diagnosis, treatmentPlan, nextAppointment, priority, status } = req.body;
    
    // Check if user has permission to create this relationship
    if (req.user.role === 'patient') {
      // For patients, we need to find their patient profile first
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      console.log('Patient check:', { userId: req.user.id, userPatient: userPatient?.id, requestedPatientId: patientId });
      if (!userPatient || userPatient.id !== patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Patients can only create relationships for themselves'
        });
      }
    } else if (req.user.role === 'doctor') {
      // For doctors, we need to find their doctor profile first
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Doctors can only create relationships for themselves'
        });
      }
    }
    // Admins can create any relationship
    
    // Verify patient and doctor exist
    const patient = await Patient.findByPk(patientId);
    const doctor = await Doctor.findByPk(doctorId);
    
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        message: 'Doctor not found'
      });
    }
    
    // Check if relationship already exists
    const existingRelationship = await PatientDoctor.findOne({
      where: {
        patientId,
        doctorId,
        relationshipType
      }
    });
    
    if (existingRelationship) {
      return res.status(409).json({
        status: 'error',
        message: 'Relationship already exists'
      });
    }
    
    const relationship = await PatientDoctor.create({
      patientId,
      doctorId,
      relationshipType,
      startDate,
      endDate,
      notes,
      referralReason,
      diagnosis,
      treatmentPlan,
      nextAppointment,
      priority: priority || 'medium',
      status: status || 'active'
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Patient-doctor relationship created successfully',
      data: { relationship }
    });
  } catch (error) {
    console.error('Create relationship error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Update patient-doctor relationship
router.put('/:id', relationshipValidation, async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { PatientDoctor } = require('../models');
    const { id } = req.params;
    
    const relationship = await PatientDoctor.findByPk(id);
    if (!relationship) {
      return res.status(404).json({
        status: 'error',
        message: 'Relationship not found'
      });
    }
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== relationship.patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    if (req.user.role === 'doctor') {
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== relationship.doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    await relationship.update(req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Relationship updated successfully',
      data: { relationship }
    });
  } catch (error) {
    console.error('Update relationship error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Delete patient-doctor relationship
router.delete('/:id', authorize('admin', 'doctor'), async (req, res) => {
  try {
    const { PatientDoctor } = require('../models');
    const { id } = req.params;
    
    const relationship = await PatientDoctor.findByPk(id);
    if (!relationship) {
      return res.status(404).json({
        status: 'error',
        message: 'Relationship not found'
      });
    }
    
    // Check if doctor can delete this relationship
    if (req.user.role === 'doctor') {
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== relationship.doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    await relationship.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Relationship deleted successfully'
    });
  } catch (error) {
    console.error('Delete relationship error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get patient's doctors
router.get('/patient/:patientId/doctors', async (req, res) => {
  try {
    const { PatientDoctor, Doctor, User } = require('../models');
    const { patientId } = req.params;
    const { status = 'active' } = req.query;
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    const relationships = await PatientDoctor.findAll({
      where: { 
        patientId,
        status 
      },
      include: [{
        model: Doctor,
        as: 'doctor',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: { relationships }
    });
  } catch (error) {
    console.error('Get patient doctors error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get doctor's patients
router.get('/doctor/:doctorId/patients', async (req, res) => {
  try {
    const { PatientDoctor, Patient, User } = require('../models');
    const { doctorId } = req.params;
    const { status = 'active' } = req.query;
    
    // Check access permissions
    if (req.user.role === 'doctor') {
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    const relationships = await PatientDoctor.findAll({
      where: { 
        doctorId,
        status 
      },
      include: [{
        model: Patient,
        as: 'patient',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: { relationships }
    });
  } catch (error) {
    console.error('Get doctor patients error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
