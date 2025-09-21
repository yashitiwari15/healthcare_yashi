const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// All patient routes require authentication
router.use(authenticateToken);

// Validation rules
const patientValidation = [
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood type'),
  body('height')
    .optional()
    .isFloat({ min: 50, max: 250 })
    .withMessage('Height must be between 50 and 250 cm'),
  body('weight')
    .optional()
    .isFloat({ min: 10, max: 300 })
    .withMessage('Weight must be between 10 and 300 kg'),
  body('emergencyContactPhone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid emergency contact phone number')
];

// Get all patients (admin, doctors, and patients can see their own)
router.get('/', async (req, res) => {
  try {
    const { Patient, User } = require('../models');
    const { Op } = require('sequelize');
    const { page = 1, limit = 10, search, gender, bloodType } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    // Role-based filtering
    if (req.user.role === 'patient') {
      // Patients can only see their own profile
      whereClause.userId = req.user.id;
    }
    // Admins and doctors can see all patients
    
    if (gender) {
      whereClause.gender = gender;
    }
    
    if (bloodType) {
      whereClause.bloodType = bloodType;
    }
    
    const { count, rows: patients } = await Patient.findAndCountAll({
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
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        patients,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const { Patient, User } = require('../models');
    const { id } = req.params;
    
    const patient = await Patient.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }]
    });
    
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    // Check if user can access this patient data
    if (req.user.role === 'patient' && patient.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { patient }
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Create patient profile
router.post('/', patientValidation, async (req, res) => {
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
    
    const { Patient } = require('../models');
    
    // Check if patient profile already exists for this user
    if (req.user.role === 'patient') {
      const existingPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (existingPatient) {
        return res.status(409).json({
          status: 'error',
          message: 'Patient profile already exists for this user'
        });
      }
    }
    
    const patientData = {
      ...req.body,
      userId: req.user.role === 'patient' ? req.user.id : req.body.userId
    };
    
    const patient = await Patient.create(patientData);
    
    res.status(201).json({
      status: 'success',
      message: 'Patient profile created successfully',
      data: { patient }
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Update patient profile
router.put('/:id', patientValidation, async (req, res) => {
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
    
    const { Patient } = require('../models');
    const { id } = req.params;
    
    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    // Check if user can update this patient data
    if (req.user.role === 'patient' && patient.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    await patient.update(req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Patient profile updated successfully',
      data: { patient }
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Delete patient profile (admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { Patient } = require('../models');
    const { id } = req.params;
    
    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    await patient.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Patient profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
