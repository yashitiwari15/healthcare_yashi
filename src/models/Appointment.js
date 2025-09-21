const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'doctors',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  appointmentDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 15,
      max: 240
    }
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  type: {
    type: DataTypes.ENUM('consultation', 'follow_up', 'emergency', 'routine_checkup', 'specialist_referral'),
    allowNull: false,
    defaultValue: 'consultation'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  followUpRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'partial', 'cancelled'),
    defaultValue: 'pending'
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'appointments',
  timestamps: true,
  indexes: [
    {
      fields: ['appointment_date']
    },
    {
      fields: ['patient_id', 'appointment_date']
    },
    {
      fields: ['doctor_id', 'appointment_date']
    },
    {
      fields: ['status']
    }
  ]
});

// Instance method to check if appointment is upcoming
Appointment.prototype.isUpcoming = function() {
  const now = new Date();
  const appointmentTime = new Date(this.appointmentDate);
  return appointmentTime > now && this.status === 'scheduled';
};

// Instance method to check if appointment is overdue
Appointment.prototype.isOverdue = function() {
  const now = new Date();
  const appointmentTime = new Date(this.appointmentDate);
  return appointmentTime < now && ['scheduled', 'confirmed'].includes(this.status);
};

// Instance method to get appointment duration in hours
Appointment.prototype.getDurationInHours = function() {
  return (this.duration / 60).toFixed(2);
};

// Instance method to check if appointment can be cancelled
Appointment.prototype.canBeCancelled = function() {
  const now = new Date();
  const appointmentTime = new Date(this.appointmentDate);
  const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);
  
  return ['scheduled', 'confirmed'].includes(this.status) && hoursUntilAppointment > 2;
};

module.exports = Appointment;
