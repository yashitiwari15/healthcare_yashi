const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Doctor = sequelize.define('Doctor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yearsOfExperience: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 50
    }
  },
  education: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  certifications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hospitalAffiliation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clinicAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  consultationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  availableDays: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  availableHours: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      start: '09:00',
      end: '17:00'
    }
  },
  languages: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['English']
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  totalReviews: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  maxPatientsPerDay: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 20,
    validate: {
      min: 1,
      max: 100
    }
  },
  consultationDuration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true,
    defaultValue: 30,
    validate: {
      min: 15,
      max: 120
    }
  }
}, {
  tableName: 'doctors',
  timestamps: true
});

// Instance method to check if doctor is available on a specific day
Doctor.prototype.isAvailableOnDay = function(day) {
  if (!this.availableDays) return false;
  return this.availableDays.includes(day.toLowerCase());
};

// Instance method to check if doctor is available at a specific time
Doctor.prototype.isAvailableAtTime = function(time) {
  if (!this.availableHours) return false;
  const timeStr = time.toString();
  return timeStr >= this.availableHours.start && timeStr <= this.availableHours.end;
};

module.exports = Doctor;
