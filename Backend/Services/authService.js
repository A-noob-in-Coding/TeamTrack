import bcrypt from 'bcrypt';
import pool from '../Config/db.js';
import Joi from 'joi';

const authService = {
  // Register a new user
  async registerUser(userData) {
    const { email, password, firstName, lastName, bio = '' } = userData;

    try {
      // Check if user already exists
      const existingUser = await this.checkEmailExists(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Insert user into database
      const query = `
        INSERT INTO "User" (Password, Email, FirstName, LastName, Bio)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING UserID, Email, FirstName, LastName, Bio
      `;

      const result = await pool.query(query, [hashedPassword, email, firstName, lastName, bio]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  },

  // Authenticate user login
  async authenticateUser(email, password) {
    try {
      const query = `
        SELECT UserID, Password, Email, FirstName, LastName, Bio
        FROM "User"
        WHERE Email = $1
      `;

      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];
      const isValidPassword = await this.comparePassword(password, user.password);

      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  },

  // Hash password using bcrypt
  async hashPassword(password) {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  },

  // Compare password with hash
  async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  },

  // Check if email already exists
  async checkEmailExists(email) {
    try {
      const query = 'SELECT UserID FROM "User" WHERE Email = $1';
      const result = await pool.query(query, [email]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error('Email check failed');
    }
  },

  // Find user by ID (for session management)
  // In your authService.js - fix the field mapping
  async findUserById(userId) {
    try {
      const query = `
      SELECT 
        UserID as userid, 
        Email as email, 
        FirstName as firstname, 
        LastName as lastname, 
        Bio as bio
      FROM "User"
      WHERE UserID = $1
    `;

      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error('User lookup failed');
    }
  },

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      const { firstName, lastName, bio, email } = updateData;

      // Check if email is being changed and if it already exists
      if (email) {
        const existingUser = await pool.query(
          'SELECT UserID FROM "User" WHERE Email = $1 AND UserID != $2',
          [email, userId]
        );

        if (existingUser.rows.length > 0) {
          throw new Error('Email already in use by another user');
        }
      }

      const query = `
        UPDATE "User"
        SET 
          FirstName = COALESCE($1, FirstName),
          LastName = COALESCE($2, LastName),
          Bio = COALESCE($3, Bio),
          Email = COALESCE($4, Email)
        WHERE UserID = $5
        RETURNING UserID, Email, FirstName, LastName, Bio
      `;

      const result = await pool.query(query, [firstName, lastName, bio, email, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  },

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const query = 'SELECT Password FROM "User" WHERE UserID = $1';
      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.comparePassword(currentPassword, result.rows[0].password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      const updateQuery = 'UPDATE "User" SET Password = $1 WHERE UserID = $2';
      await pool.query(updateQuery, [hashedNewPassword, userId]);

      return { message: 'Password updated successfully' };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  },

  // Validate registration data
  validateRegisterData(data) {
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
      password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
      firstName: Joi.string().min(2).max(50).required().messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
      }),
      lastName: Joi.string().min(2).max(50).required().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
      }),
      bio: Joi.string().max(500).optional().allow('').messages({
        'string.max': 'Bio cannot exceed 500 characters'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  // Validate login data
  validateLoginData(data) {
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
      password: Joi.string().required().messages({
        'any.required': 'Password is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  // Validate profile update data
  validateProfileUpdateData(data) {
    const schema = Joi.object({
      email: Joi.string().email().optional().messages({
        'string.email': 'Please provide a valid email address'
      }),
      firstName: Joi.string().min(2).max(50).optional().messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters'
      }),
      lastName: Joi.string().min(2).max(50).optional().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters'
      }),
      bio: Joi.string().max(500).optional().allow('').messages({
        'string.max': 'Bio cannot exceed 500 characters'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  // Validate password change data
  validatePasswordChangeData(data) {
    const schema = Joi.object({
      currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
      }),
      newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required().messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required'
      }),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Password confirmation does not match',
        'any.required': 'Password confirmation is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  // Sanitize user data for response
  sanitizeUserData(user) {
    if (!user) return null;

    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  },
  async hardDeleteUserAccount(userId, password) {
    try {
      // First verify the user exists and password is correct
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password before deletion
      await this.authenticateUser(user.email, password);

      await pool.query('BEGIN');

      // Delete the user record
      const deleteQuery = 'DELETE FROM "User" WHERE UserID = $1';
      const result = await pool.query(deleteQuery, [userId]);

      if (result.rowCount === 0) {
        throw new Error('User not found or already deleted');
      }

      await pool.query('COMMIT');

      return {
        success: true,
        message: 'Account has been permanently deleted'
      };

    } catch (error) {
      await pool.query('ROLLBACK');
      throw new Error(`Account deletion failed: ${error.message}`);
    }
  }
};

export default authService;
