import express from 'express';
import teamController from '../Controllers/teamController.js';

const teamRouter = express.Router();

// Public routes
teamRouter.get('/', teamController.getAllTeams);
teamRouter.get('/:id', teamController.getTeamById);

// Authenticated routes - authentication is handled in the controller
teamRouter.post('/', teamController.createTeam);
teamRouter.put('/:id', teamController.updateTeam);
teamRouter.delete('/:id', teamController.deleteTeam);
teamRouter.post('/:id/members', teamController.addMemberToTeam);
teamRouter.delete('/:id/members/:memberId', teamController.removeMemberFromTeam);
teamRouter.put('/:id/members/:memberId/role', teamController.updateMemberRole);
teamRouter.get('/:id/members', teamController.getTeamMembers);

export default teamRouter; 