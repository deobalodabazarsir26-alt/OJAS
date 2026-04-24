import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { Office, Department, User, Advertisement, Application, OfficeUser } from '../types';
import { Building2, Users, FileText, Plus, ShieldCheck, X, Save, Settings, Clock, UserPlus, FilePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useConstants } from '../hooks/useConstants';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateForInput, translateConstant } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { hi, enIN } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface ActivityItem {
  id: string;
  type: 'application' | 'user' | 'advertisement';
  title: string;
  timestamp: string;
  reference?: string;
}

const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'hi' ? hi : enIN;
  const { DEPT_TYPE_OPTIONS } = useConstants();
  const navigate = useNavigate();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const [stats, setStats] = useState({
    offices: 0,
    departments: 0,
    users: 0,
    ads: 0,
    applications: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [deptForm, setDeptForm] = useState({
    Dept_Name: '',
    Dept_Type: 'State Govt.',
  });

  const [isCloudConnected, setIsCloudConnected] = useState(sheetService.isCloudConnected());

  const handleRetryConnection = () => {
    sheetService.retryConnection();
    setIsCloudConnected(true);
    fetchData();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [officesData, deptsData, usersData, adsData, applsData] = await Promise.all([
        sheetService.getAll<Office>('Office'),
        sheetService.getAll<Department>('Department'),
        sheetService.getAll<User>('User'),
        sheetService.getAll<Advertisement>('Advertisement'),
        sheetService.getAll<Application>('Application'),
      ]);
      setStats({
        offices: officesData.length,
        departments: deptsData.length,
        users: usersData.length,
        ads: adsData.length,
        applications: applsData.length,
      });
      setDepartments(deptsData);
      
      // Calculate Recent Activity
      const activities: ActivityItem[] = [];

      // Add recent applications (last 10)
      applsData.slice(-10).forEach(app => {
        if (app.T_STMP_ADD) {
          activities.push({
            id: `app-${app.Appl_ID}`,
            type: 'application',
            title: t('admin.new_appl_received', { id: app.Adv_ID }),
            timestamp: app.T_STMP_ADD
          });
        }
      });

      // Add recent users (last 10)
      usersData.slice(-10).forEach(u => {
        if (u.T_STMP_ADD) {
          activities.push({
            id: `user-${u.User_ID}`,
            type: 'user',
            title: t('admin.new_user_registered', { name: u.User_Name }),
            timestamp: u.T_STMP_ADD
          });
        }
      });

      // Add recent ads (last 10)
      adsData.slice(-10).forEach(ad => {
        if (ad.T_STMP_ADD) {
          activities.push({
            id: `ad-${ad.Adv_ID}`,
            type: 'advertisement',
            title: t('admin.new_ad_published', { title: ad.Title }),
            timestamp: ad.T_STMP_ADD
          });
        }
      });

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 10)); // Keep top 10

      setIsCloudConnected(sheetService.isCloudConnected());
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setIsCloudConnected(sheetService.isCloudConnected());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    startProgress(t('manage.add_new') + '...');
    try {
      updateProgress(30, t('common.processing'));
      const nextDeptId = await sheetService.getNextId('Department', 'Dept_ID');
      const newDept: Department = {
        Dept_ID: String(nextDeptId),
        Dept_Name: deptForm.Dept_Name,
        Dept_Type: deptForm.Dept_Type,
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };
      updateProgress(70, t('manage.saving_db', 'Saving to Database...'));
      await sheetService.insert('Department', newDept);
      updateProgress(100, t('manage.success_update'));
      setShowDeptModal(false);
      setDeptForm({ Dept_Name: '', Dept_Type: 'State Govt.' });
      fetchData();
    } catch (error) {
      toast.error(t('manage.error_update'));
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-hindi-support">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShieldCheck className="w-8 h-8 mr-3 text-blue-600" />
            {t('admin.title')}
          </h1>
          <p className="text-gray-600">{t('admin.subtitle')}</p>
        </div>
        <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${isCloudConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${isCloudConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
          {isCloudConnected ? t('admin.cloud_connected') : t('admin.cloud_offline')}
          {!isCloudConnected && (
            <button 
              onClick={handleRetryConnection}
              className="ml-3 underline hover:text-amber-900"
            >
              {t('admin.retry')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 font-hindi-support">
        {[
          { label: t('admin.stats.depts'), value: stats.departments, icon: Building2, color: 'bg-blue-500', path: '/admin/departments' },
          { label: t('admin.stats.offices'), value: stats.offices, icon: Building2, color: 'bg-indigo-500', path: '/admin/offices' },
          { label: t('admin.stats.users'), value: stats.users, icon: Users, color: 'bg-purple-500', path: '/admin/users' },
          { label: t('manage_applications.title'), value: stats.applications, icon: FileText, color: 'bg-green-500', path: '/admin/manage-applications' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => stat.path && navigate(stat.path)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-hindi-support">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('admin.quick_actions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/admin/departments')}
              className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <Building2 className="w-5 h-5 mr-3 text-blue-600" />
              <span className="font-medium">{t('admin.manage_depts')}</span>
            </button>
            <button 
              onClick={() => navigate('/admin/offices')}
              className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <Building2 className="w-5 h-5 mr-3 text-blue-600" />
              <span className="font-medium">{t('admin.manage_offices')}</span>
            </button>
            <button 
              onClick={() => navigate('/admin/constants')}
              className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <Settings className="w-5 h-5 mr-3 text-blue-600" />
              <span className="font-medium">{t('admin.manage_globals')}</span>
            </button>
            <button 
              onClick={() => navigate('/admin/users')}
              className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <Users className="w-5 h-5 mr-3 text-blue-600" />
              <span className="font-medium">{t('admin.manage_users')}</span>
            </button>
            <button 
              onClick={() => navigate('/admin/advertisements')}
              className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <FileText className="w-5 h-5 mr-3 text-blue-600" />
              <span className="font-medium">{t('admin.manage_ads')}</span>
            </button>
            <button 
              onClick={() => navigate('/admin/manage-applications')}
              className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <FilePlus className="w-5 h-5 mr-3 text-blue-600" />
              <span className="font-medium">{t('manage_applications.title')}</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('admin.recent_activity')}</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center text-sm text-gray-600 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className={`p-2 rounded-lg mr-3 ${
                    activity.type === 'application' ? 'bg-blue-50 text-blue-600' :
                    activity.type === 'user' ? 'bg-green-50 text-green-600' :
                    'bg-purple-50 text-purple-600'
                  }`}>
                    {activity.type === 'application' ? <FileText className="w-4 h-4" /> :
                     activity.type === 'user' ? <UserPlus className="w-4 h-4" /> :
                     <FilePlus className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>{t('common.no_data', 'No activity found')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Department Modal */}
      <AnimatePresence>
        {showDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{t('admin.add_dept')}</h3>
                <button onClick={() => setShowDeptModal(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddDept} className="p-6 space-y-4 font-hindi-support">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin.dept_name')}</label>
                  <input
                    type="text"
                    required
                    value={deptForm.Dept_Name}
                    onChange={e => setDeptForm({ ...deptForm, Dept_Name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin.dept_type')}</label>
                  <select
                    value={deptForm.Dept_Type}
                    onChange={e => setDeptForm({ ...deptForm, Dept_Type: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {DEPT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                  </select>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? t('common.processing') : <><Save className="w-4 h-4 mr-2" /> {t('admin.save_dept')}</>}
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

export default AdminDashboard;
