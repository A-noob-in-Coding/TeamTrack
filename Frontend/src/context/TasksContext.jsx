import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { useTeams } from './TeamsContext';
import api from '../utils/api';

export const TasksContext = createContext(null);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};

export const TasksProvider = ({ children }) => {
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { teams } = useTeams();

  const fetchTasksForTeam = useCallback(async (teamId) => {
    if (!user) return;
    try {
      const res = await api.get(`/api/tasks?teamid=${teamId}`);
      setTasks(prev => ({ ...prev, [teamId]: res.data }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch tasks');
      setTasks(prev => ({ ...prev, [teamId]: [] })); // Set empty on error
    }
  }, [user]);

  useEffect(() => {
    if (user && teams && teams.length > 0) {
      teams.forEach(team => {
        if (!tasks[team.teamid]) { // Fetch only if not already fetched
          fetchTasksForTeam(team.teamid);
        }
      });
    } else {
      setTasks({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, teams, fetchTasksForTeam]);

  const createTask = async (taskData) => {
    try {
      const res = await api.post('/api/tasks', taskData);
      toast.success('Task created successfully!');
      fetchTasksForTeam(taskData.teamid); // Refresh tasks for the team
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
      throw new Error('Failed to create task');
    }
  };

  const updateTask = async (taskId, taskData) => {
    try {
      const res = await api.put(`/api/tasks/${taskId}`, taskData);
      toast.success('Task updated successfully!');
      fetchTasksForTeam(taskData.teamid); // Refresh tasks for the team
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const deleteTask = async (taskId, teamId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      toast.success('Task deleted successfully!');
      fetchTasksForTeam(teamId); // Refresh tasks for the team
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const assignTask = async (taskId, userId, teamId) => {
    try {
      await api.put(`/api/tasks/${taskId}/assign`, { userId });
      toast.success('Task assigned successfully!');
      fetchTasksForTeam(teamId); // Refresh tasks for the team
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    }
  };

  const updateTaskStatus = async (taskId, status, teamId) => {
    try {
      await api.put(`/api/tasks/${taskId}/status`, { status });
      toast.success('Task status updated!');
      fetchTasksForTeam(teamId); // Refresh tasks for the team
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const value = {
    tasks,
    loading,
    fetchAllTasksForTeams: fetchTasksForTeam,
    fetchTeamTasks: fetchTasksForTeam,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    updateTaskStatus,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};

export default TasksContext; 