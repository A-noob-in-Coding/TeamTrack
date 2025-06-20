import pool from '../Config/db.js';
import Joi from 'joi';

const teamService = {
  // Create a new team
  async createTeam(teamData, creatorId) {
    try {
      const { teamName } = teamData;

      await pool.query('BEGIN');

      // Create the team
      const teamQuery = `
        INSERT INTO team (teamname, createdby)
        VALUES ($1, $2)
        RETURNING teamid, teamname, createdby
      `;

      const teamResult = await pool.query(teamQuery, [teamName, creatorId]);
      const newTeam = teamResult.rows[0];

      // Add creator as team member with 'Admin' role (since there's no 'Owner' role)
      const membershipQuery = `
        INSERT INTO membership (userid, teamid, role)
        VALUES ($1, $2, $3)
      `;

      await pool.query(membershipQuery, [creatorId, newTeam.teamid, 'Admin']);

      await pool.query('COMMIT');

      // Get complete team info with creator details
      return await this.getTeamById(newTeam.teamid);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw new Error(`Team creation failed: ${error.message}`);
    }
  },

  // Get all teams with pagination and search
  async getAllTeams(page = 1, limit = 10, search = '', userId = null) {
    try {
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          t.teamid as teamid, 
          t.teamname as teamname,
          t.createdby as createdby,
          u.firstname as creatorfirstname,
          u.lastname as creatorlastname,
          COUNT(DISTINCT m.userid) as membercount,
          COUNT(DISTINCT task.taskid) as taskcount
        FROM team t
        INNER JOIN "User" u ON t.createdby = u.userid
        LEFT JOIN membership m ON t.teamid = m.teamid
        LEFT JOIN task task ON t.teamid = task.teamid
      `;

      let countQuery = `
        SELECT COUNT(DISTINCT t.teamid) 
        FROM team t
        INNER JOIN "User" u ON t.createdby = u.userid
      `;

      let queryParams = [];
      let countParams = [];
      let whereConditions = [];

      // Add search condition
      if (search) {
        whereConditions.push(`(
          LOWER(t.teamname) LIKE LOWER($${queryParams.length + 1}) OR
          LOWER(CONCAT(u.firstname, ' ', u.lastname)) LIKE LOWER($${queryParams.length + 1})
        )`);
        const searchParam = `%${search}%`;
        queryParams.push(searchParam);
      }

      // Add user filter (if user wants to see only their teams)
      if (userId) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM membership mem 
          WHERE mem.teamid = t.teamid AND mem.userid = $${queryParams.length + 1}
        )`);
        queryParams.push(userId);
      }

      // Apply WHERE conditions
      if (whereConditions.length > 0) {
        const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
        countParams = [...queryParams];
      }

      query += ` 
        GROUP BY t.teamid, t.teamname, t.createdby, u.firstname, u.lastname
        ORDER BY t.teamid DESC 
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      queryParams.push(limit, offset);

      const [teamsResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, countParams)
      ]);

      const totalTeams = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalTeams / limit);

      return {
        teams: teamsResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalTeams,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch teams: ${error.message}`);
    }
  },

  // Get team by ID with full details
  async getTeamById(teamId) {
    try {
      const query = `
        SELECT 
          t.teamid as teamid, 
          t.teamname as teamname,
          t.createdby as createdby,
          u.firstname as creatorfirstname,
          u.lastname as creatorlastname,
          u.email as creatoremail
        FROM team t
        INNER JOIN "User" u ON t.createdby = u.userid
        WHERE t.teamid = $1
      `;

      const result = await pool.query(query, [teamId]);

      if (result.rows.length === 0) {
        throw new Error('Team not found');
      }

      const team = result.rows[0];

      // Get team members
      const membersQuery = `
        SELECT 
          m.userid as userid,
          m.role as role,
          u.firstname as firstname,
          u.lastname as lastname,
          u.email as email
        FROM membership m
        INNER JOIN "User" u ON m.userid = u.userid
        WHERE m.teamid = $1
        ORDER BY 
          CASE m.role 
            WHEN 'Admin' THEN 1 
            WHEN 'Member' THEN 2 
            WHEN 'Viewer' THEN 3 
          END,
          u.firstname ASC
      `;

      const membersResult = await pool.query(membersQuery, [teamId]);

      // Get team tasks count by status
      const tasksStatsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as inprogress,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN duedate < CURRENT_DATE AND status NOT IN ('Completed', 'Cancelled') THEN 1 END) as overdue
        FROM task
        WHERE teamid = $1
      `;

      const tasksStatsResult = await pool.query(tasksStatsQuery, [teamId]);

      return {
        ...team,
        members: membersResult.rows,
        memberCount: membersResult.rows.length,
        taskStats: {
          total: parseInt(tasksStatsResult.rows[0].total),
          completed: parseInt(tasksStatsResult.rows[0].completed),
          inProgress: parseInt(tasksStatsResult.rows[0].inprogress),
          pending: parseInt(tasksStatsResult.rows[0].pending),
          cancelled: parseInt(tasksStatsResult.rows[0].cancelled),
          overdue: parseInt(tasksStatsResult.rows[0].overdue)
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch team: ${error.message}`);
    }
  },

  // Update team details
  async updateTeam(teamId, updateData, userId) {
    try {
      // Check if user has permission to update team
      const hasPermission = await this.checkUserTeamPermission(userId, teamId, ['Admin']);
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update team');
      }

      const { teamName } = updateData;

      const query = `
        UPDATE team
        SET teamname = COALESCE($1, teamname)
        WHERE teamid = $2
        RETURNING teamid, teamname, createdby
      `;

      const result = await pool.query(query, [teamName, teamId]);

      if (result.rows.length === 0) {
        throw new Error('Team not found');
      }

      return await this.getTeamById(teamId);
    } catch (error) {
      throw new Error(`Team update failed: ${error.message}`);
    }
  },

  // Delete team (only by creator)
  async deleteTeam(teamId, userId) {
    try {
      // Check if user is the team creator
      const creatorQuery = 'SELECT createdby FROM team WHERE teamid = $1';
      const creatorResult = await pool.query(creatorQuery, [teamId]);

      if (creatorResult.rows.length === 0) {
        throw new Error('Team not found');
      }

      if (creatorResult.rows[0].createdby !== userId) {
        throw new Error('Only team creator can delete the team');
      }

      await pool.query('BEGIN');

      // Delete in order: Tasks -> Memberships -> Team
      await pool.query('DELETE FROM task WHERE teamid = $1', [teamId]);
      await pool.query('DELETE FROM membership WHERE teamid = $1', [teamId]);

      const deleteResult = await pool.query(
        'DELETE FROM team WHERE teamid = $1 RETURNING teamname',
        [teamId]
      );

      if (deleteResult.rows.length === 0) {
        throw new Error('Team not found');
      }

      await pool.query('COMMIT');

      return {
        success: true,
        message: `Team "${deleteResult.rows[0].teamname}" has been deleted successfully`
      };
    } catch (error) {
      await pool.query('ROLLBACK');
      throw new Error(`Team deletion failed: ${error.message}`);
    }
  },

  // Add member to team
  async addMemberToTeam(teamId, userEmail, role = 'Member', inviterId) {
    try {
      // Check if inviter has permission
      const hasPermission = await this.checkUserTeamPermission(inviterId, teamId, ['Admin']);
      if (!hasPermission) {
        throw new Error('Insufficient permissions to add members');
      }

      // Find user by email
      const userQuery = 'SELECT userid, firstname, lastname FROM "User" WHERE LOWER(email) = LOWER($1)';
      const userResult = await pool.query(userQuery, [userEmail]);

      if (userResult.rows.length === 0) {
        throw new Error(`User with email ${userEmail} not found`);
      }

      const user = userResult.rows[0];

      // Check if user is already a member
      const existingMemberQuery = 'SELECT role FROM membership WHERE userid = $1 AND teamid = $2';
      const existingMember = await pool.query(existingMemberQuery, [user.userid, teamId]);

      if (existingMember.rows.length > 0) {
        throw new Error(`User is already a member of this team with role: ${existingMember.rows[0].role}`);
      }

      // Add member
      const membershipQuery = `
        INSERT INTO membership (userid, teamid, role)
        VALUES ($1, $2, $3)
      `;

      await pool.query(membershipQuery, [user.userid, teamId, role]);

      return {
        success: true,
        message: `${user.firstname} ${user.lastname} has been added to the team as ${role}`,
        member: {
          userid: user.userid,
          firstname: user.firstname,
          lastname: user.lastname,
          role: role
        }
      };
    } catch (error) {
      throw new Error(`Failed to add member: ${error.message}`);
    }
  },

  // Remove member from team
  async removeMemberFromTeam(teamId, memberId, removerId) {
    try {
      // Check if remover has permission
      const hasPermission = await this.checkUserTeamPermission(removerId, teamId, ['Admin']);
      if (!hasPermission) {
        throw new Error('Insufficient permissions to remove members');
      }

      // Cannot remove team creator
      const creatorQuery = 'SELECT createdby FROM team WHERE teamid = $1';
      const creatorResult = await pool.query(creatorQuery, [teamId]);

      if (creatorResult.rows[0].createdby === memberId) {
        throw new Error('Cannot remove team creator from the team');
      }

      // Get member info before removal
      const memberQuery = `
        SELECT u.firstname, u.lastname, m.role
        FROM "User" u
        INNER JOIN membership m ON u.userid = m.userid
        WHERE m.userid = $1 AND m.teamid = $2
      `;

      const memberResult = await pool.query(memberQuery, [memberId, teamId]);

      if (memberResult.rows.length === 0) {
        throw new Error('Member not found in this team');
      }

      const member = memberResult.rows[0];

      // Remove member
      const removeQuery = 'DELETE FROM membership WHERE userid = $1 AND teamid = $2';
      const result = await pool.query(removeQuery, [memberId, teamId]);

      if (result.rowCount === 0) {
        throw new Error('Member not found in team');
      }

      return {
        success: true,
        message: `${member.firstname} ${member.lastname} has been removed from the team`
      };
    } catch (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  },

  // Update member role
  async updateMemberRole(teamId, memberId, newRole, updaterId) {
    try {
      // Check if updater has permission
      const hasPermission = await this.checkUserTeamPermission(updaterId, teamId, ['Admin']);
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update member roles');
      }

      // Cannot change team creator role
      const creatorQuery = 'SELECT createdby FROM team WHERE teamid = $1';
      const creatorResult = await pool.query(creatorQuery, [teamId]);

      if (creatorResult.rows[0].createdby === memberId) {
        throw new Error('Cannot change team creator role');
      }

      // Update role
      const updateQuery = `
        UPDATE membership
        SET role = $1
        WHERE userid = $2 AND teamid = $3
        RETURNING role
      `;

      const result = await pool.query(updateQuery, [newRole, memberId, teamId]);

      if (result.rows.length === 0) {
        throw new Error('Member not found in team');
      }

      // Get member info
      const memberQuery = `
        SELECT firstname, lastname FROM "User" WHERE userid = $1
      `;
      const memberResult = await pool.query(memberQuery, [memberId]);

      return {
        success: true,
        message: `${memberResult.rows[0].firstname} ${memberResult.rows[0].lastname}'s role has been updated to ${newRole}`,
        newRole: newRole
      };
    } catch (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }
  },

  // Get team members
  async getTeamMembers(teamId, userId = null) {
    try {
      // Check if user has access to view team members
      if (userId) {
        const hasAccess = await this.checkUserTeamPermission(userId, teamId, ['Admin', 'Member', 'Viewer']);
        if (!hasAccess) {
          throw new Error('Access denied to view team members');
        }
      }

      const query = `
        SELECT 
          m.userid as userid,
          m.role as role,
          u.firstname as firstname,
          u.lastname as lastname,
          u.email as email,
          COUNT(t.taskid) as assignedtasks
        FROM membership m
        INNER JOIN "User" u ON m.userid = u.userid
        LEFT JOIN task t ON u.userid = t.assignedto AND t.teamid = $1
        WHERE m.teamid = $1
        GROUP BY m.userid, m.role, u.firstname, u.lastname, u.email
        ORDER BY 
          CASE m.role 
            WHEN 'Admin' THEN 1 
            WHEN 'Member' THEN 2 
            WHEN 'Viewer' THEN 3 
          END,
          u.firstname ASC
      `;

      const result = await pool.query(query, [teamId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch team members: ${error.message}`);
    }
  },

  // Check user permission in team
  async checkUserTeamPermission(userId, teamId, allowedRoles = []) {
    try {
      const query = `
        SELECT role FROM membership 
        WHERE userid = $1 AND teamid = $2
      `;

      const result = await pool.query(query, [userId, teamId]);

      if (result.rows.length === 0) {
        return false; // User is not a member
      }

      const userRole = result.rows[0].role;
      return allowedRoles.length === 0 || allowedRoles.includes(userRole);
    } catch (error) {
      return false;
    }
  },

  // Get user's teams
  async getUserTeams(userId) {
    try {
      const query = `
        SELECT 
          t.teamid as teamid,
          t.teamname as teamname,
          t.createdby as createdby,
          m.role as role,
          u.firstname as creatorfirstname,
          u.lastname as creatorlastname,
          COUNT(DISTINCT mem.userid) as membercount,
          COUNT(DISTINCT task.taskid) as taskcount
        FROM team t
        INNER JOIN membership m ON t.teamid = m.teamid
        INNER JOIN "User" u ON t.createdby = u.userid
        LEFT JOIN membership mem ON t.teamid = mem.teamid
        LEFT JOIN task task ON t.teamid = task.teamid
        WHERE m.userid = $1
        GROUP BY t.teamid, t.teamname, t.createdby, m.role, u.firstname, u.lastname
        ORDER BY t.teamid DESC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch user teams: ${error.message}`);
    }
  },

  // Search teams
  async searchTeams(searchTerm, limit = 10, userId = null) {
    try {
      let query = `
        SELECT 
          t.teamid as teamid, 
          t.teamname as teamname,
          t.createdby as createdby,
          u.firstname as creatorfirstname,
          u.lastname as creatorlastname,
          COUNT(DISTINCT m.userid) as membercount
        FROM team t
        INNER JOIN "User" u ON t.createdby = u.userid
        LEFT JOIN membership m ON t.teamid = m.teamid
        WHERE 
          LOWER(t.teamname) LIKE LOWER($1) OR
          LOWER(CONCAT(u.firstname, ' ', u.lastname)) LIKE LOWER($1)
      `;

      let queryParams = [`%${searchTerm}%`];

      // If userId provided, only search teams user has access to
      if (userId) {
        query += ` AND EXISTS (
          SELECT 1 FROM membership mem 
          WHERE mem.teamid = t.teamid AND mem.userid = $2
        )`;
        queryParams.push(userId);
      }

      query += ` 
        GROUP BY t.teamid, t.teamname, t.createdby, u.firstname, u.lastname
        ORDER BY 
          CASE 
            WHEN LOWER(t.teamname) = LOWER($${queryParams.length + 1}) THEN 1
            WHEN LOWER(t.teamname) LIKE LOWER($1) THEN 2
            ELSE 3
          END,
          t.teamid DESC
        LIMIT $${queryParams.length + 2}
      `;

      queryParams.push(searchTerm, limit);

      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      throw new Error(`Team search failed: ${error.message}`);
    }
  },

  // Validation schemas
  validateTeamCreateData(data) {
    const schema = Joi.object({
      teamName: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Team name must be at least 2 characters long',
        'string.max': 'Team name cannot exceed 100 characters',
        'any.required': 'Team name is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateTeamUpdateData(data) {
    const schema = Joi.object({
      teamName: Joi.string().min(2).max(100).optional().messages({
        'string.min': 'Team name must be at least 2 characters long',
        'string.max': 'Team name cannot exceed 100 characters'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateAddMemberData(data) {
    const schema = Joi.object({
      userEmail: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'User email is required'
      }),
      role: Joi.string().valid('Admin', 'Member', 'Viewer').optional().default('Member').messages({
        'any.only': 'Role must be one of: Admin, Member, Viewer'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateUpdateRoleData(data) {
    const schema = Joi.object({
      newRole: Joi.string().valid('Admin', 'Member', 'Viewer').required().messages({
        'any.only': 'Role must be one of: Admin, Member, Viewer',
        'any.required': 'New role is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateTeamIdData(data) {
    const schema = Joi.object({
      teamId: Joi.number().integer().positive().required().messages({
        'number.base': 'Team ID must be a number',
        'number.integer': 'Team ID must be an integer',
        'number.positive': 'Team ID must be positive',
        'any.required': 'Team ID is required'
      })
    });

    return schema.validate(data, { abortEarly: false });
  },

  validateSearchData(data) {
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
      }),
      myTeams: Joi.string().valid('true', 'false').optional()
    });

    return schema.validate(data, { abortEarly: false });
  }
};

export default teamService;
