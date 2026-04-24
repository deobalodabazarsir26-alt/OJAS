import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { Department, Office } from '../types';
import { Building2, Plus, Trash2, Edit, Save, X, Search, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConstants } from '../hooks/useConstants';
import { useTranslation } from 'react-i18next';
import { translateConstant } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ManageDepartments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { DEPT_TYPE_OPTIONS } = useConstants();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    Dept_Name: '',
    Dept_Type: DEPT_TYPE_OPTIONS[0],
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await sheetService.getAll<Department>('Department');
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    startProgress('Adding new department...');
    try {
      const nextId = await sheetService.getNextId('Department', 'Dept_ID');
      const newDept: Department = {
        Dept_ID: String(nextId),
        Dept_Name: deptForm.Dept_Name,
        Dept_Type: deptForm.Dept_Type,
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };

      await sheetService.insert('Department', newDept);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Error adding department');
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      Dept_Name: dept.Dept_Name,
      Dept_Type: dept.Dept_Type,
    });
    setShowModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;

    setIsSubmitting(true);
    startProgress('Updating department...');
    try {
      const updatedDept: Partial<Department> = {
        Dept_Name: deptForm.Dept_Name,
        Dept_Type: deptForm.Dept_Type,
        T_STMP_UPD: new Date().toISOString(),
      };

      await sheetService.update('Department', 'Dept_ID', editingDept.Dept_ID, updatedDept);
      setShowModal(false);
      setEditingDept(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(t('manage.error_update'));
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleDelete = async () => {
    if (!selectedDeptId) return;
    
    const deptId = selectedDeptId;
    setShowDeleteModal(false);
    startProgress('Checking for dependencies...');
    try {
      // THE ROBUST MECHANISM: Check for Offices
      const allOffices = await sheetService.getAll<Office>('Office');
      const hasOffices = allOffices.some(o => String(o.Dept_ID).trim() === String(deptId).trim());

      if (hasOffices) {
        toast.error(t('manage.err_delete_dept_has_offices'));
        return;
      }

      startProgress('Deleting department...');
      await sheetService.delete('Department', 'Dept_ID', deptId);
      setDepartments(prev => prev.filter(d => String(d.Dept_ID) !== String(deptId)));
      setTimeout(() => fetchData(), 3000);
    } catch (error) {
      toast.error(t('manage.error_delete'));
    } finally {
      setSelectedDeptId(null);
      stopProgress();
    }
  };

  const resetForm = () => {
    setDeptForm({
      Dept_Name: '',
      Dept_Type: DEPT_TYPE_OPTIONS[0],
    });
  };

  const filteredDepts = departments.filter(d => 
    d.Dept_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.Dept_Type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Building2 className="w-8 h-8 mr-3 text-blue-600" />
            {t('manage.depts')}
          </h1>
          <p className="text-gray-600">{t('admin.subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditingDept(null); resetForm(); setShowModal(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('manage.add_new')}
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('manage.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 font-hindi-support"
          />
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden font-hindi-support">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-3">{t('manage.id')}</th>
                <th className="px-6 py-3">{t('admin.dept_name')}</th>
                <th className="px-6 py-3">{t('signup.type')}</th>
                <th className="px-6 py-3 text-right">{t('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDepts.length > 0 ? (
                filteredDepts.map((d) => (
                  <tr key={d.Dept_ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-400">{d.Dept_ID}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{d.Dept_Name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                        {translateConstant(t, d.Dept_Type || '')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(d)}
                        className="text-blue-400 hover:text-blue-600 p-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDeptId(d.Dept_ID);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                    {t('common.no_data', 'No data found.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
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
                <p className="text-gray-600 mb-6 font-medium">
                  {t('manage.delete_dept_confirm', 'Are you sure you want to delete this department?')}
                </p>
                <div className="bg-amber-50 p-4 rounded-lg text-xs text-amber-800 space-y-2 mb-6 border border-amber-200">
                  <p className="font-bold flex items-center text-amber-900">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Robust Check Enabled:
                  </p>
                  <p>Deletion will be rejected if any Offices are currently mapped to this department.</p>
                </div>
                <div className="flex space-x-4">
                  <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">{t('dashboard.cancel')}</button>
                  <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">{t('manage.delete')}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{editingDept ? t('manage.edit') : t('admin.add_dept')}</h3>
                <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={editingDept ? handleUpdate : handleAdd} className="p-6 space-y-4 font-hindi-support">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin.dept_name')}</label>
                  <input
                    type="text"
                    required
                    value={deptForm.Dept_Name}
                    onChange={e => setDeptForm({ ...deptForm, Dept_Name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('admin.dept_type')}</label>
                  <select
                    value={deptForm.Dept_Type}
                    onChange={e => setDeptForm({ ...deptForm, Dept_Type: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  >
                    {DEPT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                  </select>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center">
                    {isSubmitting ? t('common.processing') : <><Save className="w-4 h-4 mr-2" /> {editingDept ? t('manage.save') : t('manage.add_new')}</>}
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

export default ManageDepartments;
