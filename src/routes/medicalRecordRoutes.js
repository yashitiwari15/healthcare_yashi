const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const medicalRecordValidation = [
  body('patientId')
    .isUUID()
    .withMessage('Valid patient ID is required'),
  body('doctorId')
    .isUUID()
    .withMessage('Valid doctor ID is required'),
  body('recordType')
    .isIn(['consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'prescription', 'vaccination', 'surgery', 'emergency', 'follow_up'])
    .withMessage('Invalid record type'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent')
];

// Get all medical records
router.get('/', async (req, res) => {
  try {
    const { MedicalRecord, Patient, Doctor, User } = require('../models');
    const { Op } = require('sequelize');
    const { 
      page = 1, 
      limit = 10, 
      patientId, 
      doctorId, 
      recordType, 
      status = 'active',
      priority,
      dateFrom,
      dateTo,
      search
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { status };
    
    if (patientId) whereClause.patientId = patientId;
    if (doctorId) whereClause.doctorId = doctorId;
    if (recordType) whereClause.recordType = recordType;
    if (priority) whereClause.priority = priority;
    
    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
    }
    
    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { diagnosis: { [Op.iLike]: `%${search}%` } },
        { treatment: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Role-based filtering
    if (req.user.role === 'patient') {
      const { Patient } = require('../models');
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (userPatient) {
        whereClause.patientId = userPatient.id;
      }
    } else if (req.user.role === 'doctor') {
      const { Doctor } = require('../models');
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (userDoctor) {
        whereClause.doctorId = userDoctor.id;
      }
    }
    
    const { count, rows: records } = await MedicalRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
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
        records,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get medical record by ID
router.get('/:id', async (req, res) => {
  try {
    const { MedicalRecord, Patient, Doctor, User } = require('../models');
    const { id } = req.params;
    
    const record = await MedicalRecord.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }
      ]
    });
    
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Medical record not found'
      });
    }
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const { Patient } = require('../models');
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== record.patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    if (req.user.role === 'doctor') {
      const { Doctor } = require('../models');
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== record.doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: { record }
    });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Create new medical record
router.post('/', medicalRecordValidation, async (req, res) => {
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
    
    const { MedicalRecord, Patient, Doctor } = require('../models');
    const { 
      patientId, 
      doctorId, 
      appointmentId,
      recordType, 
      title, 
      description,
      symptoms,
      diagnosis,
      treatment,
      prescription,
      vitalSigns,
      labResults,
      imagingResults,
      followUpRequired,
      followUpDate,
      followUpNotes,
      priority,
      isConfidential,
      tags
    } = req.body;
    
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
    
    // Only doctors and admins can create medical records
    if (req.user.role === 'patient') {
      return res.status(403).json({
        status: 'error',
        message: 'Patients cannot create medical records'
      });
    }
    
    const record = await MedicalRecord.create({
      patientId,
      doctorId,
      appointmentId,
      recordType,
      title,
      description,
      symptoms,
      diagnosis,
      treatment,
      prescription,
      vitalSigns,
      labResults,
      imagingResults,
      followUpRequired,
      followUpDate,
      followUpNotes,
      priority: priority || 'medium',
      isConfidential: isConfidential || false,
      tags: tags || [],
      createdBy: req.user.id
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Medical record created successfully',
      data: { record }
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Update medical record
router.put('/:id', medicalRecordValidation, async (req, res) => {
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
    
    const { MedicalRecord } = require('../models');
    const { id } = req.params;
    
    const record = await MedicalRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Medical record not found'
      });
    }
    
    // Check access permissions - only the creating doctor or admin can update
    if (req.user.role === 'patient') {
      return res.status(403).json({
        status: 'error',
        message: 'Patients cannot update medical records'
      });
    }
    
    if (req.user.role === 'doctor' && record.createdBy !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the creating doctor can update this record'
      });
    }
    
    // Only allow certain fields to be updated
    const allowedFields = [
      'title', 'description', 'symptoms', 'diagnosis', 'treatment', 
      'prescription', 'vitalSigns', 'labResults', 'imagingResults',
      'followUpRequired', 'followUpDate', 'followUpNotes', 'priority',
      'isConfidential', 'tags', 'attachments'
    ];
    
    const updateData = { lastModifiedBy: req.user.id };
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });
    
    await record.update(updateData);
    
    res.status(200).json({
      status: 'success',
      message: 'Medical record updated successfully',
      data: { record }
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Archive medical record
router.patch('/:id/archive', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { MedicalRecord } = require('../models');
    const { id } = req.params;
    
    const record = await MedicalRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Medical record not found'
      });
    }
    
    // Check if user can archive this record
    if (req.user.role === 'doctor' && record.createdBy !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the creating doctor can archive this record'
      });
    }
    
    await record.update({ 
      status: 'archived',
      lastModifiedBy: req.user.id
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Medical record archived successfully',
      data: { record }
    });
  } catch (error) {
    console.error('Archive medical record error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get patient's medical history summary
router.get('/patient/:patientId/summary', async (req, res) => {
  try {
    const { MedicalRecord, Patient } = require('../models');
    const { patientId } = req.params;
    const { months = 12 } = req.query;
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const { Patient } = require('../models');
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }
    
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));
    
    const records = await MedicalRecord.findAll({
      where: {
        patientId,
        status: 'active',
        createdAt: {
          [require('sequelize').Op.gte]: monthsAgo
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    // Generate summary statistics
    const summary = {
      totalRecords: records.length,
      recordTypes: {},
      recentDiagnoses: [],
      followUpRequired: records.filter(r => r.followUpRequired && !r.isFollowUpOverdue()).length,
      overdueFollowUps: records.filter(r => r.isFollowUpOverdue()).length,
      priorityBreakdown: {
        urgent: records.filter(r => r.priority === 'urgent').length,
        high: records.filter(r => r.priority === 'high').length,
        medium: records.filter(r => r.priority === 'medium').length,
        low: records.filter(r => r.priority === 'low').length
      }
    };
    
    // Count record types
    records.forEach(record => {
      summary.recordTypes[record.recordType] = (summary.recordTypes[record.recordType] || 0) + 1;
    });
    
    // Get recent diagnoses
    const diagnosisRecords = records
      .filter(r => r.diagnosis)
      .slice(0, 10)
      .map(r => ({
        date: r.createdAt,
        diagnosis: r.diagnosis,
        doctor: r.doctor?.user?.firstName + ' ' + r.doctor?.user?.lastName
      }));
    
    summary.recentDiagnoses = diagnosisRecords;
    
    res.status(200).json({
      status: 'success',
      data: {
        patient: {
          id: patient.id,
          name: patient.user?.firstName + ' ' + patient.user?.lastName
        },
        summary,
        recentRecords: records.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get patient summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get records requiring follow-up
router.get('/follow-up/required', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { MedicalRecord, Patient, Doctor, User } = require('../models');
    const { page = 1, limit = 10, overdue = false } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {
      followUpRequired: true,
      status: 'active'
    };
    
    if (overdue === 'true') {
      whereClause.followUpDate = {
        [require('sequelize').Op.lt]: new Date()
      };
    } else {
      whereClause.followUpDate = {
        [require('sequelize').Op.gte]: new Date()
      };
    }
    
    // If user is doctor, only show their records
    if (req.user.role === 'doctor') {
      const { Doctor } = require('../models');
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (userDoctor) {
        whereClause.doctorId = userDoctor.id;
      }
    }
    
    const { count, rows: records } = await MedicalRecord.findAndCountAll({
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
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['followUpDate', 'ASC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        records,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get follow-up records error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
