const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, uploadFields, handleUploadError, getFileInfo, deleteFile } = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Upload single medical document
router.post('/medical-document', authorize('doctor', 'admin'), uploadSingle('medicalDocument'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }
    
    const fileInfo = getFileInfo(req.file);
    
    res.status(200).json({
      status: 'success',
      message: 'Medical document uploaded successfully',
      data: { file: fileInfo }
    });
  } catch (error) {
    console.error('Upload medical document error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Upload multiple medical documents
router.post('/medical-documents', authorize('doctor', 'admin'), uploadMultiple('medicalDocuments', 10), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }
    
    const files = req.files.map(file => getFileInfo(file));
    
    res.status(200).json({
      status: 'success',
      message: `${files.length} medical documents uploaded successfully`,
      data: { files }
    });
  } catch (error) {
    console.error('Upload medical documents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Upload lab results
router.post('/lab-results', authorize('doctor', 'admin'), uploadMultiple('labResults', 5), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No lab result files uploaded'
      });
    }
    
    const files = req.files.map(file => getFileInfo(file));
    
    res.status(200).json({
      status: 'success',
      message: `${files.length} lab results uploaded successfully`,
      data: { files }
    });
  } catch (error) {
    console.error('Upload lab results error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Upload imaging files
router.post('/imaging', authorize('doctor', 'admin'), uploadMultiple('imaging', 10), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No imaging files uploaded'
      });
    }
    
    const files = req.files.map(file => getFileInfo(file));
    
    res.status(200).json({
      status: 'success',
      message: `${files.length} imaging files uploaded successfully`,
      data: { files }
    });
  } catch (error) {
    console.error('Upload imaging error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Upload prescription
router.post('/prescription', authorize('doctor', 'admin'), uploadSingle('prescription'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No prescription file uploaded'
      });
    }
    
    const fileInfo = getFileInfo(req.file);
    
    res.status(200).json({
      status: 'success',
      message: 'Prescription uploaded successfully',
      data: { file: fileInfo }
    });
  } catch (error) {
    console.error('Upload prescription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Upload profile image
router.post('/profile-image', uploadSingle('profileImage'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No profile image uploaded'
      });
    }
    
    const fileInfo = getFileInfo(req.file);
    
    // Update user's profile image in database
    const { User } = require('../models');
    await req.user.update({ profileImage: fileInfo.url });
    
    res.status(200).json({
      status: 'success',
      message: 'Profile image uploaded successfully',
      data: { 
        file: fileInfo,
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Upload mixed files for medical record
router.post('/medical-record/:recordId', authorize('doctor', 'admin'), uploadFields([
  { name: 'medicalDocument', maxCount: 5 },
  { name: 'labResult', maxCount: 5 },
  { name: 'imaging', maxCount: 10 },
  { name: 'prescription', maxCount: 3 }
]), handleUploadError, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { MedicalRecord } = require('../models');
    
    // Verify medical record exists and user has access
    const record = await MedicalRecord.findByPk(recordId);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Medical record not found'
      });
    }
    
    if (req.user.role === 'doctor' && record.createdBy !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    // Process uploaded files
    const uploadedFiles = [];
    const attachments = record.attachments || [];
    
    Object.keys(req.files).forEach(fieldName => {
      req.files[fieldName].forEach(file => {
        const fileInfo = getFileInfo(file);
        fileInfo.fieldName = fieldName;
        uploadedFiles.push(fileInfo);
        attachments.push({
          name: fileInfo.originalName,
          url: fileInfo.url,
          type: fileInfo.mimetype,
          size: fileInfo.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user.id
        });
      });
    });
    
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }
    
    // Update medical record with new attachments
    await record.update({ 
      attachments,
      lastModifiedBy: req.user.id
    });
    
    res.status(200).json({
      status: 'success',
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: { 
        files: uploadedFiles,
        record: record.toJSON()
      }
    });
  } catch (error) {
    console.error('Upload medical record files error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Delete file
router.delete('/:filename', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { filename } = req.params;
    const { MedicalRecord } = require('../models');
    
    // Find all medical records that reference this file
    const records = await MedicalRecord.findAll({
      where: {
        attachments: {
          [require('sequelize').Op.contains]: [{ url: { [require('sequelize').Op.like]: `%${filename}%` } }]
        }
      }
    });
    
    // Remove file reference from medical records
    for (const record of records) {
      const attachments = record.attachments || [];
      const updatedAttachments = attachments.filter(attachment => 
        !attachment.url.includes(filename)
      );
      
      if (req.user.role === 'doctor' && record.createdBy !== req.user.id) {
        continue; // Skip records not created by this doctor
      }
      
      await record.update({ 
        attachments: updatedAttachments,
        lastModifiedBy: req.user.id
      });
    }
    
    // Delete physical file
    const filePath = path.join(__dirname, '../../uploads', filename);
    const deleted = deleteFile(filePath);
    
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get file info
router.get('/info/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    const fs = require('fs');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }
    
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename);
    
    res.status(200).json({
      status: 'success',
      data: {
        filename,
        size: stats.size,
        extension: ext,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${filename}`
      }
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// List uploaded files
router.get('/list', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    let searchDir = uploadsDir;
    if (type) {
      searchDir = path.join(uploadsDir, type);
    }
    
    if (!fs.existsSync(searchDir)) {
      return res.status(200).json({
        status: 'success',
        data: { files: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } }
      });
    }
    
    const files = fs.readdirSync(searchDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => {
        const filePath = path.join(searchDir, dirent.name);
        const stats = fs.statSync(filePath);
        return {
          name: dirent.name,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${type ? `${type}/` : ''}${dirent.name}`
        };
      })
      .sort((a, b) => b.modified - a.modified);
    
    const offset = (page - 1) * limit;
    const paginatedFiles = files.slice(offset, offset + parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: {
        files: paginatedFiles,
        pagination: {
          total: files.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(files.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
