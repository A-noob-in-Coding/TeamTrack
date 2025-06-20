import pool from '../Config/db.js';
import Joi from 'joi';

const roleOptions = ['Admin', 'Member', 'Viewer'];

const membershipService = {
  // Add a member to a team
  async addMember({ teamid, userEmail, role = 'Member' }, inviterId) {
    // Validate input
    const { error, value } = this.validateAddMemberData({ teamid, userEmail, role });
    if (error) throw new Error(error.details.map(d => d.message).join(', '));
    // Only Admins can add members
    const isAdmin = await this.isTeamAdmin(inviterId, value.teamid);
    if (!isAdmin) throw new Error('Only Admins can add members');
    // Find user by email
    const userRes = await pool.query('SELECT userid, firstname, lastname FROM "User" WHERE LOWER(email) = LOWER($1)', [value.userEmail]);
    if (!userRes.rows.length) throw new Error('User not found');
    const user = userRes.rows[0];
    // Check if already a member
    const exists = await pool.query('SELECT 1 FROM membership WHERE userid = $1 AND teamid = $2', [user.userid, value.teamid]);
    if (exists.rows.length) throw new Error('User is already a member');
    // Add member
    await pool.query('INSERT INTO membership (userid, teamid, role) VALUES ($1, $2, $3)', [user.userid, value.teamid, value.role]);
    return { userid: user.userid, firstname: user.firstname, lastname: user.lastname, role: value.role };
  },

  // Remove a member from a team
  async removeMember({ teamid, memberid }, removerId) {
    // Validate input
    const { error } = this.validateRemoveMemberData({ teamid, memberid });
    if (error) throw new Error(error.details.map(d => d.message).join(', '));
    // Only Admins can remove members
    const isAdmin = await this.isTeamAdmin(removerId, teamid);
    if (!isAdmin) throw new Error('Only Admins can remove members');
    // Cannot remove team creator
    const creatorRes = await pool.query('SELECT createdby FROM team WHERE teamid = $1', [teamid]);
    if (creatorRes.rows.length && creatorRes.rows[0].createdby === memberid) throw new Error('Cannot remove team creator');
    // Remove member
    const res = await pool.query('DELETE FROM membership WHERE userid = $1 AND teamid = $2 RETURNING userid', [memberid, teamid]);
    if (!res.rows.length) throw new Error('Member not found');
    return { userid: memberid };
  },

  // Update a member's role
  async updateMemberRole({ teamid, memberid, newRole }, updaterId) {
    // Validate input
    const { error } = this.validateUpdateRoleData({ teamid, memberid, newRole });
    if (error) throw new Error(error.details.map(d => d.message).join(', '));
    // Only Admins can update roles
    const isAdmin = await this.isTeamAdmin(updaterId, teamid);
    if (!isAdmin) throw new Error('Only Admins can update roles');
    // Cannot change team creator's role
    const creatorRes = await pool.query('SELECT createdby FROM team WHERE teamid = $1', [teamid]);
    if (creatorRes.rows.length && creatorRes.rows[0].createdby === memberid) throw new Error('Cannot change team creator role');
    // Update role
    const res = await pool.query('UPDATE membership SET role = $1 WHERE userid = $2 AND teamid = $3 RETURNING userid, role', [newRole, memberid, teamid]);
    if (!res.rows.length) throw new Error('Member not found');
    return res.rows[0];
  },

  // Get all members of a team
  async getTeamMembers(teamid, requesterId) {
    // Only team members can view
    const isMember = await this.isTeamMember(requesterId, teamid);
    if (!isMember) throw new Error('You are not a member of this team');
    const res = await pool.query(`
      SELECT m.userid, m.role, u.firstname, u.lastname, u.email
      FROM membership m
      INNER JOIN "User" u ON m.userid = u.userid
      WHERE m.teamid = $1
      ORDER BY CASE m.role WHEN 'Admin' THEN 1 WHEN 'Member' THEN 2 WHEN 'Viewer' THEN 3 END, u.firstname ASC
    `, [teamid]);
    return res.rows;
  },

  // Get all teams a user is a member of
  async getUserTeams(userid) {
    const res = await pool.query(`
      SELECT t.teamid, t.teamname, t.createdby, m.role
      FROM membership m
      INNER JOIN team t ON m.teamid = t.teamid
      WHERE m.userid = $1
      ORDER BY t.teamid DESC
    `, [userid]);
    return res.rows;
  },

  async getUserTeamsWithDetails(userid) {
    const res = await pool.query(`
      SELECT
        t.teamid,
        t.teamname,
        t.createdby,
        m.role,
        (SELECT COUNT(*) FROM membership WHERE teamid = t.teamid) AS "memberCount",
        (
          SELECT json_build_object(
            'total', COUNT(*),
            'completed', COUNT(CASE WHEN status = 'Completed' THEN 1 END)
          )
          FROM task
          WHERE teamid = t.teamid
        ) AS "taskStats",
        (
          SELECT json_agg(
            json_build_object(
              'userid', u.userid,
              'firstname', u.firstname,
              'lastname', u.lastname,
              'email', u.email,
              'role', mem.role
            ) ORDER BY CASE mem.role WHEN 'Admin' THEN 1 WHEN 'Member' THEN 2 ELSE 3 END, u.firstname
          )
          FROM membership mem
          JOIN "User" u ON u.userid = mem.userid
          WHERE mem.teamid = t.teamid
        ) AS members
      FROM membership m
      INNER JOIN team t ON m.teamid = t.teamid
      WHERE m.userid = $1
      ORDER BY t.teamid DESC
    `, [userid]);
    return res.rows;
  },

  async leaveTeam(teamid, userid) {
    const { error } = this.validateLeaveTeamData({ teamid, userid });
    if (error) throw new Error(error.details.map(d => d.message).join(', '));
    const creatorRes = await pool.query('SELECT createdby FROM team WHERE teamid = $1', [teamid]);
    if (creatorRes.rows.length && creatorRes.rows[0].createdby === userid) {
      throw new Error('Team creator cannot leave the team. Please delete the team instead.');
    }
    const res = await pool.query('DELETE FROM membership WHERE userid = $1 AND teamid = $2 RETURNING userid', [userid, teamid]);
    if (!res.rows.length) throw new Error('You are not a member of this team or the team does not exist.');
    return { userid };
  },

  // Helpers
  async isTeamAdmin(userid, teamid) {
    const res = await pool.query("SELECT 1 FROM membership WHERE userid = $1 AND teamid = $2 AND role = 'Admin'", [userid, teamid]);
    return !!res.rows.length;
  },
  async isTeamMember(userid, teamid) {
    const res = await pool.query('SELECT 1 FROM membership WHERE userid = $1 AND teamid = $2', [userid, teamid]);
    return !!res.rows.length;
  },

  // Validation
  validateAddMemberData(data) {
    const schema = Joi.object({
      teamid: Joi.number().integer().required(),
      userEmail: Joi.string().email().required(),
      role: Joi.string().valid(...roleOptions).optional().default('Member')
    });
    return schema.validate(data, { abortEarly: false });
  },
  validateRemoveMemberData(data) {
    const schema = Joi.object({
      teamid: Joi.number().integer().required(),
      memberid: Joi.number().integer().required()
    });
    return schema.validate(data, { abortEarly: false });
  },
  validateUpdateRoleData(data) {
    const schema = Joi.object({
      teamid: Joi.number().integer().required(),
      memberid: Joi.number().integer().required(),
      newRole: Joi.string().valid(...roleOptions).required()
    });
    return schema.validate(data, { abortEarly: false });
  },
  validateLeaveTeamData(data) {
    const schema = Joi.object({
      teamid: Joi.number().integer().required(),
      userid: Joi.number().integer().required()
    });
    return schema.validate(data, { abortEarly: false });
  }
};

export default membershipService;
