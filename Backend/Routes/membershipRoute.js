import express from 'express';
import membershipController from '../Controllers/membershipController.js';

const membershipRouter = express.Router();

// Add a member to a team
membershipRouter.post('/add', membershipController.addMember); // POST /api/membership/add

// Remove a member from a team
membershipRouter.post('/remove', membershipController.removeMember); // POST /api/membership/remove

// Update a member's role
membershipRouter.post('/update-role', membershipController.updateMemberRole); // POST /api/membership/update-role

// Get all members of a team
membershipRouter.get('/team/:teamid', membershipController.getTeamMembers); // GET /api/membership/team/:teamid

// Get all teams a user is a member of
membershipRouter.get('/my-teams', membershipController.getUserTeams); // GET /api/membership/my-teams

// User leaves a team
membershipRouter.delete('/leave/:teamid', membershipController.leaveTeam); // DELETE /api/membership/leave/:teamid

export default membershipRouter; 