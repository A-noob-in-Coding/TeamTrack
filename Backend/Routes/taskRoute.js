import express from 'express';
import taskController from '../Controllers/taskController.js';

const taskRouter = express.Router();

// All routes require authentication (checked in controller)
taskRouter.get('/', taskController.getTasks); // GET /api/tasks?teamid=&assignedto=&status=&search=&page=&limit=
taskRouter.post('/', taskController.createTask); // POST /api/tasks

taskRouter.get('/:id', taskController.getTaskById); // GET /api/tasks/:id
taskRouter.put('/:id', taskController.updateTask); // PUT /api/tasks/:id
taskRouter.delete('/:id', taskController.deleteTask); // DELETE /api/tasks/:id
taskRouter.put('/:id/status', taskController.updateTaskStatus);

export default taskRouter; 