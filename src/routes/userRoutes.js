const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const { User } = require('../models');
    const { page = 1, limit = 10, role, search } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password', 'emailVerificationToken', 'passwordResetToken'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get user by ID (admin only or own profile)
router.get('/:id', async (req, res) => {
  try {
    const { User } = require('../models');
    const { id } = req.params;
    
    // Check if user can access this profile
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'emailVerificationToken', 'passwordResetToken'] }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Update user (admin only or own profile)
router.put('/:id', async (req, res) => {
  try {
    const { User } = require('../models');
    const { id } = req.params;
    const { firstName, lastName, phone, role, isActive } = req.body;
    
    // Check if user can update this profile
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Only admin can change role and isActive
    const updateData = {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phone: phone || user.phone
    };
    
    if (req.user.role === 'admin') {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }
    
    await user.update(updateData);
    
    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { User } = require('../models');
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    await user.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
