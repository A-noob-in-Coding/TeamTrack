import teamService from '../Services/teamService.js';

const teamController = {
  // Create a new team
  createTeam: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const { error, value } = teamService.validateTeamCreateData(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const newTeam = await teamService.createTeam(value, req.user.userid);

      res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: newTeam
      });
    } catch (err) {
      console.error('Create team error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to create team',
        error: err.message
      });
    }
  },

  // Get all teams with pagination and search
  getAllTeams: async (req, res) => {
    try {
      const { error, value } = teamService.validateSearchData(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const { search = '', page = 1, limit = 10 } = value;
      const userId = req.query.myTeams === 'true' && req.user ? req.user.userid : null;

      const result = await teamService.getAllTeams(page, limit, search, userId);

      res.json({
        success: true,
        message: 'Teams retrieved successfully',
        data: result.teams,
        pagination: result.pagination
      });
    } catch (err) {
      console.error('Get all teams error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve teams',
        error: err.message
      });
    }
  },

  // Get team by ID
  getTeamById: async (req, res) => {
    try {
      const { error, value } = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const team = await teamService.getTeamById(value.teamId);

      res.json({
        success: true,
        message: 'Team retrieved successfully',
        data: team
      });
    } catch (err) {
      console.error('Get team by ID error:', err);

      if (err.message.includes('Team not found')) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve team',
        error: err.message
      });
    }
  },

  // Update team details
  updateTeam: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const teamIdValidation = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      if (teamIdValidation.error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: teamIdValidation.error.details
        });
      }

      const { error, value } = teamService.validateTeamUpdateData(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const updatedTeam = await teamService.updateTeam(
        teamIdValidation.value.teamId,
        value,
        req.user.userid
      );

      res.json({
        success: true,
        message: 'Team updated successfully',
        data: updatedTeam
      });
    } catch (err) {
      console.error('Update team error:', err);

      if (err.message.includes('Team not found')) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      if (err.message.includes('Insufficient permissions')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update team'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update team',
        error: err.message
      });
    }
  },

  // Delete team
  deleteTeam: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const { error, value } = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const result = await teamService.deleteTeam(value.teamId, req.user.userid);

      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      console.error('Delete team error:', err);

      if (err.message.includes('Team not found')) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      if (err.message.includes('Only team owner')) {
        return res.status(403).json({
          success: false,
          message: 'Only team owner can delete the team'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete team',
        error: err.message
      });
    }
  },

  // Add member to team
  addMemberToTeam: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const teamIdValidation = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      if (teamIdValidation.error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: teamIdValidation.error.details
        });
      }

      const { error, value } = teamService.validateAddMemberData(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const result = await teamService.addMemberToTeam(
        teamIdValidation.value.teamId,
        value.userEmail,
        value.role,
        req.user.userid
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.member
      });
    } catch (err) {
      console.error('Add member to team error:', err);

      if (err.message.includes('Insufficient permissions')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to add members'
        });
      }

      if (err.message.includes('User with email') && err.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: err.message
        });
      }

      if (err.message.includes('already a member')) {
        return res.status(409).json({
          success: false,
          message: err.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add member to team',
        error: err.message
      });
    }
  },

  // Remove member from team
  removeMemberFromTeam: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const teamIdValidation = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      const memberId = parseInt(req.params.memberId); // memberId is a user ID
      if (teamIdValidation.error || isNaN(memberId)) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: teamIdValidation.error?.details || 'Invalid memberId'
        });
      }

      const result = await teamService.removeMemberFromTeam(
        teamIdValidation.value.teamId,
        memberId,
        req.user.userid
      );

      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      console.error('Remove member from team error:', err);

      if (err.message.includes('Insufficient permissions')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to remove members'
        });
      }

      if (err.message.includes('Cannot remove team owner')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove team owner from the team'
        });
      }

      if (err.message.includes('Member not found')) {
        return res.status(404).json({
          success: false,
          message: 'Member not found in this team'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to remove member from team',
        error: err.message
      });
    }
  },

  // Update member role
  updateMemberRole: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const teamIdValidation = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      const memberId = parseInt(req.params.memberId); // memberId is a user ID
      if (teamIdValidation.error || isNaN(memberId)) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: teamIdValidation.error?.details || 'Invalid memberId'
        });
      }

      const { error, value } = teamService.validateUpdateRoleData(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const result = await teamService.updateMemberRole(
        teamIdValidation.value.teamId,
        memberId,
        value.newRole,
        req.user.userid
      );

      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      console.error('Update member role error:', err);

      if (err.message.includes('Insufficient permissions')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update member roles'
        });
      }

      if (err.message.includes('Cannot change team owner role')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change team owner role'
        });
      }

      if (err.message.includes('Member not found')) {
        return res.status(404).json({
          success: false,
          message: 'Member not found in team'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update member role',
        error: err.message
      });
    }
  },

  // Get team members
  getTeamMembers: async (req, res) => {
    try {
      const { error, value } = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const userId = req.user ? req.user.userid : null;
      const members = await teamService.getTeamMembers(value.teamId, userId);

      res.json({
        success: true,
        message: 'Team members retrieved successfully',
        data: members,
        count: members.length
      });
    } catch (err) {
      console.error('Get team members error:', err);

      if (err.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to view team members'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve team members',
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
      const teams = await teamService.getUserTeams(req.user.userid);

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

  // Search teams
  searchTeams: async (req, res) => {
    try {
      const { search } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const { error, value } = teamService.validateSearchData({ search });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const userId = req.query.myTeams === 'true' && req.user ? req.user.userid : null;

      const teams = await teamService.searchTeams(value.search, limit, userId);

      res.json({
        success: true,
        message: 'Search completed successfully',
        data: teams,
        count: teams.length,
        searchTerm: value.search
      });
    } catch (err) {
      console.error('Search teams error:', err);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: err.message
      });
    }
  },

  // Check user team permission
  checkUserTeamPermission: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const { error, value } = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      const allowedRoles = req.query.roles ? req.query.roles.split(',') : [];
      const hasPermission = await teamService.checkUserTeamPermission(
        req.user.userid,
        value.teamId,
        allowedRoles
      );

      res.json({
        success: true,
        message: 'Permission check completed',
        data: {
          hasPermission,
          userId: req.user.userid,
          teamId: value.teamId,
          checkedRoles: allowedRoles
        }
      });
    } catch (err) {
      console.error('Check user team permission error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to check permissions',
        error: err.message
      });
    }
  },

  // Get team statistics (for dashboard or analytics)
  getTeamStats: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const { error, value } = teamService.validateTeamIdData({ teamId: parseInt(req.params.id) });
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.details
        });
      }

      // Check if user has access to team
      const hasAccess = await teamService.checkUserTeamPermission(
        req.user.userid,
        value.teamId,
        ['Owner', 'Admin', 'Member']
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to view team statistics'
        });
      }

      const team = await teamService.getTeamById(value.teamId);

      res.json({
        success: true,
        message: 'Team statistics retrieved successfully',
        data: {
          teamId: team.teamid,
          teamName: team.teamname,
          memberCount: team.memberCount,
          taskStats: team.taskStats,
          createdAt: team.createdat
        }
      });
    } catch (err) {
      console.error('Get team stats error:', err);

      if (err.message.includes('Team not found')) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve team statistics',
        error: err.message
      });
    }
  }
};

export default teamController;
