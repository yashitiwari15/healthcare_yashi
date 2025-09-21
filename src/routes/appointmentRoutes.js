const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const appointmentValidation = [
  body('patientId')
    .isUUID()
    .withMessage('Valid patient ID is required'),
  body('doctorId')
    .isUUID()
    .withMessage('Valid doctor ID is required'),
  body('appointmentDate')
    .isISO8601()
    .withMessage('Valid appointment date is required'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duration must be between 15 and 240 minutes'),
  body('type')
    .optional()
    .isIn(['consultation', 'follow_up', 'emergency', 'routine_checkup', 'specialist_referral'])
    .withMessage('Invalid appointment type'),
  body('reason')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Reason must be less than 1000 characters'),
  body('symptoms')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Symptoms must be less than 2000 characters')
];

// Get all appointments
router.get('/', async (req, res) => {
  try {
    const { Appointment, Patient, Doctor, User } = require('../models');
    const { Op } = require('sequelize');
    const { 
      page = 1, 
      limit = 10, 
      patientId, 
      doctorId, 
      status, 
      type,
      dateFrom,
      dateTo,
      upcoming
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (patientId) whereClause.patientId = patientId;
    if (doctorId) whereClause.doctorId = doctorId;
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    
    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.appointmentDate = {};
      if (dateFrom) whereClause.appointmentDate[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.appointmentDate[Op.lte] = new Date(dateTo);
    }
    
    // Upcoming appointments filter
    if (upcoming === 'true') {
      whereClause.appointmentDate = { [Op.gte]: new Date() };
      whereClause.status = { [Op.in]: ['scheduled', 'confirmed'] };
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
    
    const { count, rows: appointments } = await Appointment.findAndCountAll({
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
      order: [['appointmentDate', 'ASC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        appointments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const { Appointment, Patient, Doctor, User } = require('../models');
    const { id } = req.params;
    
    const appointment = await Appointment.findByPk(id, {
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
    
    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const { Patient } = require('../models');
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== appointment.patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    if (req.user.role === 'doctor') {
      const { Doctor } = require('../models');
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== appointment.doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: { appointment }
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Create new appointment
router.post('/', appointmentValidation, async (req, res) => {
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
    
    const { Appointment, Patient, Doctor } = require('../models');
    const { Op } = require('sequelize');
    const { 
      patientId, 
      doctorId, 
      appointmentDate, 
      duration = 30, 
      type = 'consultation',
      reason,
      symptoms 
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
    
    // Check if doctor is available at the requested time
    const appointmentStart = new Date(appointmentDate);
    const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60000);
    
    const conflictingAppointment = await Appointment.findOne({
      where: {
        doctorId,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
        [Op.or]: [
          {
            appointmentDate: {
              [Op.between]: [appointmentStart, appointmentEnd]
            }
          },
          {
            [Op.and]: [
              { appointmentDate: { [Op.lte]: appointmentStart } },
              {
                appointmentDate: {
                  [Op.gte]: new Date(appointmentStart.getTime() - duration * 60000)
                }
              }
            ]
          }
        ]
      }
    });
    
    if (conflictingAppointment) {
      return res.status(409).json({
        status: 'error',
        message: 'Doctor is not available at the requested time'
      });
    }
    
    // Check if appointment is in the future
    if (appointmentStart <= new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Appointment must be scheduled for a future date'
      });
    }
    
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate: appointmentStart,
      duration,
      type,
      reason,
      symptoms,
      status: 'scheduled'
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Appointment scheduled successfully',
      data: { appointment }
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Update appointment
router.put('/:id', appointmentValidation, async (req, res) => {
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
    
    const { Appointment } = require('../models');
    const { id } = req.params;
    
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const { Patient } = require('../models');
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== appointment.patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    if (req.user.role === 'doctor') {
      const { Doctor } = require('../models');
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== appointment.doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    // Only allow certain fields to be updated based on role
    const allowedFields = ['notes', 'diagnosis', 'prescription', 'followUpRequired', 'followUpDate'];
    if (req.user.role === 'doctor') {
      allowedFields.push('status', 'cost', 'paymentStatus');
    }
    
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });
    
    await appointment.update(updateData);
    
    res.status(200).json({
      status: 'success',
      message: 'Appointment updated successfully',
      data: { appointment }
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Cancel appointment
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { Appointment } = require('../models');
    const { id } = req.params;
    const { cancellationReason } = req.body;
    
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }
    
    // Check if appointment can be cancelled
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        status: 'error',
        message: 'Appointment cannot be cancelled at this time'
      });
    }
    
    // Check access permissions
    if (req.user.role === 'patient') {
      const { Patient } = require('../models');
      const userPatient = await Patient.findOne({ where: { userId: req.user.id } });
      if (!userPatient || userPatient.id !== appointment.patientId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    if (req.user.role === 'doctor') {
      const { Doctor } = require('../models');
      const userDoctor = await Doctor.findOne({ where: { userId: req.user.id } });
      if (!userDoctor || userDoctor.id !== appointment.doctorId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }
    
    await appointment.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: req.user.id,
      cancellationReason
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Appointment cancelled successfully',
      data: { appointment }
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Confirm appointment
router.patch('/:id/confirm', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { Appointment } = require('../models');
    const { id } = req.params;
    
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found'
      });
    }
    
    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        status: 'error',
        message: 'Only scheduled appointments can be confirmed'
      });
    }
    
    await appointment.update({ status: 'confirmed' });
    
    res.status(200).json({
      status: 'success',
      message: 'Appointment confirmed successfully',
      data: { appointment }
    });
  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get doctor's availability
router.get('/doctor/:doctorId/availability', async (req, res) => {
  try {
    const { Appointment, Doctor } = require('../models');
    const { Op } = require('sequelize');
    const { doctorId } = req.params;
    const { date } = req.query;
    
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        message: 'Doctor not found'
      });
    }
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    const appointments = await Appointment.findAll({
      where: {
        doctorId,
        appointmentDate: {
          [Op.between]: [startOfDay, endOfDay]
        },
        status: { [Op.in]: ['scheduled', 'confirmed'] }
      },
      order: [['appointmentDate', 'ASC']]
    });
    
    // Generate available time slots
    const availableSlots = [];
    const consultationDuration = doctor.consultationDuration || 30;
    const startHour = doctor.availableHours?.start || '09:00';
    const endHour = doctor.availableHours?.end || '17:00';
    
    const [startHourNum, startMinNum] = startHour.split(':').map(Number);
    const [endHourNum, endMinNum] = endHour.split(':').map(Number);
    
    const startTime = new Date(startOfDay);
    startTime.setHours(startHourNum, startMinNum, 0, 0);
    
    const endTime = new Date(startOfDay);
    endTime.setHours(endHourNum, endMinNum, 0, 0);
    
    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + consultationDuration * 60000);
      
      // Check if this slot conflicts with existing appointments
      const hasConflict = appointments.some(appointment => {
        const appointmentStart = new Date(appointment.appointmentDate);
        const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration * 60000);
        
        return (currentTime < appointmentEnd && slotEnd > appointmentStart);
      });
      
      if (!hasConflict) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd),
          duration: consultationDuration
        });
      }
      
      currentTime = new Date(currentTime.getTime() + consultationDuration * 60000);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        doctor: {
          id: doctor.id,
          consultationDuration: doctor.consultationDuration,
          availableHours: doctor.availableHours
        },
        date: targetDate,
        availableSlots,
        existingAppointments: appointments
      }
    });
  } catch (error) {
    console.error('Get doctor availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
