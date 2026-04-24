import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { User, Application } from '../types';
import { Users, Search, Filter, Trash2, Key, ShieldCheck, ArrowLeft, Mail, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const ManageUsers: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await sheetService.getAll<User>('User');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const userId = selectedUser.User_ID;
    setShowDeleteModal(false);
    startProgress('Checking for user activity...');
    try {
      // Check if user has applications (for applicants)
      if (selectedUser.User_Type === 'applicant') {
        const allAppls = await sheetService.getAll<Application>('Application');
        const hasApplications = allAppls.some(a => String(a.User_ID).trim() === String(userId).trim());
        if (hasApplications) {
          toast.error(t('manage.err_delete_user_has_appls'));
          return;
        }
      }

      // Check if user is linked to an office (for office users)
      if (selectedUser.User_Type === 'office') {
        const allOfficeUsers = await sheetService.getAll<any>('Office_User');
        const isLinked = allOfficeUsers.some((ou: any) => String(ou.User_ID).trim() === String(userId).trim());
        if (isLinked) {
          toast.error(t('manage.err_delete_user_is_officer'));
          return;
        }
      }

      startProgress('Deleting user...');
      await sheetService.delete('User', 'User_ID', userId);
      // Update local state immediately for better UX
      setUsers(prev => prev.filter(user => String(user.User_ID) !== String(userId)));
      // Optional: Refresh from server after a delay to ensure sync
      setTimeout(() => fetchUsers(), 3000);
    } catch (error) {
      toast.error(t('manage.error_delete'));
    } finally {
      setSelectedUser(null);
      stopProgress();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    startProgress('Updating password...');
    try {
      const updatedUser = {
        ...selectedUser,
        Password: newPassword,
        T_STMP_UPD: new Date().toISOString(),
      };
      await sheetService.update('User', 'User_ID', selectedUser.User_ID, updatedUser);
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
      await fetchUsers();
      toast.error(t('manage.success_update'));
    } catch (error) {
      toast.error(t('manage.error_update'));
    } finally {
      stopProgress();
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.User_Name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || user.User_Type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-2 font-hindi-support"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('manage.back_to_dashboard')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center font-hindi-support">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            {t('manage.user_management')}
          </h1>
          <p className="text-gray-600 font-hindi-support">{t('manage.admin_control')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('manage.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-hindi-support"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-hindi-support"
            >
              <option value="all">{t('manage.all_types')}</option>
              <option value="admin">{t('manage.role_admin')}</option>
              <option value="office">{t('manage.role_office')}</option>
              <option value="applicant">{t('manage.role_applicant')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-hindi-support">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold uppercase">{t('manage.username')}</th>
                <th className="px-6 py-4 font-semibold uppercase">{t('manage.category')}</th>
                <th className="px-6 py-4 font-semibold uppercase">{t('dashboard.status')}</th>
                <th className="px-6 py-4 font-semibold text-right uppercase">{t('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user, index) => (
                <tr key={`${user.User_ID}-${index}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                        <UserCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{user.User_Name}</div>
                        <div className="text-xs text-gray-500">{t('manage.id')}: {user.User_ID}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.User_Type === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.User_Type === 'office' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {t(`manage.role_${user.User_Type}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.T_STMP_ADD).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPasswordModal(true);
                      }}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Reset Password"
                    >
                      <Key className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 bg-red-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{t('manage.confirm_delete')}</h3>
              </div>
              <div className="p-6 font-hindi-support">
                <p className="text-gray-600 mb-6">
                  {t('manage.delete_user_confirm', 'Are you sure you want to delete user')} <strong>{selectedUser?.User_Name}</strong>? {t('manage.action_cannot_be_undone', 'This action cannot be undone.')}
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    {t('dashboard.cancel')}
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
                  >
                    {t('manage.delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{t('manage.reset_password')}</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-white hover:text-gray-200">
                  <ArrowLeft className="w-6 h-6 rotate-90" />
                </button>
              </div>
              <form onSubmit={handleResetPassword} className="p-6 space-y-4 font-hindi-support">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('signup.username', 'User')}</label>
                  <div className="mt-1 font-medium text-gray-900">{selectedUser?.User_Name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('manage.new_password')}</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder={t('manage.new_password')}
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-amber-600 text-white py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors flex items-center justify-center"
                  >
                    {t('manage.update_password')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageUsers;
