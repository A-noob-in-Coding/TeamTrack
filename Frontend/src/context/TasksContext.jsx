import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { useTeams } from './TeamsContext';

const TasksContext = createContext(null);

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

  useEffect(() => {
    if (user && teams && teams.length > 0) {
      fetchAllTasksForTeams(teams);
    } else {
      setTasks({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, teams]);

  const fetchAllTasksForTeams = useCallback(async (teams) => {
    if (!user || !teams || teams.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        teams.map(async (team) => {
          try {
            const res = await fetch(`http://localhost:5000/api/tasks?teamid=${team.teamid}`, {
              credentials: 'include',
            });
            if (!res.ok) return { teamid: team.teamid, data: [] };
            const data = await res.json();
            if (!data.success) return { teamid: team.teamid, data: [] };
            return { teamid: team.teamid, data: data.data || [] };
          } catch {
            return { teamid: team.teamid, data: [] };
          }
        })
      );
      const tasksObj = {};
      results.forEach(({ teamid, data }) => {
        tasksObj[teamid] = data;
      });
      setTasks(tasksObj);
    } catch (err) {
      toast.error('Failed to fetch all tasks');
      setTasks({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTeamTasks = useCallback(async (teamId) => {
    if (!user || !teamId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/tasks?teamid=${teamId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        // If 404 or any error, treat as no tasks for this team
        setTasks(prev => ({ ...prev, [teamId]: [] }));
        return [];
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch tasks');
      setTasks(prev => ({ ...prev, [teamId]: data.data || [] }));
      return data.data;
    } catch (err) {
      toast.error(err.message);
      setTasks(prev => ({ ...prev, [teamId]: [] }));
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createTask = async (teamid, taskData) => {
    try {
      const res = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...taskData, teamid }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create task');
      await fetchTeamTasks(teamid);
      toast.success('Task created successfully!');
      return { success: true, task: data.data };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateTask = async (taskId, teamId, updates) => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update task');
      await fetchTeamTasks(teamId);
      toast.success('Task updated successfully!');
      return { success: true, task: data.data };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteTask = async (taskId, teamId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete task');
      setTasks(prev => ({
        ...prev,
        [teamId]: prev[teamId].filter(task => task.taskid !== taskId)
      }));
      toast.success('Task deleted successfully!');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  const assignTask = async (taskId, teamId, userId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to assign task');
      await fetchTeamTasks(teamId);
      toast.success('Task assigned successfully!');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateTaskStatus = async (taskId, teamId, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update task status');
      await fetchTeamTasks(teamId);
      toast.success('Task status updated successfully!');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  };

  const value = {
    tasks,
    loading,
    fetchAllTasksForTeams,
    fetchTeamTasks,
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