import React from "react";

const Navbar = ({ onSearch }) => (
  <header className="bg-white shadow-sm">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
      <div className="flex items-center">
        <a href="#" className="flex items-center flex-shrink-0 cursor-pointer">
          <i className="fas fa-tasks text-indigo-600 text-2xl mr-2"></i>
          <span className="text-xl font-bold text-gray-900">TeamTrack</span>
        </a>
      </div>
      <div className="flex-1 max-w-xl mx-4 hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search tasks, teams, or members"
            onChange={e => onSearch && onSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center">
        <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer">
          <i className="fas fa-bell text-xl"></i>
        </button>
        <div className="ml-3 relative">
          <button className="flex text-sm rounded-full focus:outline-none cursor-pointer">
            <img
              className="h-8 w-8 rounded-full object-cover"
              src="https://readdy.ai/api/search-image?query=professional%2520headshot%2520portrait%2520of%2520a%2520young%2520business%2520person%2520with%2520confident%2520expression%252C%2520neutral%2520background%252C%2520high%2520quality%252C%2520detailed%2520facial%2520features%252C%2520professional%2520attire&width=100&height=100&seq=9&orientation=squarish"
              alt="User profile"
            />
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default Navbar; 