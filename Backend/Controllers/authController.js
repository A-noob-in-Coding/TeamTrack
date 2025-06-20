
import authService from "../Services/authService.js";
const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const { error, value } = authService.validateRegisterData(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: 'Validation failed', details: error.details });
      }

      const newUser = await authService.registerUser(value);

      req.login(newUser, (err) => {
        if (err) {
          console.error('Auto-login after registration failed:', err);
          return res.status(201).json({
            success: true,
            message: 'Registration successful. Please log in.',
            user: authService.sanitizeUserData(newUser)
          });
        }

        res.status(201).json({
          success: true,
          message: 'Registration successful',
          user: authService.sanitizeUserData(newUser)
        });
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { error, value } = authService.validateLoginData(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: 'Validation failed', details: error.details });
      }

      const user = await authService.authenticateUser(value.email, value.password);

      req.login(user, (err) => {
        if (err) {
          console.error('Login session failed:', err);
          return res.status(500).json({ success: false, message: 'Login failed' });
        }

        res.json({
          success: true,
          message: 'Login successful',
          user: authService.sanitizeUserData(user)
        });
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(401).json({ success: false, message: err.message });
    }
  },

  // Logout user
  logout: (req, res) => {
    if (!req.user) {
      return res.status(400).json({ success: false, message: 'No active session found' });
    }

    const name = req.user.firstname;

    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ success: false, message: 'Failed to clear session' });
        }

        res.clearCookie('connect.sid');
        res.json({ success: true, message: `Goodbye ${name}! Logout successful` });
      });
    });
  },

  // Get profile
  getProfile: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      const user = await authService.findUserById(req.user.userid);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        user: authService.sanitizeUserData(user)
      });
    } catch (err) {
      console.error('Profile fetch error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
  },

  // Update profile
  updateProfile: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      const { error, value } = authService.validateProfileUpdateData(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: 'Validation failed', details: error.details });
      }

      const updatedUser = await authService.updateUserProfile(req.user.userid, value);

      req.login(updatedUser, (err) => {
        if (err) {
          console.error('Session update failed:', err);
        }

        res.json({
          success: true,
          message: 'Profile updated successfully',
          user: authService.sanitizeUserData(updatedUser)
        });
      });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      const { error, value } = authService.validatePasswordChangeData(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: 'Validation failed', details: error.details });
      }

      await authService.changePassword(req.user.userid, value.currentPassword, value.newPassword);

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error('Password change error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Check if authenticated
  checkAuth: (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    res.json({
      success: true,
      message: 'User is authenticated',
      user: authService.sanitizeUserData(req.user),
      isAuthenticated: true
    });
  },

  // Get user info
  getUserInfo: (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = req.user;
    res.json({
      success: true,
      user: {
        userid: user.userid,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        fullName: `${user.firstname} ${user.lastname}`
      }
    });
  },

  // Refresh session
  refreshSession: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No active session' });
    }

    try {
      const freshUser = await authService.findUserById(req.user.userid);
      if (!freshUser) {
        return res.status(404).json({ success: false, message: 'User no longer exists' });
      }

      req.login(freshUser, (err) => {
        if (err) {
          console.error('Session refresh failed:', err);
          return res.status(500).json({ success: false, message: 'Session refresh failed' });
        }

        res.json({
          success: true,
          message: 'Session refreshed successfully',
          user: authService.sanitizeUserData(freshUser)
        });
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Session refresh failed' });
    }
  },

  deleteAccount: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password required to delete account'
      });
    }

    try {
      // Use the service to delete the account
      const result = await authService.hardDeleteUserAccount(req.user.userid, password);

      // Log out the user after successful deletion
      req.logout((err) => {
        if (err) {
          console.error('Logout after deletion failed:', err);
        }

        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction after deletion failed:', err);
          }

          res.clearCookie('connect.sid');
          res.json({
            success: true,
            message: result.message
          });
        });
      });

    } catch (err) {
      console.error('Account deletion error:', err);
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }
};

export default authController;

