import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { GlobalConstant } from '../types';
import { Settings, Plus, Trash2, Edit, Save, X, Search, Filter, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { translateConstant } from '../lib/utils';

const CATEGORIES = [
  'GENDER',
  'DOB_PROOF',
  'ID_PROOF',
  'YES_NO',
  'CASTE_CATEGORY',
  'LOCALITY',
  'QUALIFICATION_TYPE',
  'POST_TYPE',
  'SERVICE_TYPE',
  'CLASS',
  'DEPT_TYPE',
  'RESULT_STATUS',
  'MARKS_TYPE',
  'EMPLOYER_TYPE',
  'EMPLOYMENT_TYPE'
];

const ManageConstants: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const [constants, setConstants] = useState<GlobalConstant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedConstantId, setSelectedConstantId] = useState<string | null>(null);
  const [newConstant, setNewConstant] = useState({ Category: CATEGORIES[0], Value: '' });
  const [editingConstant, setEditingConstant] = useState<GlobalConstant | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await sheetService.getAll<GlobalConstant>('Global_Constants');
      setConstants(data);
    } catch (error) {
      console.error('Error fetching constants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefaults = async () => {
    setShowResetModal(false);
    startProgress('Resetting to defaults...');
    try {
      const defaultConstants = [
        { Category: 'GENDER', Value: 'Male' },
        { Category: 'GENDER', Value: 'Female' },
        { Category: 'GENDER', Value: 'Other' },
        { Category: 'DOB_PROOF', Value: '10th marksheet' },
        { Category: 'DOB_PROOF', Value: '12th marksheet' },
        { Category: 'DOB_PROOF', Value: 'Birth Certificate' },
        { Category: 'ID_PROOF', Value: 'Aadhar Card' },
        { Category: 'ID_PROOF', Value: 'PAN Card' },
        { Category: 'ID_PROOF', Value: 'Voter ID Card' },
        { Category: 'ID_PROOF', Value: 'Passport' },
        { Category: 'ID_PROOF', Value: 'Driving License' },
        { Category: 'ID_PROOF', Value: 'Smart Card by RGI' },
        { Category: 'ID_PROOF', Value: 'ID Card issued by Employer' },
        { Category: 'ID_PROOF', Value: 'Health Smart Card' },
        { Category: 'YES_NO', Value: 'Yes' },
        { Category: 'YES_NO', Value: 'No' },
        { Category: 'CASTE_CATEGORY', Value: 'GEN' },
        { Category: 'CASTE_CATEGORY', Value: 'OBC' },
        { Category: 'CASTE_CATEGORY', Value: 'SC' },
        { Category: 'CASTE_CATEGORY', Value: 'ST' },
        { Category: 'LOCALITY', Value: 'Urban' },
        { Category: 'LOCALITY', Value: 'Rural' },
        { Category: 'QUALIFICATION_TYPE', Value: 'High School (10th) Certificate' },
        { Category: 'QUALIFICATION_TYPE', Value: 'Higher Secondary (12th) Certificate' },
        { Category: 'QUALIFICATION_TYPE', Value: 'Graduation Certificate' },
        { Category: 'QUALIFICATION_TYPE', Value: 'Post-Graduation Certificate' },
        { Category: 'QUALIFICATION_TYPE', Value: 'Diploma Certificate' },
        { Category: 'QUALIFICATION_TYPE', Value: 'ITI Certificate' },
        { Category: 'QUALIFICATION_TYPE', Value: 'PhD' },
        { Category: 'POST_TYPE', Value: 'Regular' },
        { Category: 'POST_TYPE', Value: 'Sanvida' },
        { Category: 'POST_TYPE', Value: 'Contractual' },
        { Category: 'POST_TYPE', Value: 'Daily Wages' },
        { Category: 'POST_TYPE', Value: 'Private' },
        { Category: 'SERVICE_TYPE', Value: 'Gazetted - Executive' },
        { Category: 'SERVICE_TYPE', Value: 'Gazetted and Non-Executive' },
        { Category: 'SERVICE_TYPE', Value: 'Non-Gazetted and Non-Executive' },
        { Category: 'SERVICE_TYPE', Value: 'Private' },
        { Category: 'CLASS', Value: 'Class I' },
        { Category: 'CLASS', Value: 'Class II' },
        { Category: 'CLASS', Value: 'Class III' },
        { Category: 'CLASS', Value: 'Class IV' },
        { Category: 'DEPT_TYPE', Value: 'State Govt.' },
        { Category: 'DEPT_TYPE', Value: 'Central Govt.' },
        { Category: 'DEPT_TYPE', Value: 'PSU' },
        { Category: 'DEPT_TYPE', Value: 'Autonomous Body' },
        { Category: 'RESULT_STATUS', Value: 'Passed' },
        { Category: 'RESULT_STATUS', Value: 'Appeared' },
        { Category: 'RESULT_STATUS', Value: 'Result Awaited' },
        { Category: 'MARKS_TYPE', Value: 'Percentage' },
        { Category: 'MARKS_TYPE', Value: 'CGPA' },
        { Category: 'MARKS_TYPE', Value: 'Grade' },
        { Category: 'EMPLOYER_TYPE', Value: 'Central Govt.' },
        { Category: 'EMPLOYER_TYPE', Value: 'State Govt.' },
        { Category: 'EMPLOYER_TYPE', Value: 'PSU' },
        { Category: 'EMPLOYER_TYPE', Value: 'Private' },
        { Category: 'EMPLOYER_TYPE', Value: 'Other' },
        { Category: 'EMPLOYMENT_TYPE', Value: 'Regular' },
        { Category: 'EMPLOYMENT_TYPE', Value: 'Contractual' },
        { Category: 'EMPLOYMENT_TYPE', Value: 'Temporary' },
      ].map((c, i) => ({
        ...c,
        Constant_ID: String(i + 1),
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString()
      }));

      // Bulk insert to cloud and clear existing
      await (sheetService as any).bulkInsert('Global_Constants', defaultConstants, true);
      
      setConstants(defaultConstants);
      toast.success('Reset successful! Default values have been saved to the Cloud Database.');
    } catch (error) {
      console.error('Error resetting constants:', error);
      toast.error('Error resetting values: ' + (error as any).message);
    } finally {
      stopProgress();
    }
  };

  const handleSaveAllToCloud = async () => {
    if (constants.length === 0) return;
    
    startProgress('Saving all values to cloud...');
    try {
      await (sheetService as any).bulkInsert('Global_Constants', constants, true);
      toast.success('All values successfully saved to the Cloud Database!');
    } catch (error) {
      console.error('Error saving to cloud:', error);
      toast.error('Error saving to cloud: ' + (error as any).message);
    } finally {
      stopProgress();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConstant.Value) return;

    setIsSubmitting(true);
    startProgress('Adding global value...');
    try {
      const nextId = await sheetService.getNextId('Global_Constants', 'Constant_ID');
      const payload: GlobalConstant = {
        Constant_ID: String(nextId),
        Category: newConstant.Category,
        Value: newConstant.Value,
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };
      await sheetService.insert('Global_Constants', payload);
      setShowAddModal(false);
      setNewConstant({ Category: CATEGORIES[0], Value: '' });
      fetchData();
    } catch (error) {
      toast.error(t('manage.error_update'));
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleDelete = async () => {
    if (!selectedConstantId) return;
    
    const id = selectedConstantId;
    const constantToDelete = constants.find(c => String(c.Constant_ID) === String(id));
    if (!constantToDelete) return;

    setShowDeleteModal(false);
    startProgress('Checking if constant is in use...');
    try {
      // Robust check: See if this value is used in common tables
      const [allPosts, allAppls, allAddl, allQuals, allExps] = await Promise.all([
        sheetService.getAll<any>('Post'),
        sheetService.getAll<any>('Application'),
        sheetService.getAll<any>('Additional_Info'),
        sheetService.getAll<any>('Qualification_Info'),
        sheetService.getAll<any>('Experience_Info')
      ]);

      const val = String(constantToDelete.Value).trim().toLowerCase();
      
      const inUse = 
        allPosts.some(p => Object.values(p).some(v => String(v).trim().toLowerCase() === val)) ||
        allAppls.some(a => Object.values(a).some(v => String(v).trim().toLowerCase() === val)) ||
        allAddl.some(ai => Object.values(ai).some(v => String(v).trim().toLowerCase() === val)) ||
        allQuals.some(q => Object.values(q).some(v => String(v).trim().toLowerCase() === val)) ||
        allExps.some(e => Object.values(e).some(v => String(v).trim().toLowerCase() === val));

      if (inUse) {
        toast.error(t('manage.err_constant_in_use'));
        return;
      }

      startProgress('Deleting value...');
      await sheetService.delete('Global_Constants', 'Constant_ID', id);
      // Update local state immediately
      setConstants(prev => prev.filter(c => String(c.Constant_ID) !== String(id)));
      // Optional: Refresh from server after a delay
      setTimeout(() => fetchData(), 3000);
    } catch (error) {
      toast.error(t('manage.error_delete'));
    } finally {
      setSelectedConstantId(null);
      stopProgress();
    }
  };

  const handleEdit = (constant: GlobalConstant) => {
    setEditingConstant(constant);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConstant || !editingConstant.Value) return;

    setIsSubmitting(true);
    startProgress('Updating global value...');
    try {
      const payload: Partial<GlobalConstant> = {
        Category: editingConstant.Category,
        Value: editingConstant.Value,
        T_STMP_UPD: new Date().toISOString(),
      };
      await sheetService.update('Global_Constants', 'Constant_ID', editingConstant.Constant_ID, payload);
      setShowEditModal(false);
      setEditingConstant(null);
      fetchData();
    } catch (error) {
      toast.error(t('manage.error_update'));
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const filteredConstants = constants.filter(c => {
    const matchesSearch = c.Value.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.Category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || c.Category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-hindi-support">
        <div>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('manage.back_to_dashboard')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-blue-600" />
            {t('manage.globals')}
          </h1>
          <p className="text-gray-600">{t('manage.globals_subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSaveAllToCloud}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
            title={t('manage.save_cloud')}
          >
            <Save className="w-5 h-5 mr-2" />
            {t('manage.save_cloud')}
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
          >
            {t('manage.reset_defaults')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('manage.add_new')}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 font-hindi-support">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('manage.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 font-hindi-support"
            >
              <option value="ALL">{t('manage.all_categories')}</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden font-hindi-support">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="px-6 py-3">{t('manage.category')}</th>
              <th className="px-6 py-3">{t('manage.value')}</th>
              <th className="px-6 py-3">{t('manage.last_updated')}</th>
              <th className="px-6 py-3 text-right">{t('dashboard.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredConstants.length > 0 ? (
              filteredConstants.map((c, index) => (
                <tr key={`${c.Constant_ID}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-medium font-sans">
                      {c.Category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{c.Value}</div>
                    <div className="text-xs text-blue-600 font-hindi-support">{translateConstant(t, c.Value)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-sans">
                    {new Date(c.T_STMP_UPD).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(c)}
                      className="text-blue-400 hover:text-blue-600 p-1"
                      title={t('manage.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConstantId(c.Constant_ID);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                      title={t('manage.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Settings className="w-12 h-12 text-gray-200 mb-4" />
                    <p className="text-lg font-medium text-gray-900">{t('manage.no_values')}</p>
                    <p className="text-sm text-gray-500 mb-6">{t('manage.no_values_subtitle')}</p>
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      {t('manage.click_load_defaults')}
                    </button>
                  </div>
                </td>
              </tr>
            )}
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
                  {t('manage.delete_value_confirm')}
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedConstantId(null);
                    }}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    {t('manage.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
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

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 bg-amber-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{t('manage.confirm_reset')}</h3>
              </div>
              <div className="p-6 font-hindi-support">
                <p className="text-gray-600 mb-6">
                  {t('manage.reset_confirm_text')}
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    {t('manage.cancel')}
                  </button>
                  <button
                    onClick={handleResetToDefaults}
                    className="flex-1 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700"
                  >
                    {t('manage.reset_defaults')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{t('manage.add_new')}</h3>
                <button onClick={() => setShowAddModal(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-4 font-hindi-support">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('manage.category')}</label>
                  <select
                    value={newConstant.Category}
                    onChange={e => setNewConstant({ ...newConstant, Category: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-sans"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('manage.value')}</label>
                  <input
                    type="text"
                    required
                    value={newConstant.Value}
                    onChange={e => setNewConstant({ ...newConstant, Value: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter dropdown option text"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center font-hindi-support"
                  >
                    {isSubmitting ? t('common.processing') : <><Save className="w-4 h-4 mr-2" /> {t('manage.save')}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingConstant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{t('manage.edit')}</h3>
                <button onClick={() => setShowEditModal(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4 font-hindi-support">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('manage.category')}</label>
                  <select
                    value={editingConstant.Category}
                    onChange={e => setEditingConstant({ ...editingConstant, Category: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-sans"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('manage.value')}</label>
                  <input
                    type="text"
                    required
                    value={editingConstant.Value}
                    onChange={e => setEditingConstant({ ...editingConstant, Value: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter dropdown option text"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center font-hindi-support"
                  >
                    {isSubmitting ? t('common.processing') : <><Save className="w-4 h-4 mr-2" /> {t('manage.save')}</>}
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

export default ManageConstants;
