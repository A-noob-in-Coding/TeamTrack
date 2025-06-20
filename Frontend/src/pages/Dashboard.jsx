import React, { useEffect, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { toast } from 'react-hot-toast';
import { FiClipboard, FiClock, FiUsers } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../context/TeamsContext';
import { useTasks } from '../context/TasksContext';

const Dashboard = () => {
  // Remove local user, teams, tasks, loading, error state
  // Use context instead
  const { user, loading: userLoading } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();
  const { tasks, loading: tasksLoading } = useTasks();

  const allTasks = useMemo(() => Object.values(tasks).flat(), [tasks]);
  
  const userTasks = useMemo(() => {
    if (!user || !allTasks) return [];
    return allTasks.filter(task => String(task.assignedto) === String(user.userid));
  }, [user, allTasks]);

  const { totalTasks, completedTasks, pendingTasks } = useMemo(() => {
    const total = userTasks.length;
    const completed = userTasks.filter(t => t.status === 'Completed').length;
    const pending = total - completed;
    return { totalTasks: total, completedTasks: completed, pendingTasks: pending };
  }, [userTasks]);
  
  const teamTaskCounts = useMemo(() => {
    const counts = {};
    if (teams && allTasks) {
      teams.forEach(team => {
        const teamTasks = allTasks.filter(task => String(task.teamid) === String(team.teamid));
        counts[team.teamname] = teamTasks.length;
      });
    }
    return counts;
  }, [teams, allTasks]);

  const teamNames = useMemo(() => Object.keys(teamTaskCounts), [teamTaskCounts]);
  const taskData = useMemo(() => Object.values(teamTaskCounts), [teamTaskCounts]);

  // Compute stats from userTasks and teams
  const stats = React.useMemo(() => {
    const totalTasks = userTasks.length;
    const completed = userTasks.filter(t => t.status === 'Completed').length;
    const inProgress = userTasks.filter(t => t.status === 'In Progress').length;
    const overdue = userTasks.filter(t => {
      if (!t.duedate || t.status === 'Completed') return false;
      return new Date(t.duedate) < new Date();
    }).length;
    const todo = userTasks.filter(t => t.status === 'Todo' || t.status === 'Pending' || t.status === 'Not Started').length;
    const pending = totalTasks - completed;
    const teamsJoined = teams.length;
    return {
      totalTasks,
      completed,
      inProgress,
      overdue,
      todo,
      pending,
      teamsJoined
    };
  }, [userTasks, teams]);

  // Update charts when stats or teams change
  useEffect(() => {
    if (!stats) return;
    const pieChartDom = document.getElementById('task-distribution-chart');
    const barChartDom = document.getElementById('team-activity-chart');
    if (!pieChartDom || !barChartDom) return;

    const pieChart = echarts.init(pieChartDom);
    const barChart = echarts.init(barChartDom);

    // Task Distribution Chart: User's tasks only
    const taskDistData = [
      { value: completedTasks, name: 'Completed' },
      { value: pendingTasks, name: 'Pending' }
    ];

    // Team Activity Chart: Show all teams with their task counts
    let activityNames = teamNames;
    let activityCounts = taskData;
    if (activityNames.length === 0) {
      activityNames = ['No Data'];
      activityCounts = [0];
    }

    const pieOption = {
      tooltip: { trigger: 'item' },
      series: [{
        name: 'Task Status',
        type: 'pie',
        radius: '50%',
        data: taskDistData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };

    const barOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: activityNames },
      yAxis: { type: 'value' },
      series: [{
        name: 'Tasks',
        type: 'bar',
        data: activityCounts
      }]
    };

    pieChart.setOption(pieOption);
    barChart.setOption(barOption);

    // Handle resize
    const handleResize = () => {
      pieChart.resize();
      barChart.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      pieChart.dispose();
      barChart.dispose();
    };
  }, [user, teams, tasks, completedTasks, pendingTasks, teamNames, taskData]);

  // Conditional rendering for loading, error, or no user
  if (userLoading || teamsLoading || tasksLoading) {
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
            No dashboard data available.
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
          {/* Welcome section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome back, {user.firstname}!</h2>
            <p className="text-gray-600">Here's what's happening with your tasks and teams today.</p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
                  <FiClipboard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Tasks</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.totalTasks}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                  <FiClock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Pending Tasks</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.pending}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Teams Joined</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.teamsJoined}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Distribution</h3>
              <div id="task-distribution-chart" className="h-64"></div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Activity</h3>
              <div id="team-activity-chart" className="h-64"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 