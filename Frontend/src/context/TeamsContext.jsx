import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const TeamsContext = createContext(null);

export const useTeams = () => useContext(TeamsContext);

export const TeamsProvider = ({ children }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [teamDetails, setTeamDetails] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchAllTeamsAndDetails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch only the teams the user is a member of
      const teamsRes = await fetch('/api/teams?myTeams=true');
      if (!teamsRes.ok) throw new Error('Failed to fetch teams');

      const teamsResponse = await teamsRes.json();
      if (!teamsResponse.success || !teamsResponse.data) {
        throw new Error(teamsResponse.message || 'Could not process teams data');
      }
      
      const userTeams = teamsResponse.data;
      setTeams(userTeams);

      if (userTeams.length > 0) {
        // Fetch details for each team
        const detailsPromises = userTeams.map(team =>
          fetch(`/api/teams/${team.teamid}`).then(res => res.ok ? res.json() : Promise.reject(`Failed for team ${team.teamid}`))
        );
        const detailsResults = await Promise.allSettled(detailsPromises);
        
        const newDetails = {};
        detailsResults.forEach((result, index) => {
          const currentTeam = userTeams[index];
          if (result.status === 'fulfilled' && result.value.success && result.value.data) {
            newDetails[currentTeam.teamid] = result.value.data;
          } else {
            toast.error(`Could not load details for team ${currentTeam.teamname || currentTeam.teamid}`);
            // Provide a fallback structure to prevent UI crashes
            newDetails[currentTeam.teamid] = { members: [], memberCount: 0, taskStats: { total: 0 } };
          }
        });
        setTeamDetails(prev => ({ ...prev, ...newDetails }));
      }
    } catch (err) {
      toast.error(err.message);
      setTeams([]); // Clear teams on error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllTeamsAndDetails();
  }, [fetchAllTeamsAndDetails]);

  const fetchTeamDetails = useCallback(async (teamid) => {
    try {
      const res = await fetch(`/api/teams/${teamid}`);
      if (!res.ok) throw new Error('Could not fetch team details');
      const data = await res.json();
      setTeamDetails(prev => ({ ...prev, [teamid]: data }));
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  const addTeamMember = async (teamid, userEmail, role) => {
    try {
      const res = await fetch(`/api/membership/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamid, userEmail, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      await fetchTeamDetails(teamid);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeTeamMember = async (teamid, userid) => {
    try {
      const res = await fetch(`/api/membership/remove`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamid, userId: userid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      await fetchTeamDetails(teamid); // Refresh details
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const leaveTeam = async (teamid) => {
    try {
      const res = await fetch(`/api/membership/leave/${teamid}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to leave team');
      
      // Refetch all teams
      await fetchAllTeamsAndDetails();
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
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