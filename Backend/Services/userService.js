import pool from '../Config/db.js';
import Joi from 'joi';
import bcrypt from 'bcrypt';

const userService = {
  // Get all users with pagination and search
  async getAllUsers(page = 1, limit = 10, search = '') {
    try {
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          UserID as userid, 
          Email as email, 
          FirstName as firstname, 
          LastName as lastname, 
          Bio as bio,
          CONCAT(FirstName, ' ', LastName) as fullname
        FROM "User"
      `;

      let countQuery = 'SELECT COUNT(*) FROM "User"';
      let queryParams = [];
      let countParams = [];

      if (search) {
        query += ` WHERE 
          LOWER(FirstName) LIKE LOWER($1) OR 
          LOWER(LastName) LIKE LOWER($1) OR 
          LOWER(Email) LIKE LOWER($1) OR
          LOWER(CONCAT(FirstName, ' ', LastName)) LIKE LOWER($1)
        `;
        countQuery += ` WHERE 
          LOWER(FirstName) LIKE LOWER($1) OR 
          LOWER(LastName) LIKE LOWER($1) OR 
          LOWER(Email) LIKE LOWER($1) OR
          LOWER(CONCAT(FirstName, ' ', LastName)) LIKE LOWER($1)
        `;
        const searchParam = `%${search}%`;
        queryParams = [searchParam, limit, offset];
        countParams = [searchParam];
      } else {
        queryParams = [limit, offset];
      }

      query += ` ORDER BY FirstName, LastName LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`;

      const [usersResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, countParams)
      ]);

      const totalUsers = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalUsers / limit);

      return {
        users: usersResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  },

  // Get user by ID
  async getUserById(userid) {
    const res = await pool.query('SELECT userid, email, firstname, lastname, bio FROM "User" WHERE userid = $1', [userid]);
    if (!res.rows.length) throw new Error('User not found');
    return res.rows[0];
  },

  // Get users by IDs (for bulk operations)
  async getUsersByIds(userIds) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
      }

      const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');
      const query = `
        SELECT 
          UserID as userid, 
          Email as email, 
          FirstName as firstname, 
          LastName as lastname, 
          Bio as bio,
          CONCAT(FirstName, ' ', LastName) as fullname
        FROM "User"
        WHERE UserID IN (${placeholders})
        ORDER BY FirstName, LastName
      `;

      const result = await pool.query(query, userIds);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch users by IDs: ${error.message}`);
    }
  },

  // Search users by email or name
  async searchUsers(searchTerm, limit = 10) {
    try {
      const query = `
        SELECT 
          UserID as userid, 
          Email as email, 
          FirstName as firstname, 
          LastName as lastname, 
          Bio as bio,
          CONCAT(FirstName, ' ', LastName) as fullname
        FROM "User"
        WHERE 
          LOWER(FirstName) LIKE LOWER($1) OR 
          LOWER(LastName) LIKE LOWER($1) OR 
          LOWER(Email) LIKE LOWER($1) OR
          LOWER(CONCAT(FirstName, ' ', LastName)) LIKE LOWER($1)
        ORDER BY 
          CASE 
            WHEN LOWER(Email) = LOWER($2) THEN 1
            WHEN LOWER(CONCAT(FirstName, ' ', LastName)) = LOWER($2) THEN 2
            WHEN LOWER(Email) LIKE LOWER($1) THEN 3
            ELSE 4
          END,
          FirstName, LastName
        LIMIT $3
      `;

      const searchParam = `%${searchTerm}%`;
      const result = await pool.query(query, [searchParam, searchTerm, limit]);

      return result.rows;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  },

  // Get user's team memberships
  async getUserTeams(userId) {
    try {
      const query = `
        SELECT 
          t.TeamID as teamid,
          t.TeamName as teamname,
          t.Description as description,
          t.CreatedBy as createdby,
          m.Role as role,
          m.JoinedAt as joinedat,
          CASE WHEN t.CreatedBy = $1 THEN true ELSE false END as isowner
        FROM "Team" t
        INNER JOIN "Membership" m ON t.TeamID = m.TeamID
        WHERE m.UserID = $1
        ORDER BY m.JoinedAt DESC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch user teams: ${error.message}`);
    }
  },

  // Get user's assigned tasks
  async getUserTasks(userId, status = null) {
    try {
      let query = `
        SELECT 
          t.TaskID as taskid,
          t.Title as title,
          t.Description as description,
          t.Status as status,
          t.Priority as priority,
          t.DueDate as duedate,
          t.CreatedAt as createdat,
          t.TeamID as teamid,
          team.TeamName as teamname,
          creator.FirstName as creatorfirstname,
          creator.LastName as creatorlastname
        FROM "Task" t
        INNER JOIN "Team" team ON t.TeamID = team.TeamID
        INNER JOIN "User" creator ON t.CreatedBy = creator.UserID
        WHERE t.AssignedTo = $1
      `;

      const queryParams = [userId];

      if (status) {
        query += ` AND t.Status = $2`;
        queryParams.push(status);
      }

      query += ` ORDER BY 
        CASE t.Priority 
          WHEN 'High' THEN 1 
          WHEN 'Medium' THEN 2 
          WHEN 'Low' THEN 3 
        END,
        t.DueDate ASC NULLS LAST,
        t.CreatedAt DESC
      `;

      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch user tasks: ${error.message}`);
    }
  },

  // Check if user exists by email
  async checkUserExistsByEmail(email) {
    try {
      const query = `
        SELECT 
          UserID as userid, 
          FirstName as firstname, 
          LastName as lastname,
          Email as email
        FROM "User" 
        WHERE LOWER(Email) = LOWER($1)
      `;

      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Email check failed: ${error.message}`);
    }
  },

  // Get user statistics
  async getUserStats(userId) {
    try {
      const queries = {
        teams: `
          SELECT COUNT(*) as count 
          FROM "Membership" 
          WHERE UserID = $1
        `,
        assignedTasks: `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN Status = 'Completed' THEN 1 END) as completed,
            COUNT(CASE WHEN Status = 'In Progress' THEN 1 END) as inprogress,
            COUNT(CASE WHEN Status = 'Todo' THEN 1 END) as todo,
            COUNT(CASE WHEN DueDate < NOW() AND Status != 'Completed' THEN 1 END) as overdue
          FROM "Task" 
          WHERE AssignedTo = $1
        `,
        createdTasks: `
          SELECT COUNT(*) as count 
          FROM "Task" 
          WHERE CreatedBy = $1
        `,
        ownedTeams: `
          SELECT COUNT(*) as count 
          FROM "Team" 
          WHERE CreatedBy = $1
        `
      };

      const [teamsResult, assignedTasksResult, createdTasksResult, ownedTeamsResult] = await Promise.all([
        pool.query(queries.teams, [userId]),
        pool.query(queries.assignedTasks, [userId]),
        pool.query(queries.createdTasks, [userId]),
        pool.query(queries.ownedTeams, [userId])
      ]);

      return {
        teams: parseInt(teamsResult.rows[0].count),
        tasks: {
          total: parseInt(assignedTasksResult.rows[0].total),
          completed: parseInt(assignedTasksResult.rows[0].completed),
          inProgress: parseInt(assignedTasksResult.rows[0].inprogress),
          todo: parseInt(assignedTasksResult.rows[0].todo),
          overdue: parseInt(assignedTasksResult.rows[0].overdue)
        },
        createdTasks: parseInt(createdTasksResult.rows[0].count),
        ownedTeams: parseInt(ownedTeamsResult.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to fetch user statistics: ${error.message}`);
    }
  },

  // Validation schemas
  validateUserSearchData(data) {
    const schema = Joi.object({
      search: Joi.string().min(1).max(100).optional().messages({
        'string.min': 'Search term must be at least 1 character',
        'string.max': 'Search term cannot exceed 100 characters'
      }),
      page: Joi.number().integer().min(1).optional().default(1).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
      limit: Joi.number().integer().min(1).max(100).optional().default(10).messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateUserIdData(data) {
    const schema = Joi.object({
      userId: Joi.number().integer().positive().required().messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateUserIdsData(data) {
    const schema = Joi.object({
      userIds: Joi.array().items(
        Joi.number().integer().positive()
      ).min(1).max(50).required().messages({
        'array.base': 'User IDs must be an array',
        'array.min': 'At least one user ID is required',
        'array.max': 'Cannot request more than 50 users at once',
        'any.required': 'User IDs are required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateTaskStatusData(data) {
    const schema = Joi.object({
      status: Joi.string().valid('Todo', 'In Progress', 'Completed').optional().messages({
        'any.only': 'Status must be one of: Todo, In Progress, Completed'
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

  // Sanitize multiple users
  sanitizeUsersData(users) {
    if (!Array.isArray(users)) return [];
    return users.map(user => this.sanitizeUserData(user));
  },

  // Update user profile
  async updateUser(userid, data) {
    const { error, value } = this.validateUpdateProfileData(data);
    if (error) throw new Error(error.details.map(d => d.message).join(', '));
    const res = await pool.query(
      'UPDATE "User" SET firstname = COALESCE($1, firstname), lastname = COALESCE($2, lastname), bio = COALESCE($3, bio) WHERE userid = $4 RETURNING userid, email, firstname, lastname, bio',
      [value.firstname, value.lastname, value.bio, userid]
    );
    if (!res.rows.length) throw new Error('User not found');
    return res.rows[0];
  },

  // Change password
  async changePassword(userid, currentPassword, newPassword) {
    // Get current hash
    const res = await pool.query('SELECT password FROM "User" WHERE userid = $1', [userid]);
    if (!res.rows.length) throw new Error('User not found');
    const valid = await bcrypt.compare(currentPassword, res.rows[0].password);
    if (!valid) throw new Error('Current password is incorrect');
    // Hash new password
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE "User" SET password = $1 WHERE userid = $2', [hash, userid]);
    return { message: 'Password updated successfully' };
  },

  // Delete user account
  async deleteUser(userid, password) {
    // Check password
    const res = await pool.query('SELECT password FROM "User" WHERE userid = $1', [userid]);
    if (!res.rows.length) throw new Error('User not found');
    const valid = await bcrypt.compare(password, res.rows[0].password);
    if (!valid) throw new Error('Password is incorrect');
    // Delete user
    await pool.query('DELETE FROM "User" WHERE userid = $1', [userid]);
    return { message: 'User deleted successfully' };
  },

  // Validation
  validateUpdateProfileData(data) {
    const schema = Joi.object({
      firstname: Joi.string().min(2).max(100).optional(),
      lastname: Joi.string().min(2).max(100).optional(),
      bio: Joi.string().allow('', null).optional()
    });
    return schema.validate(data, { abortEarly: false });
  }
};

export default userService;
