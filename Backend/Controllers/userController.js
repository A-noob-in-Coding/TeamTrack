import userService from '../Services/userService.js';

const userController = {
  // Get all users with pagination and search
  getAllUsers: async (req, res) => {
    try {
      const { error, value } = userService.validateUserSearchData(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const { search = '', page = 1, limit = 10 } = value;
      const result = await userService.getAllUsers(page, limit, search);

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.users,
        pagination: result.pagination
      });
    } catch (err) {
      console.error('Get all users error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: err.message
      });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { error, value } = userService.validateUserIdData({ userId: parseInt(req.params.id) });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const user = await userService.getUserById(value.userId);

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: userService.sanitizeUserData(user)
      });
    } catch (err) {
      console.error('Get user by ID error:', err);

      if (err.message.includes('User not found')) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user',
        error: err.message
      });
    }
  },

  // Get multiple users by IDs
  getUsersByIds: async (req, res) => {
    try {
      const userIds = Array.isArray(req.body.userIds)
        ? req.body.userIds.map(id => parseInt(id))
        : [];

      const { error, value } = userService.validateUserIdsData({ userIds });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const users = await userService.getUsersByIds(value.userIds);

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: userService.sanitizeUsersData(users),
        count: users.length
      });
    } catch (err) {
      console.error('Get users by IDs error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        error: err.message
      });
    }
  },

  // Search users
  searchUsers: async (req, res) => {
    try {
      const { search } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const { error, value } = userService.validateUserSearchData({ search });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const users = await userService.searchUsers(value.search, limit);

      res.json({
        success: true,
        message: 'Search completed successfully',
        data: userService.sanitizeUsersData(users),
        count: users.length,
        searchTerm: value.search
      });
    } catch (err) {
      console.error('Search users error:', err);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: err.message
      });
    }
  },

  // Get user's teams
  getUserTeams: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Check if user is requesting their own teams or if they're authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Allow users to see their own teams, or any authenticated user to see others' teams
      const targetUserId = userId || req.user.userid;

      const { error, value } = userService.validateUserIdData({ userId: targetUserId });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const teams = await userService.getUserTeams(value.userId);

      res.json({
        success: true,
        message: 'User teams retrieved successfully',
        data: teams,
        count: teams.length
      });
    } catch (err) {
      console.error('Get user teams error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user teams',
        error: err.message
      });
    }
  },

  // Get user's tasks
  getUserTasks: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const status = req.query.status;

      // Check if user is requesting their own tasks or if they're authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const targetUserId = userId || req.user.userid;

      const userIdValidation = userService.validateUserIdData({ userId: targetUserId });
      if (userIdValidation.error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: userIdValidation.error.details
        });
      }

      if (status) {
        const statusValidation = userService.validateTaskStatusData({ status });
        if (statusValidation.error) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            details: statusValidation.error.details
          });
        }
      }

      const tasks = await userService.getUserTasks(targetUserId, status);

      res.json({
        success: true,
        message: 'User tasks retrieved successfully',
        data: tasks,
        count: tasks.length,
        filters: { status: status || 'all' }
      });
    } catch (err) {
      console.error('Get user tasks error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user tasks',
        error: err.message
      });
    }
  },

  // Check if user exists by email
  checkUserByEmail: async (req, res) => {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email parameter is required'
        });
      }

      const user = await userService.checkUserExistsByEmail(email);

      if (user) {
        res.json({
          success: true,
          message: 'User found',
          data: userService.sanitizeUserData(user),
          exists: true
        });
      } else {
        res.json({
          success: true,
          message: 'User not found',
          exists: false
        });
      }
    } catch (err) {
      console.error('Check user by email error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to check user',
        error: err.message
      });
    }
  },

  // Get user statistics
  getUserStats: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Check if user is requesting their own stats or if they're authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const targetUserId = userId || req.user.userid;

      const { error, value } = userService.validateUserIdData({ userId: targetUserId });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const stats = await userService.getUserStats(value.userId);

      res.json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: stats
      });
    } catch (err) {
      console.error('Get user stats error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user statistics',
        error: err.message
      });
    }
  },

  // Get current user's info (authenticated user's own info)
  getCurrentUser: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const user = await userService.getUserById(req.user.userid);

      res.json({
        success: true,
        message: 'Current user info retrieved successfully',
        data: userService.sanitizeUserData(user)
      });
    } catch (err) {
      console.error('Get current user error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve current user info',
        error: err.message
      });
    }
  },

  // Get current user's teams
  getCurrentUserTeams: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const teams = await userService.getUserTeams(req.user.userid);

      res.json({
        success: true,
        message: 'Your teams retrieved successfully',
        data: teams,
        count: teams.length
      });
    } catch (err) {
      console.error('Get current user teams error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve your teams',
        error: err.message
      });
    }
  },

  // Get current user's tasks
  getCurrentUserTasks: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const status = req.query.status;

      if (status) {
        const statusValidation = userService.validateTaskStatusData({ status });
        if (statusValidation.error) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            details: statusValidation.error.details
          });
        }
      }

      const tasks = await userService.getUserTasks(req.user.userid, status);

      res.json({
        success: true,
        message: 'Your tasks retrieved successfully',
        data: tasks,
        count: tasks.length,
        filters: { status: status || 'all' }
      });
    } catch (err) {
      console.error('Get current user tasks error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve your tasks',
        error: err.message
      });
    }
  },

  // Get current user's statistics
  getCurrentUserStats: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const stats = await userService.getUserStats(req.user.userid);

      res.json({
        success: true,
        message: 'Your statistics retrieved successfully',
        data: stats
      });
    } catch (err) {
      console.error('Get current user stats error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve your statistics',
        error: err.message
      });
    }
  },

  // Get current user's profile
  getProfile: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const user = await userService.getUserById(req.user.userid);
      res.json({ success: true, message: 'Profile retrieved successfully', data: user });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  },

  // Update current user's profile
  updateProfile: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const user = await userService.updateUser(req.user.userid, req.body);
      res.json({ success: true, message: 'Profile updated successfully', data: user });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) throw new Error('Both currentPassword and newPassword are required');
      const result = await userService.changePassword(req.user.userid, currentPassword, newPassword);
      res.json({ success: true, message: result.message });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Delete user account
  deleteAccount: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const { password } = req.body;
      if (!password) throw new Error('Password is required');
      const result = await userService.deleteUser(req.user.userid, password);
      req.logout(() => {}); // End session
      res.json({ success: true, message: result.message });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
};

export default userController;
