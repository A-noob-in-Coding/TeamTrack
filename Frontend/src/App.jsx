import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import TeamDetails from './pages/TeamDetails';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import { useAppLoading } from './context/AppLoadingContext';
import { TeamsProvider } from './context/TeamsContext.jsx';
import { TasksProvider } from './context/TasksContext.jsx';
import { SidebarProvider } from './context/SidebarContext.jsx';

function App() {
  const { LoadingBar } = useAppLoading();

  return (
    <>
      <LoadingBar />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes with data providers */}
        <Route element={
          <TeamsProvider>
            <TasksProvider>
              <SidebarProvider>
                <ProtectedRoute />
              </SidebarProvider>
            </TasksProvider>
          </TeamsProvider>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamId" element={<TeamDetails />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Routes>
    </>
  );
}

export default App; 