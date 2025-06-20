import taskService from '../Services/taskService.js';

const taskController = {
  // Create a new task
  createTask: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const task = await taskService.createTask(req.body, req.user.userid);
      res.status(201).json({ success: true, message: 'Task created successfully', data: task });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Get all tasks (with optional filters)
  getTasks: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const tasks = await taskService.getTasks(req.query, req.user.userid);
      res.json({ success: true, message: 'Tasks retrieved successfully', data: tasks });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Get a single task by id
  getTaskById: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const task = await taskService.getTaskById(parseInt(req.params.id), req.user.userid);
      res.json({ success: true, message: 'Task retrieved successfully', data: task });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  },

  // Update a task
  updateTask: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const task = await taskService.updateTask(parseInt(req.params.id), req.body, req.user.userid);
      res.json({ success: true, message: 'Task updated successfully', data: task });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // Delete a task
  deleteTask: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const task = await taskService.deleteTask(parseInt(req.params.id), req.user.userid);
      res.json({ success: true, message: 'Task deleted successfully', data: task });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  updateTaskStatus: async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
      const { status } = req.body;
      const task = await taskService.updateTask(parseInt(req.params.id), { status }, req.user.userid);
      res.json({ success: true, message: 'Task status updated successfully', data: task });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
};

export default taskController;
