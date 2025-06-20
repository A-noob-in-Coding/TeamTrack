import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiList, FiLayout, FiPlayCircle, FiCheckCircle } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import { useTasks } from '../context/TasksContext';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../context/TeamsContext';

const Tasks = () => {
  const [taskView, setTaskView] = useState('list');
  const [taskFilter, setTaskFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const { tasks, updateTaskStatus: contextUpdateTaskStatus, loading } = useTasks();
  const { user } = useAuth();
  const { teams } = useTeams();

  // Flatten all tasks for the user
  const allTasks = Object.values(tasks).flat();

  // Only show tasks assigned to the logged-in user
  const userTasks = allTasks.filter(t => String(t.assignedto) === String(user?.userid));

  // Add team name to each task
  const userTasksWithTeam = userTasks.map(task => {
    const team = teams.find(tm => String(tm.teamid) === String(task.teamid));
    return { ...task, teamname: team ? team.teamname : '' };
  });

  // Filter tasks by status if needed
  const filteredTasks = userTasksWithTeam.filter(task => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'completed') return task.status === 'Completed';
    if (taskFilter === 'pending') return task.status === 'Pending' || task.status === 'Todo' || task.status === 'Not Started' || task.status === 'In Progress';
    return true;
  });

  // Handler to update task status (uses context)
  const updateTaskStatus = async (taskid, teamid, newStatus) => {
    setActionLoading(prev => ({ ...prev, [taskid]: true }));
    try {
      await contextUpdateTaskStatus(taskid, teamid, newStatus);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [taskid]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex justify-center items-center h-full">
            No user profile found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="space-y-6">
          {/* Task view controls */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTaskView('list')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  taskView === 'list'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                } cursor-pointer`}
              >
                <FiList className="mr-2" /> List View
              </button>
              <button
                onClick={() => setTaskView('board')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  taskView === 'board'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                } cursor-pointer`}
              >
                <FiLayout className="mr-2" /> Board View
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                className="bg-gray-100 border-none text-gray-700 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Tasks</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending/In Progress</option>
              </select>
            </div>
          </div>

          {/* Task list */}
          {taskView === 'list' && (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map((task) => (
                    <tr key={task.taskid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{task.duedate ? task.duedate.slice(0, 10) : 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.status === 'In Progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : task.status === 'Pending' || task.status === 'Todo' || task.status === 'Not Started'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.teamname || ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.firstname} {user.lastname}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* Actions: Start or Complete */}
                        {['Todo', 'Pending', 'Not Started'].includes(task.status) && (
                          <button
                            className="flex items-center gap-1 text-green-600 hover:text-green-900 mr-3 cursor-pointer disabled:opacity-50"
                            disabled={actionLoading[task.taskid]}
                            title="Start Task"
                            onClick={() => updateTaskStatus(task.taskid, task.teamid, 'In Progress')}
                          >
                            <FiPlayCircle /> Start
                          </button>
                        )}
                        {task.status === 'In Progress' && (
                          <button
                            className="flex items-center gap-1 text-green-600 hover:text-green-900 mr-3 cursor-pointer disabled:opacity-50"
                            disabled={actionLoading[task.taskid]}
                            title="Complete Task"
                            onClick={() => updateTaskStatus(task.taskid, task.teamid, 'Completed')}
                          >
                            <FiCheckCircle /> Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Board view */}
          {taskView === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Todo column */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Todo</h3>
                <div className="space-y-4">
                  {filteredTasks
                    .filter(task => ['Todo', 'Pending', 'Not Started'].includes(task.status))
                    .map(task => (
                      <div key={task.taskid} className="bg-gray-50 p-4 rounded-lg shadow flex flex-col gap-2">
                        <h4 className="font-medium text-gray-900 text-base">{task.title}</h4>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>Due: {task.duedate ? task.duedate.slice(0, 10) : 'N/A'}</span>
                          <span>Team: {task.teamname || ''}</span>
                          <span>Assignee: {user.firstname} {user.lastname}</span>
                        </div>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 w-max">{task.status}</span>
                        <div className="flex justify-end">
                          <button
                            className="flex items-center gap-1 mt-2 text-sm text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                            disabled={actionLoading[task.taskid]}
                            onClick={() => updateTaskStatus(task.taskid, task.teamid, 'In Progress')}
                          >
                            <FiPlayCircle /> Start
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* In Progress column */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">In Progress</h3>
                <div className="space-y-4">
                  {filteredTasks
                    .filter(task => task.status === 'In Progress')
                    .map(task => (
                      <div key={task.taskid} className="bg-gray-50 p-4 rounded-lg shadow flex flex-col gap-2">
                        <h4 className="font-medium text-gray-900 text-base">{task.title}</h4>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>Due: {task.duedate ? task.duedate.slice(0, 10) : 'N/A'}</span>
                          <span>Team: {task.teamname || ''}</span>
                          <span>Assignee: {user.firstname} {user.lastname}</span>
                        </div>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 w-max">{task.status}</span>
                        <div className="flex justify-end">
                          <button
                            className="flex items-center gap-1 mt-2 text-sm text-green-600 hover:text-green-900 disabled:opacity-50"
                            disabled={actionLoading[task.taskid]}
                            onClick={() => updateTaskStatus(task.taskid, task.teamid, 'Completed')}
                          >
                            <FiCheckCircle /> Complete
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Completed column */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Completed</h3>
                <div className="space-y-4">
                  {filteredTasks
                    .filter(task => task.status === 'Completed')
                    .map(task => (
                      <div key={task.taskid} className="bg-gray-50 p-4 rounded-lg shadow flex flex-col gap-2">
                        <h4 className="font-medium text-gray-900 text-base">{task.title}</h4>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>Due: {task.duedate ? task.duedate.slice(0, 10) : 'N/A'}</span>
                          <span>Team: {task.teamname || ''}</span>
                          <span>Assignee: {user.firstname} {user.lastname}</span>
                        </div>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 w-max">{task.status}</span>
                        <div className="flex justify-end">
                          <span className="mt-2 text-xs text-green-700 font-semibold">Completed</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tasks; 