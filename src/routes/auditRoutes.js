const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin access
router.use(authenticateToken);
router.use(authorize('admin'));

// Get audit logs
router.get('/', async (req, res) => {
  try {
    const { AuditLog, User } = require('../models');
    const { Op } = require('sequelize');
    const { 
      page = 1, 
      limit = 50, 
      userId, 
      action, 
      resource, 
      category, 
      severity,
      isSuccessful,
      dateFrom,
      dateTo,
      search
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = action;
    if (resource) whereClause.resource = resource;
    if (category) whereClause.category = category;
    if (severity) whereClause.severity = severity;
    if (isSuccessful !== undefined) whereClause.isSuccessful = isSuccessful === 'true';
    
    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
    }
    
    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { action: { [Op.iLike]: `%${search}%` } },
        { resource: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get security events
router.get('/security', async (req, res) => {
  try {
    const { AuditLog } = require('../models');
    const { 
      page = 1, 
      limit = 50, 
      severity, 
      category, 
      dateFrom, 
      dateTo,
      userId 
    } = req.query;
    
    const { count, rows: logs } = await AuditLog.getSecurityEvents({
      page: parseInt(page),
      limit: parseInt(limit),
      severity,
      category,
      dateFrom,
      dateTo,
      userId
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get failed login attempts
router.get('/failed-logins', async (req, res) => {
  try {
    const { AuditLog } = require('../models');
    const { 
      page = 1, 
      limit = 50, 
      dateFrom, 
      dateTo,
      ipAddress 
    } = req.query;
    
    const { count, rows: logs } = await AuditLog.getFailedLogins({
      page: parseInt(page),
      limit: parseInt(limit),
      dateFrom,
      dateTo,
      ipAddress
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get failed logins error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get audit log by ID
router.get('/:id', async (req, res) => {
  try {
    const { AuditLog, User } = require('../models');
    const { id } = req.params;
    
    const log = await AuditLog.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
    
    if (!log) {
      return res.status(404).json({
        status: 'error',
        message: 'Audit log not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { log }
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get audit statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { AuditLog } = require('../models');
    const { Op } = require('sequelize');
    const { days = 30 } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    // Get basic statistics
    const totalLogs = await AuditLog.count({
      where: {
        createdAt: { [Op.gte]: daysAgo }
      }
    });
    
    const successfulLogs = await AuditLog.count({
      where: {
        createdAt: { [Op.gte]: daysAgo },
        isSuccessful: true
      }
    });
    
    const failedLogs = await AuditLog.count({
      where: {
        createdAt: { [Op.gte]: daysAgo },
        isSuccessful: false
      }
    });
    
    // Get category breakdown
    const categoryStats = await AuditLog.findAll({
      attributes: [
        'category',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: daysAgo }
      },
      group: ['category'],
      raw: true
    });
    
    // Get severity breakdown
    const severityStats = await AuditLog.findAll({
      attributes: [
        'severity',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: daysAgo }
      },
      group: ['severity'],
      raw: true
    });
    
    // Get top actions
    const topActions = await AuditLog.findAll({
      attributes: [
        'action',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: daysAgo }
      },
      group: ['action'],
      order: [[AuditLog.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });
    
    // Get top resources
    const topResources = await AuditLog.findAll({
      attributes: [
        'resource',
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: daysAgo }
      },
      group: ['resource'],
      order: [[AuditLog.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });
    
    // Get daily activity
    const dailyActivity = await AuditLog.findAll({
      attributes: [
        [AuditLog.sequelize.fn('DATE', AuditLog.sequelize.col('createdAt')), 'date'],
        [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: daysAgo }
      },
      group: [AuditLog.sequelize.fn('DATE', AuditLog.sequelize.col('createdAt'))],
      order: [[AuditLog.sequelize.fn('DATE', AuditLog.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalLogs,
          successfulLogs,
          failedLogs,
          successRate: totalLogs > 0 ? ((successfulLogs / totalLogs) * 100).toFixed(2) : 0
        },
        categoryBreakdown: categoryStats,
        severityBreakdown: severityStats,
        topActions,
        topResources,
        dailyActivity,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get user activity
router.get('/user/:userId/activity', async (req, res) => {
  try {
    const { AuditLog, User } = require('../models');
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      days = 30 
    } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    const offset = (page - 1) * limit;
    
    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where: {
        userId,
        createdAt: { [require('sequelize').Op.gte]: daysAgo }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Export audit logs (CSV format)
router.get('/export/csv', async (req, res) => {
  try {
    const { AuditLog, User } = require('../models');
    const { Op } = require('sequelize');
    const { 
      dateFrom, 
      dateTo,
      category,
      severity 
    } = req.query;
    
    const whereClause = {};
    
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
    }
    
    if (category) whereClause.category = category;
    if (severity) whereClause.severity = severity;
    
    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email', 'role']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10000 // Limit for performance
    });
    
    // Generate CSV
    const csvHeader = 'Date,Time,User,Action,Resource,Category,Severity,IP Address,Status,Description\n';
    const csvRows = logs.map(log => {
      const date = new Date(log.createdAt);
      const userInfo = log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'Anonymous';
      
      return [
        date.toISOString().split('T')[0],
        date.toTimeString().split(' ')[0],
        `"${userInfo}"`,
        `"${log.action}"`,
        `"${log.resource}"`,
        `"${log.category}"`,
        `"${log.severity}"`,
        `"${log.ipAddress || 'N/A'}"`,
        log.isSuccessful ? 'Success' : 'Failed',
        `"${log.description || ''}"`
      ].join(',');
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
