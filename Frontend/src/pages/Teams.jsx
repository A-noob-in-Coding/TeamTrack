import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiUsers, FiClipboard, FiSettings, FiLogOut, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../context/TeamsContext';
import { useTasks } from '../context/TasksContext';

const Teams = () => {
  const { user, loading: userLoading } = useAuth();
  const {
    teams,
    teamDetails,
    loading: teamsLoading,
    fetchTeamDetails,
    addTeamMember,
    removeTeamMember,
    leaveTeam
  } = useTeams();
  const { createTask, fetchTeamTasks } = useTasks();

  const [manageOpen, setManageOpen] = useState(null); // teamid or null
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('Member');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [removeMemberLoading, setRemoveMemberLoading] = useState({}); // userid -> bool
  const [leaveLoading, setLeaveLoading] = useState({}); // teamid -> bool
  
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    duedate: '',
    assignedto: ''
  });

  useEffect(() => {
    if (manageOpen) {
      fetchTeamTasks(manageOpen);
    }
  }, [manageOpen, fetchTeamTasks]);

  // Loading state: show spinner or message
  if (userLoading || teamsLoading) {
    return <div className="flex justify-center items-center h-screen text-lg text-gray-500">Loading teams...</div>;
  }

  // Modal close handler
  const closeManageModal = () => {
    setManageOpen(null);
    setAddMemberEmail('');
    setAddMemberRole('Member');
    setNewTask({ title: '', description: '', duedate: '', assignedto: '' });
  };

  // Add member handler
  const handleAddMember = async (teamid) => {
    setAddMemberLoading(true);
    try {
      const result = await addTeamMember(teamid, addMemberEmail, addMemberRole);
      if (!result.success) throw new Error(result.error || 'Failed to add member');
      toast.success('Member added!');
      setAddMemberEmail('');
      setAddMemberRole('Member');
      await fetchTeamDetails(teamid);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddMemberLoading(false);
    }
  };

  // Remove member handler
  const handleRemoveMember = async (teamid, userid) => {
    setRemoveMemberLoading(prev => ({ ...prev, [userid]: true }));
    try {
      const result = await removeTeamMember(teamid, userid);
      if (!result.success) throw new Error(result.error || 'Failed to remove member');
      toast.success('Member removed!');
      await fetchTeamDetails(teamid);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemoveMemberLoading(prev => ({ ...prev, [userid]: false }));
    }
  };

  // Leave team handler
  const handleLeaveTeam = async (teamid) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    setLeaveLoading(prev => ({ ...prev, [teamid]: true }));
    try {
      const result = await leaveTeam(teamid);
      if (!result.success) throw new Error(result.error || 'Failed to leave team');
      toast.success('You have left the team.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLeaveLoading(prev => ({ ...prev, [teamid]: false }));
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) {
      toast.error('Task title is required.');
      return;
    }
    if (newTask.duedate) {
      const selectedDate = new Date(newTask.duedate);
      const timezoneOffset = selectedDate.getTimezoneOffset() * 60000;
      const localSelectedDate = new Date(selectedDate.getTime() + timezoneOffset);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (localSelectedDate < today) {
        toast.error('Due date cannot be in the past.');
        return;
      }
    }
    setCreateTaskLoading(true);
    try {
      const result = await createTask(manageOpen, newTask);
      if (result.success) {
        toast.success('Task created successfully!');
        setNewTask({ title: '', description: '', duedate: '', assignedto: '' });
        // Optionally, refresh team details to update task count
        await fetchTeamDetails(manageOpen);
      } else {
        throw new Error(result.error || 'Failed to create task');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreateTaskLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8 flex items-center justify-center">
          No user profile found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="space-y-6">
          {/* Teams grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => {
              const details = teamDetails[team.teamid];
              const userRole = details?.members?.find(m => m.userid === user.userid)?.role || team.role;

              return (
                <div
                  key={team.teamid}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 flex flex-col min-h-[300px]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">{team.teamname || team.name}</h3>
                    {userRole === 'Admin' && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">Admin</span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm mb-4">
                    <div className="flex items-center mr-4">
                      <FiUsers />
                      <span className="ml-2">
                        {details ? `${details.memberCount || (details.members ? details.members.length : 0)} members` : <span className="text-gray-300">Loading...</span>}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <FiClipboard />
                      <span className="ml-2">
                        {details ? `${details.taskStats?.total || 0} tasks` : <span className="text-gray-300">Loading...</span>}
                      </span>
                    </div>
                  </div>
                  {/* Members preview */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-2">Members</h4>
                    {details && details.members && details.members.length > 0 ? (
                      <div className="space-y-1">
                        {details.members.slice(0, 3).map(member => (
                          <div key={member.userid} className="text-sm text-gray-700">
                            {member.firstname} {member.lastname} <span className="text-xs text-gray-500">({member.role})</span>
                          </div>
                        ))}
                        {details.members.length > 3 && (
                          <div className="text-xs text-gray-500">+{details.members.length - 3} more</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-sm">{details ? 'No members found.' : 'Loading...'}</span>
                    )}
                  </div>
                  {/* Action buttons aligned bottom */}
                  <div className="mt-auto flex justify-end">
                    {userRole === 'Admin' ? (
                      <button
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                        onClick={() => setManageOpen(team.teamid)}
                      >
                        <FiSettings /> Manage
                      </button>
                    ) : (
                      <button
                        className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-300 hover:border-red-400 transition-colors disabled:opacity-50"
                        disabled={leaveLoading[team.teamid]}
                        onClick={() => handleLeaveTeam(team.teamid)}
                      >
                        {leaveLoading[team.teamid] ? 'Leaving...' : <><FiLogOut /> Leave</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {teams.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-8">You are not a member of any teams.</div>
            )}
          </div>

          {/* Manage Team Modal */}
          {manageOpen && (() => {
            const managingTeam = teams.find(t => t.teamid === manageOpen);
            const managingDetails = teamDetails[manageOpen];
            const isCreator = managingDetails?.members?.find(m => m.userid === user?.userid && m.role === 'Admin' && managingDetails.createdby === user?.userid);

            if (!managingTeam) return null; // Don't render modal if team is gone

            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-800">
                        Manage Team: {managingTeam.teamname || managingTeam.name}
                      </h2>
                      <button
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                        onClick={closeManageModal}
                      >
                        <FiX />
                      </button>
                    </div>
                    {/* Add Member Form */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-medium mb-4">Add New Member</h3>
                      <form
                        onSubmit={e => { e.preventDefault(); handleAddMember(manageOpen); }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="Enter member's email"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={addMemberEmail}
                              onChange={e => setAddMemberEmail(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Role
                            </label>
                            <select
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={addMemberRole}
                              onChange={e => setAddMemberRole(e.target.value)}
                            >
                              <option value="Member">Member</option>
                              <option value="Viewer">Viewer</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={addMemberLoading}
                          >
                            {addMemberLoading ? 'Adding...' : <><FiPlus /> Add Member</>}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Create Task Form */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-medium mb-4">Create & Assign Task</h3>
                      <form onSubmit={handleCreateTask} className="space-y-4">
                        {/* Task Title */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Task Title
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter task title"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                          />
                        </div>
                        {/* Task Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (Optional)
                          </label>
                          <textarea
                            placeholder="Enter task description"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={newTask.description}
                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Due Date */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Due Date (Optional)
                            </label>
                            <input
                              type="date"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={newTask.duedate}
                              onChange={e => setNewTask({ ...newTask, duedate: e.target.value })}
                            />
                          </div>
                          {/* Assign to Member */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Assign To (Optional)
                            </label>
                            <select
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={newTask.assignedto}
                              onChange={e => setNewTask({ ...newTask, assignedto: e.target.value })}
                              disabled={!managingDetails || !managingDetails.members || managingDetails.members.length === 0}
                            >
                              <option value="">Unassigned</option>
                              {managingDetails && managingDetails.members && managingDetails.members.map(member => (
                                <option key={member.userid} value={member.userid}>
                                  {member.firstname} {member.lastname}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={createTaskLoading}
                          >
                            {createTaskLoading ? 'Creating...' : <><FiPlus /> Create Task</>}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Current Members */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Current Members</h3>
                      {managingDetails && managingDetails.members && managingDetails.members.length > 0 ? (
                        <div className="space-y-3">
                          {managingDetails.members.map(member => (
                            <div key={member.userid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium text-gray-800">
                                  {member.firstname} {member.lastname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.email} • {member.role}
                                </div>
                              </div>
                              {member.userid !== user.userid && (!isCreator || member.userid !== managingDetails.createdby) && (
                                <button
                                  className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-300 hover:border-red-400 disabled:opacity-50"
                                  disabled={removeMemberLoading[member.userid]}
                                  onClick={() => handleRemoveMember(manageOpen, member.userid)}
                                >
                                  {removeMemberLoading[member.userid] ? 'Removing...' : <><FiTrash2 /> Remove</>}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-center py-4">
                          {managingDetails ? 'No members found.' : 'Loading members...'}
                        </div>
                      )}
                    </div>
                    {/* Modal Actions */}
                    <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                      <button
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                        onClick={closeManageModal}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  );
};

export default Teams;