import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import AppLoadingContext from './AppLoadingContext';
import api from '../utils/api';

export const TeamsContext = createContext(null);

export const useTeams = () => useContext(TeamsContext);

export const TeamsProvider = ({ children }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [teamDetails, setTeamDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const { setAppLoading } = useContext(AppLoadingContext);

  const fetchAllTeamsAndDetails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/api/teams?myTeams=true');
      setTeams(res.data);

      if (res.data.length > 0) {
        const detailsPromises = res.data.map(team =>
          api.get(`/api/teams/${team.teamid}`).then(res => res.data)
        );
        const detailsResults = await Promise.allSettled(detailsPromises);
        
        const newDetails = {};
        detailsResults.forEach((result, index) => {
          const currentTeam = res.data[index];
          if (result.status === 'fulfilled' && result.value.success && result.value.data) {
            newDetails[currentTeam.teamid] = result.value.data;
          } else {
            toast.error(`Could not load details for team ${currentTeam.teamname || currentTeam.teamid}`);
            newDetails[currentTeam.teamid] = { members: [], memberCount: 0, taskStats: { total: 0 } };
          }
        });
        setTeamDetails(prev => ({ ...prev, ...newDetails }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch teams');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllTeamsAndDetails();
  }, [fetchAllTeamsAndDetails]);

  const fetchTeamDetails = useCallback(async (teamid) => {
    if (!user) return;
    setAppLoading(true);
    try {
      const res = await api.get(`/api/teams/${teamid}`);
      setTeamDetails(prev => ({ ...prev, [teamid]: res.data }));
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch team details');
    } finally {
      setAppLoading(false);
    }
  }, [user, setAppLoading]);

  const addTeamMember = async (teamid, userEmail, role) => {
    try {
      const res = await api.post(`/api/membership/add`, { teamId: teamid, userEmail, role });
      toast.success(res.data.message);
      await fetchTeamDetails(teamid);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to add member' };
    }
  };

  const removeTeamMember = async (teamid, userid) => {
    try {
      const res = await api.delete(`/api/membership/remove`, { data: { teamId: teamid, userId: userid } });
      toast.success(res.data.message);
      await fetchTeamDetails(teamid);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to remove member' };
    }
  };

  const leaveTeam = async (teamid) => {
    try {
      const res = await api.post(`/api/membership/leave/${teamid}`);
      toast.success(res.data.message);
      await fetchAllTeamsAndDetails();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to leave team' };
    }
  };

  const value = {
    teams,
    teamDetails,
    loading,
    setTeams,
    fetchAllTeamsAndDetails,
    fetchTeamDetails,
    addTeamMember,
    removeTeamMember,
    leaveTeam,
  };

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
};

export default TeamsContext;