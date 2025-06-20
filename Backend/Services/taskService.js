import pool from '../Config/db.js';
import Joi from 'joi';

const statusOptions = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const taskService = {
  // Create a new task
  async createTask(data, userId) {
    // Validate input
    const { error, value } = this.validateTaskCreateData(data);
    if (error) throw new Error(error.details.map(d => d.message).join(', '));

    // Check if user is a member of the team
    const isMember = await this.isTeamMember(userId, value.teamid);
    if (!isMember) throw new Error('You are not a member of this team');

    // Insert task
    const query = `
      INSERT INTO task (teamid, assignedto, title, description, duedate, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      value.teamid,
      value.assignedto || null,
      value.title,
      value.description || null,
      value.duedate || null,
      value.status || 'Pending'
    ];
    const result = await pool.query(query, params);
    return result.rows[0];
  },

  // Get all tasks (optionally filter by team or assignee)
  async getTasks({ teamid, assignedto, status, search, page = 1, limit = 10 }, userId) {
    // Only return tasks for teams the user is a member of
    let baseQuery = `
      SELECT t.*, u.firstname as assigned_firstname, u.lastname as assigned_lastname
      FROM task t
      LEFT JOIN "User" u ON t.assignedto = u.userid
      WHERE t.teamid IN (
        SELECT teamid FROM membership WHERE userid = $1
      )
    `;
    let params = [userId];
    let idx = 2;
    if (teamid) {
      baseQuery += ` AND t.teamid = $${idx++}`;
      params.push(teamid);
    }
    if (assignedto) {
      baseQuery += ` AND t.assignedto = $${idx++}`;
      params.push(assignedto);
    }
    if (status) {
      baseQuery += ` AND t.status = $${idx++}`;
      params.push(status);
    }
    if (search) {
      baseQuery += ` AND (LOWER(t.title) LIKE LOWER($${idx}) OR LOWER(t.description) LIKE LOWER($${idx}))`;
      params.push(`%${search}%`);
      idx++;
    }
    baseQuery += ` ORDER BY t.duedate ASC NULLS LAST, t.taskid DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, (page - 1) * limit);
    const result = await pool.query(baseQuery, params);
    return result.rows;
  },

  // Get a single task by id
  async getTaskById(taskid, userId) {
    // Only allow if user is a member of the team
    const query = `
      SELECT t.*, u.firstname as assigned_firstname, u.lastname as assigned_lastname
      FROM task t
      LEFT JOIN "User" u ON t.assignedto = u.userid
      WHERE t.taskid = $1
    `;
    const result = await pool.query(query, [taskid]);
    if (!result.rows.length) throw new Error('Task not found');
    const task = result.rows[0];
    const isMember = await this.isTeamMember(userId, task.teamid);
    if (!isMember) throw new Error('You are not a member of this team');
    return task;
  },

  // Update a task
  async updateTask(taskid, data, userId) {
    // Validate input
    const { error, value } = this.validateTaskUpdateData(data);
    if (error) throw new Error(error.details.map(d => d.message).join(', '));
    // Get task
    const task = await this.getTaskById(taskid, userId);
    // Only team members can update
    const isMember = await this.isTeamMember(userId, task.teamid);
    if (!isMember) throw new Error('You are not a member of this team');
    // Only assigned user or admin can update status
    if (value.status && value.status !== task.status) {
      const isAdmin = await this.isTeamAdmin(userId, task.teamid);
      if (task.assignedto !== userId && !isAdmin) {
        throw new Error('Only assigned user or team admin can update status');
      }
    }
    // Build update query
    const fields = [];
    const params = [];
    let idx = 1;
    for (const key of ['title', 'description', 'duedate', 'status', 'assignedto']) {
      if (value[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(value[key]);
      }
    }
    if (!fields.length) throw new Error('No valid fields to update');
    params.push(taskid);
    const query = `UPDATE task SET ${fields.join(', ')} WHERE taskid = $${idx} RETURNING *`;
    const result = await pool.query(query, params);
    return result.rows[0];
  },

  // Delete a task
  async deleteTask(taskid, userId) {
    // Only team members can delete
    const task = await this.getTaskById(taskid, userId);
    const isMember = await this.isTeamMember(userId, task.teamid);
    if (!isMember) throw new Error('You are not a member of this team');
    const query = 'DELETE FROM task WHERE taskid = $1 RETURNING *';
    const result = await pool.query(query, [taskid]);
    if (!result.rows.length) throw new Error('Task not found or already deleted');
    return result.rows[0];
  },

  // Helpers
  async isTeamMember(userId, teamid) {
    const q = 'SELECT 1 FROM membership WHERE userid = $1 AND teamid = $2';
    const r = await pool.query(q, [userId, teamid]);
    return !!r.rows.length;
  },
  async isTeamAdmin(userId, teamid) {
    const q = "SELECT 1 FROM membership WHERE userid = $1 AND teamid = $2 AND role = 'Admin'";
    const r = await pool.query(q, [userId, teamid]);
    return !!r.rows.length;
  },

  // Validation
  validateTaskCreateData(data) {
    const schema = Joi.object({
      teamid: Joi.number().integer().required(),
      assignedto: Joi.number().integer().optional().allow(null),
      title: Joi.string().min(2).max(255).required(),
      description: Joi.string().allow('', null),
      duedate: Joi.date().optional().allow(null),
      status: Joi.string().valid(...statusOptions).optional()
    });
    return schema.validate(data, { abortEarly: false });
  },
  validateTaskUpdateData(data) {
    const schema = Joi.object({
      assignedto: Joi.number().integer().optional().allow(null),
      title: Joi.string().min(2).max(255).optional(),
      description: Joi.string().allow('', null),
      duedate: Joi.date().optional().allow(null),
      status: Joi.string().valid(...statusOptions).optional()
    });
    return schema.validate(data, { abortEarly: false });
  }
};

export default taskService;
