const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  method: {
    type: DataTypes.ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
    allowNull: true
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requestData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  responseData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // in milliseconds
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low'
  },
  category: {
    type: DataTypes.ENUM('authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security', 'error'),
    allowNull: false,
    defaultValue: 'system'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isSuccessful: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['action', 'created_at']
    },
    {
      fields: ['resource', 'resource_id']
    },
    {
      fields: ['category', 'created_at']
    },
    {
      fields: ['severity', 'created_at']
    },
    {
      fields: ['ip_address', 'created_at']
    },
    {
      fields: ['is_successful', 'created_at']
    }
  ]
});

// Instance method to check if log is recent (within 1 hour)
AuditLog.prototype.isRecent = function() {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  return this.createdAt > oneHourAgo;
};

// Instance method to get formatted duration
AuditLog.prototype.getFormattedDuration = function() {
  if (!this.duration) return 'N/A';
  
  if (this.duration < 1000) {
    return `${this.duration}ms`;
  } else if (this.duration < 60000) {
    return `${(this.duration / 1000).toFixed(2)}s`;
  } else {
    return `${(this.duration / 60000).toFixed(2)}m`;
  }
};

// Instance method to get user info
AuditLog.prototype.getUserInfo = function() {
  if (!this.user) return null;
  
  return {
    id: this.user.id,
    name: `${this.user.firstName} ${this.user.lastName}`,
    email: this.user.email,
    role: this.user.role
  };
};

// Static method to log an action
AuditLog.logAction = async (data) => {
  try {
    const log = await AuditLog.create({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      method: data.method,
      endpoint: data.endpoint,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestData: data.requestData,
      responseData: data.responseData,
      statusCode: data.statusCode,
      duration: data.duration,
      severity: data.severity || 'low',
      category: data.category || 'system',
      description: data.description,
      metadata: data.metadata,
      sessionId: data.sessionId,
      isSuccessful: data.isSuccessful !== false,
      errorMessage: data.errorMessage
    });
    
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
};

// Static method to get security events
AuditLog.getSecurityEvents = async (options = {}) => {
  const { Op } = require('sequelize');
  const { 
    page = 1, 
    limit = 50, 
    severity, 
    category, 
    dateFrom, 
    dateTo,
    userId 
  } = options;
  
  const offset = (page - 1) * limit;
  const whereClause = {
    category: { [Op.in]: ['authentication', 'authorization', 'security'] }
  };
  
  if (severity) whereClause.severity = severity;
  if (category) whereClause.category = category;
  if (userId) whereClause.userId = userId;
  
  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
  }
  
  return await AuditLog.findAndCountAll({
    where: whereClause,
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'firstName', 'lastName', 'email', 'role']
    }],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });
};

// Static method to get failed login attempts
AuditLog.getFailedLogins = async (options = {}) => {
  const { Op } = require('sequelize');
  const { 
    page = 1, 
    limit = 50, 
    dateFrom, 
    dateTo,
    ipAddress 
  } = options;
  
  const offset = (page - 1) * limit;
  const whereClause = {
    action: 'login_attempt',
    isSuccessful: false,
    category: 'authentication'
  };
  
  if (ipAddress) whereClause.ipAddress = ipAddress;
  
  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
  }
  
  return await AuditLog.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });
};

module.exports = AuditLog;
