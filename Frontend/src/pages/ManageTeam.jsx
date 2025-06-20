import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useTeams } from '../context/TeamsContext';
import { AppLoadingContext } from '../context/AppLoadingContext.jsx';
import api from '../utils/api';

const ManageTeam = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    const getTeamDetails = async () => {
      setAppLoading(true);
      try {
        const res = await api.get(`/api/teams/${id}`);
        setTeam(res.data);
      } catch (err) {
        console.error("Failed to fetch team details", err);
      } finally {
        setAppLoading(false);
      }
    };

    if (id) {
      getTeamDetails();
    }
  }, [id, setAppLoading]);

  if (loading) return <div className="text-center text-gray-500 py-10">Loading team management...</div>;
  if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
  if (!team) return <div className="text-center text-gray-500 py-10">Team not found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Manage Team: {team.teamname}</h1>
      <div className="flex items-center space-x-6 text-gray-700">
        <span>👥 {team.memberCount || 0} members</span>
        <span>📝 {team.taskStats?.total || 0} tasks</span>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Members</h2>
        {team.members && team.members.length > 0 ? (
          <ul className="list-disc pl-6">
            {team.members.map(member => (
              <li key={member.userid}>
                {member.firstname} {member.lastname} <span className="text-xs text-gray-500">({member.role})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No members found.</p>
        )}
      </div>
      <div className="mt-8 text-gray-500">(This is a placeholder. Implement team management features here.)</div>
    </div>
  );
};

export default ManageTeam; 