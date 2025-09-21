const AuditLog = require('../models/AuditLog');

// Middleware to log API requests
const auditLogger = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Capture response data
    let responseData = null;
    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };
    
    // Get user info
    const userId = req.user?.id || null;
    const userRole = req.user?.role || 'anonymous';
    
    // Determine action based on method and endpoint
    const action = getActionFromRequest(req);
    const resource = getResourceFromEndpoint(req.path);
    const category = getCategoryFromRequest(req, action);
    const severity = getSeverityFromRequest(req, action);
    
    // Log the request
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        
        await AuditLog.logAction({
          userId,
          action,
          resource,
          resourceId: req.params.id || null,
          method: req.method,
          endpoint: req.path,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          requestData: sanitizeRequestData(req.body, req.query, req.params),
          responseData: sanitizeResponseData(responseData),
          statusCode: res.statusCode,
          duration,
          severity,
          category,
          description: generateDescription(req, action, res.statusCode),
          metadata: {
            userRole,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || null
          },
          sessionId: req.sessionID || null,
          isSuccessful: res.statusCode < 400,
          errorMessage: res.statusCode >= 400 ? responseData : null
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });
    
    next();
  };
};

// Helper function to determine action from request
const getActionFromRequest = (req) => {
  const method = req.method;
  const path = req.path;
  
  // Authentication actions
  if (path.includes('/auth/login')) return 'login_attempt';
  if (path.includes('/auth/logout')) return 'logout';
  if (path.includes('/auth/register')) return 'user_registration';
  if (path.includes('/auth/change-password')) return 'password_change';
  
  // CRUD actions
  if (method === 'GET') return 'read';
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  
  return 'unknown';
};

// Helper function to determine resource from endpoint
const getResourceFromEndpoint = (path) => {
  if (path.includes('/users')) return 'user';
  if (path.includes('/patients')) return 'patient';
  if (path.includes('/doctors')) return 'doctor';
  if (path.includes('/appointments')) return 'appointment';
  if (path.includes('/medical-records')) return 'medical_record';
  if (path.includes('/patient-doctors')) return 'patient_doctor_relationship';
  if (path.includes('/auth')) return 'authentication';
  if (path.includes('/upload')) return 'file_upload';
  
  return 'unknown';
};

// Helper function to determine category
const getCategoryFromRequest = (req, action) => {
  const path = req.path;
  
  if (path.includes('/auth')) return 'authentication';
  if (action === 'read' && req.user?.role === 'patient') return 'data_access';
  if (['create', 'update', 'delete'].includes(action)) return 'data_modification';
  if (path.includes('/upload')) return 'system';
  if (req.statusCode >= 400) return 'error';
  
  return 'system';
};

// Helper function to determine severity
const getSeverityFromRequest = (req, action) => {
  const path = req.path;
  const statusCode = req.statusCode;
  
  // Critical security events
  if (action === 'login_attempt' && statusCode >= 400) return 'high';
  if (path.includes('/auth/change-password')) return 'high';
  if (action === 'delete') return 'high';
  if (statusCode >= 500) return 'critical';
  if (statusCode >= 400) return 'medium';
  
  return 'low';
};

// Helper function to generate description
const generateDescription = (req, action, statusCode) => {
  const method = req.method;
  const path = req.path;
  const userRole = req.user?.role || 'anonymous';
  
  let description = `${userRole} performed ${action} on ${path}`;
  
  if (statusCode >= 400) {
    description += ` (failed with status ${statusCode})`;
  } else {
    description += ` (successful)`;
  }
  
  return description;
};

// Helper function to sanitize request data
const sanitizeRequestData = (body, query, params) => {
  const sanitized = {
    params: params || {},
    query: query || {}
  };
  
  // Remove sensitive data from body
  if (body) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    sanitized.body = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized.body[field]) {
        sanitized.body[field] = '[REDACTED]';
      }
    });
  }
  
  return sanitized;
};

// Helper function to sanitize response data
const sanitizeResponseData = (data) => {
  if (!data) return null;
  
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Only log basic response info, not full data
    return {
      status: parsed.status || 'unknown',
      message: parsed.message || null,
      dataCount: parsed.data ? (Array.isArray(parsed.data) ? parsed.data.length : 1) : 0
    };
  } catch (error) {
    return { error: 'Failed to parse response data' };
  }
};

// Specific audit logging functions
const logSecurityEvent = async (data) => {
  return await AuditLog.logAction({
    ...data,
    category: 'security',
    severity: data.severity || 'high'
  });
};

const logDataAccess = async (data) => {
  return await AuditLog.logAction({
    ...data,
    category: 'data_access',
    severity: data.severity || 'low'
  });
};

const logDataModification = async (data) => {
  return await AuditLog.logAction({
    ...data,
    category: 'data_modification',
    severity: data.severity || 'medium'
  });
};

const logAuthenticationEvent = async (data) => {
  return await AuditLog.logAction({
    ...data,
    category: 'authentication',
    severity: data.severity || 'medium'
  });
};

const logError = async (data) => {
  return await AuditLog.logAction({
    ...data,
    category: 'error',
    severity: data.severity || 'high',
    isSuccessful: false
  });
};

// Middleware for specific audit logging
const auditLoginAttempt = async (req, isSuccessful, errorMessage = null) => {
  return await logAuthenticationEvent({
    userId: req.user?.id || null,
    action: 'login_attempt',
    resource: 'authentication',
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    requestData: { email: req.body?.email },
    statusCode: isSuccessful ? 200 : 401,
    description: isSuccessful ? 'Successful login' : 'Failed login attempt',
    isSuccessful,
    errorMessage
  });
};

const auditDataAccess = async (req, resource, resourceId = null) => {
  return await logDataAccess({
    userId: req.user?.id,
    action: 'read',
    resource,
    resourceId,
    method: req.method,
    endpoint: req.path,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    description: `Accessed ${resource}${resourceId ? ` (ID: ${resourceId})` : ''}`
  });
};

const auditDataModification = async (req, resource, resourceId = null, action = 'update') => {
  return await logDataModification({
    userId: req.user?.id,
    action,
    resource,
    resourceId,
    method: req.method,
    endpoint: req.path,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    requestData: sanitizeRequestData(req.body, req.query, req.params),
    description: `${action} ${resource}${resourceId ? ` (ID: ${resourceId})` : ''}`
  });
};

module.exports = {
  auditLogger,
  logSecurityEvent,
  logDataAccess,
  logDataModification,
  logAuthenticationEvent,
  logError,
  auditLoginAttempt,
  auditDataAccess,
  auditDataModification
};
