const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// All doctor routes require authentication
router.use(authenticateToken);

// Validation rules
const doctorValidation = [
  body('licenseNumber')
    .notEmpty()
    .withMessage('License number is required'),
  body('specialization')
    .notEmpty()
    .withMessage('Specialization is required'),
  body('yearsOfExperience')
    .optional()
    .isNumeric()
    .withMessage('Years of experience must be a number'),
  body('consultationFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),
  body('maxPatientsPerDay')
    .optional()
    .isNumeric()
    .withMessage('Max patients per day must be a number'),
  body('consultationDuration')
    .optional()
    .isNumeric()
    .withMessage('Consultation duration must be a number')
];

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const { Doctor, User } = require('../models');
    const { Op } = require('sequelize');
    const { page = 1, limit = 10, search, specialization, isAvailable } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (specialization) {
      whereClause.specialization = { [Op.like]: `%${specialization}%` };
    }
    
    if (isAvailable !== undefined) {
      whereClause.isAvailable = isAvailable === 'true';
    }
    
    const { count, rows: doctors } = await Doctor.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        where: search ? {
          [Op.or]: [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        } : undefined
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['rating', 'DESC'], ['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        doctors,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const { Doctor, User } = require('../models');
    const { id } = req.params;
    
    const doctor = await Doctor.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }]
    });
    
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        message: 'Doctor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { doctor }
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Create doctor profile
router.post('/', doctorValidation, async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { Doctor } = require('../models');
    
    // Check if doctor profile already exists for this user
    if (req.user.role === 'doctor') {
      const existingDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (existingDoctor) {
        return res.status(409).json({
          status: 'error',
          message: 'Doctor profile already exists for this user'
        });
      }
    }
    
    const doctorData = {
      ...req.body,
      userId: req.user.role === 'doctor' ? req.user.id : req.body.userId
    };
    
    const doctor = await Doctor.create(doctorData);
    
    res.status(201).json({
      status: 'success',
      message: 'Doctor profile created successfully',
      data: { doctor }
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update doctor profile
router.put('/:id', doctorValidation, async (req, res) => {
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
    
    const { Doctor } = require('../models');
    const { id } = req.params;
    
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        message: 'Doctor not found'
      });
    }
    
    // Check if user can update this doctor data
    if (req.user.role === 'doctor' && doctor.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    await doctor.update(req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Doctor profile updated successfully',
      data: { doctor }
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Delete doctor profile (admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { Doctor } = require('../models');
    const { id } = req.params;
    
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        message: 'Doctor not found'
      });
    }
    
    await doctor.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Doctor profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get doctor's patients
router.get('/:id/patients', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { Doctor, Patient, User, PatientDoctor } = require('../models');
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        message: 'Doctor not found'
      });
    }
    
    // Check if user can access this doctor's patients
    if (req.user.role === 'doctor' && doctor.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const offset = (page - 1) * limit;
    const whereClause = { doctorId: id };
    
    if (status) {
      whereClause.status = status;
    }
    
    const { count, rows: relationships } = await PatientDoctor.findAndCountAll({
      where: whereClause,
      include: [{
        model: Patient,
        as: 'patient',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }]
      }],
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
    console.error('Get doctor patients error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
