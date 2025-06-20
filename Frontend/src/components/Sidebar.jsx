import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiClipboard, FiUser, FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useSidebar();

  return (
    <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col h-full`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">{sidebarOpen ? 'TeamFlow' : 'TF'}</h1>
          <button 
            onClick={toggleSidebar} 
            className="text-gray-500 hover:text-indigo-600 cursor-pointer"
          >
            <span>{sidebarOpen ? <FiChevronLeft /> : <FiChevronRight />}</span>
          </button>
        </div>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-300" />
          {sidebarOpen && (
            <div>
              <h2 className="font-medium text-gray-800">{user ? `${user.firstname} ${user.lastname}` : '...'}</h2>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => `w-full flex items-center p-2 space-x-3 rounded-md ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'} cursor-pointer`}>
              <FiHome />
              {sidebarOpen && <span>Dashboard</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/teams" className={({ isActive }) => `w-full flex items-center p-2 space-x-3 rounded-md ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'} cursor-pointer`}>
              <FiUsers />
              {sidebarOpen && <span>Teams</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/tasks" className={({ isActive }) => `w-full flex items-center p-2 space-x-3 rounded-md ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'} cursor-pointer`}>
              <FiClipboard />
              {sidebarOpen && <span>Tasks</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={({ isActive }) => `w-full flex items-center p-2 space-x-3 rounded-md ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'} cursor-pointer`}>
              <FiUser />
              {sidebarOpen && <span>Profile</span>}
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={logout}
          className="w-full flex items-center p-2 space-x-3 rounded-md text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          <FiLogOut />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 