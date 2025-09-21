const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicalRecord = sequelize.define('MedicalRecord', {
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
  appointmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'appointments',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  recordType: {
    type: DataTypes.ENUM('consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'prescription', 'vaccination', 'surgery', 'emergency', 'follow_up'),
    allowNull: false,
    defaultValue: 'consultation'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  treatment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  vitalSigns: {
    type: DataTypes.JSON,
    allowNull: true,
    // Example: { bloodPressure: "120/80", heartRate: 72, temperature: 98.6, weight: 70, height: 175 }
  },
  labResults: {
    type: DataTypes.JSON,
    allowNull: true,
    // Example: { bloodSugar: 95, cholesterol: 180, hemoglobin: 14.5 }
  },
  imagingResults: {
    type: DataTypes.JSON,
    allowNull: true,
    // Example: { xray: "normal", mri: "no abnormalities", ct: "clear" }
  },
  followUpRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  followUpNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('active', 'archived', 'deleted'),
    defaultValue: 'active'
  },
  isConfidential: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
    // Example: ["diabetes", "hypertension", "annual_checkup"]
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
    // Example: [{ name: "lab_report.pdf", url: "/uploads/lab_report.pdf", type: "pdf" }]
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lastModifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'medical_records',
  timestamps: true,
  indexes: [
    {
      fields: ['patient_id', 'created_at']
    },
    {
      fields: ['doctor_id', 'created_at']
    },
    {
      fields: ['record_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    }
  ]
});

// Instance method to check if record is recent (within 30 days)
MedicalRecord.prototype.isRecent = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.createdAt > thirtyDaysAgo;
};

// Instance method to get record age in days
MedicalRecord.prototype.getAgeInDays = function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Instance method to check if follow-up is overdue
MedicalRecord.prototype.isFollowUpOverdue = function() {
  if (!this.followUpRequired || !this.followUpDate) return false;
  return new Date() > new Date(this.followUpDate);
};

// Instance method to get formatted vital signs
MedicalRecord.prototype.getFormattedVitalSigns = function() {
  if (!this.vitalSigns) return null;
  
  const vitals = this.vitalSigns;
  return {
    bloodPressure: vitals.bloodPressure || 'N/A',
    heartRate: vitals.heartRate ? `${vitals.heartRate} bpm` : 'N/A',
    temperature: vitals.temperature ? `${vitals.temperature}°F` : 'N/A',
    weight: vitals.weight ? `${vitals.weight} kg` : 'N/A',
    height: vitals.height ? `${vitals.height} cm` : 'N/A',
    oxygenSaturation: vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : 'N/A'
  };
};

module.exports = MedicalRecord;
