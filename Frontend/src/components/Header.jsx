import React from 'react';
import { useLocation } from 'react-router-dom';

const getTitle = (pathname) => {
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/teams')) return 'Teams';
  if (pathname.startsWith('/tasks')) return 'Tasks';
  if (pathname.startsWith('/profile')) return 'Profile';
  return '';
};

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="relative flex items-center justify-center p-4">
        <h1 className="text-2xl font-semibold text-gray-800 absolute left-1/2 transform -translate-x-1/2">{title}</h1>
        <div className="absolute right-4">
          <button className="relative text-gray-500 hover:text-indigo-600 cursor-pointer">
            <span className="text-xl">🔔</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">3</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 