const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PatientDoctor = sequelize.define('PatientDoctor', {
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
  relationshipType: {
    type: DataTypes.ENUM('primary_care', 'specialist', 'consultation', 'emergency'),
    allowNull: false,
    defaultValue: 'primary_care'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  referralReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  treatmentPlan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  nextAppointment: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'transferred', 'completed'),
    defaultValue: 'active'
  }
}, {
  tableName: 'patient_doctors',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['patient_id', 'doctor_id', 'relationship_type']
    }
  ]
});

// Instance method to check if relationship is currently active
PatientDoctor.prototype.isCurrentlyActive = function() {
  const now = new Date();
  const startDate = new Date(this.startDate);
  const endDate = this.endDate ? new Date(this.endDate) : null;
  
  return this.isActive && 
         startDate <= now && 
         (!endDate || endDate >= now);
};

// Instance method to get relationship duration in days
PatientDoctor.prototype.getDurationInDays = function() {
  const start = new Date(this.startDate);
  const end = this.endDate ? new Date(this.endDate) : new Date();
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = PatientDoctor;
