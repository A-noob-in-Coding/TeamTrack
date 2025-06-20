import membershipService from '../Services/membershipService.js';

const membershipController = {
  // Add a member to a team
  addMember: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const member = await membershipService.addMember(req.body, req.user.userid);
      res.status(201).json({ success: true, message: 'Member added successfully', data: member });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Remove a member from a team
  removeMember: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const { teamid, memberid } = req.body;
      const result = await membershipService.removeMember({ teamid, memberid }, req.user.userid);
      res.json({ success: true, message: 'Member removed successfully', data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Update a member's role
  updateMemberRole: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const { teamid, memberid, newRole } = req.body;
      const result = await membershipService.updateMemberRole({ teamid, memberid, newRole }, req.user.userid);
      res.json({ success: true, message: 'Member role updated successfully', data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Get all members of a team
  getTeamMembers: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const teamid = parseInt(req.params.teamid);
      const members = await membershipService.getTeamMembers(teamid, req.user.userid);
      res.json({ success: true, message: 'Team members retrieved successfully', data: members });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Get all teams a user is a member of
  getUserTeams: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const teams = await membershipService.getUserTeams(req.user.userid);
      res.json({ success: true, message: 'User teams retrieved successfully', data: teams });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // User leaves a team
  leaveTeam: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const teamid = parseInt(req.params.teamid);
      const result = await membershipService.leaveTeam(teamid, req.user.userid);
      res.json({ success: true, message: 'You have left the team', data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
};

export default membershipController;
