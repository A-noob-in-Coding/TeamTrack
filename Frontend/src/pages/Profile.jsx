import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, loading: userLoading, updateProfile, changePassword, refreshUser } = useAuth();
  const [editData, setEditData] = useState({ firstname: '', lastname: '', email: '', bio: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setEditData({
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        email: user.email || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
    setEditSuccess(false);
    setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(false);
    try {
      const result = await updateProfile(editData);
      if (!result.success) throw new Error(result.error || 'Failed to update profile');
      setEditSuccess(true);
      await refreshUser();
    } catch (err) {
      setEditError(err.message);
      toast.error(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handlePwChange = (e) => {
    setPwData({ ...pwData, [e.target.name]: e.target.value });
    setPwSuccess(false);
    setPwError(null);
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwError(null);
    setPwSuccess(false);
    if (!pwData.currentPassword || !pwData.newPassword || !pwData.confirmPassword) {
      setPwError('Please fill in all password fields.');
      setPwLoading(false);
      return;
    }
    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwError('New passwords do not match.');
      setPwLoading(false);
      return;
    }
    try {
      const result = await changePassword(pwData.currentPassword, pwData.newPassword, pwData.confirmPassword);
      if (!result.success) throw new Error(result.error || 'Failed to change password');
      setPwSuccess(true);
      setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated!');
    } catch (err) {
      setPwError(err.message);
      toast.error(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  // Check if any password field has a value
  const isPwChanged = pwData.currentPassword || pwData.newPassword || pwData.confirmPassword;

  if (userLoading) {
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
            No user profile found.
          </div>
        </div>
      </div>
    );
  }

  // Placeholder avatar: initials
  const initials = `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase();

  // Check if any profile field (except email) has changed
  const isProfileChanged =
    editData.firstname !== (user.firstname || '') ||
    editData.lastname !== (user.lastname || '') ||
    editData.bio !== (user.bio || '');

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profile header */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12 mb-4">
              <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-3xl font-bold text-indigo-700 object-cover">
                {initials || <span className="text-gray-400">?</span>}
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-4 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-800">{user.firstname} {user.lastname}</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Profile info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Profile Information</h3>
            </div>
            <div className="p-6">
              <form className="space-y-6" onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstname" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      id="firstname"
                      name="firstname"
                      value={editData.firstname}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      id="lastname"
                      name="lastname"
                      value={editData.lastname}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editData.email}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                    readOnly
                  />
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={editData.bio}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                {editError && <div className="text-red-500 text-sm">{editError}</div>}
                {editSuccess && <div className="text-green-600 text-sm">Profile updated successfully!</div>}
                <div>
                  <button
                    type="submit"
                    disabled={editLoading || !isProfileChanged}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Change password */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
            </div>
            <div className="p-6">
              <form className="space-y-6" onSubmit={handlePwSubmit}>
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={pwData.currentPassword}
                    onChange={handlePwChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={pwData.newPassword}
                      onChange={handlePwChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={pwData.confirmPassword}
                      onChange={handlePwChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                </div>
                {pwError && <div className="text-red-500 text-sm">{pwError}</div>}
                {pwSuccess && <div className="text-green-600 text-sm">Password updated successfully!</div>}
                <div>
                  <button
                    type="submit"
                    disabled={pwLoading || !isPwChanged}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 