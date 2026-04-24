import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { Office, Department, User, OfficeUser, Advertisement } from '../types';
import { Building2, Plus, Trash2, Edit, Save, X, Search, Filter, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INDIA_STATES, INDIA_STATES_DISTRICTS } from '../data/indiaData';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { translateConstant } from '../lib/utils';

const ManageOffices: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const [offices, setOffices] = useState<Office[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officeUsers, setOfficeUsers] = useState<OfficeUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [editingOffice, setEditingOffice] = useState<any | null>(null);
  const [officeForm, setOfficeForm] = useState({
    Office_Name: '',
    Address: '',
    State: '',
    District: '',
    Pincode: '',
    Dept_ID: '',
    User_Name: '',
    Password: '',
    Officer_Name: '',
    Designation: '',
    Email_ID: '',
    Mobile: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [officesData, deptsData, officeUsersData, usersData] = await Promise.all([
        sheetService.getAll<Office>('Office'),
        sheetService.getAll<Department>('Department'),
        sheetService.getAll<OfficeUser>('Office_User'),
        sheetService.getAll<User>('User'),
      ]);
      setOffices(officesData);
      setDepartments(deptsData);
      setOfficeUsers(officeUsersData);
      setUsers(usersData);
      
      if (deptsData.length > 0 && !officeForm.Dept_ID) {
        setOfficeForm(prev => ({ ...prev, Dept_ID: deptsData[0].Dept_ID }));
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
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
    startProgress('Creating new office and user account...');
    try {
      const nextOfficeId = await sheetService.getNextId('Office', 'Office_ID');
      const nextUserId = await sheetService.getNextId('User', 'User_ID');
      const officeId = String(nextOfficeId);
      const userId = String(nextUserId);

      const newOffice: Office = {
        Office_ID: officeId,
        Office_Name: officeForm.Office_Name,
        Address: officeForm.Address,
        State: officeForm.State,
        District: officeForm.District,
        Pincode: officeForm.Pincode,
        Dept_ID: officeForm.Dept_ID,
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };

      const newUser: User = {
        User_ID: userId,
        User_Name: officeForm.User_Name,
        Password: officeForm.Password,
        User_Type: 'office',
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };

      const newOfficeUser: OfficeUser = {
        Dept_ID: officeForm.Dept_ID,
        Office_ID: officeId,
        User_ID: userId,
        Officer_Name: officeForm.Officer_Name,
        Designation: officeForm.Designation,
        Email_ID: officeForm.Email_ID,
        Mobile: officeForm.Mobile,
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };

      await sheetService.insert('Office', newOffice);
      await sheetService.insert('User', newUser);
      await sheetService.insert('Office_User', newOfficeUser);

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Error adding office');
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleEdit = (office: Office) => {
    const officeUser = officeUsers.find(ou => String(ou.Office_ID) === String(office.Office_ID));
    const user = users.find(u => String(u.User_ID) === String(officeUser?.User_ID));
    
    setEditingOffice(office);
    setOfficeForm({
      Office_Name: office.Office_Name,
      Address: office.Address,
      State: office.State || '',
      District: office.District || '',
      Pincode: office.Pincode || '',
      Dept_ID: office.Dept_ID,
      User_Name: user?.User_Name || '',
      Password: user?.Password || '',
      Officer_Name: officeUser?.Officer_Name || '',
      Designation: officeUser?.Designation || '',
      Email_ID: officeUser?.Email_ID || '',
      Mobile: officeUser?.Mobile || '',
    });
    setShowModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffice) return;

    setIsSubmitting(true);
    startProgress('Updating office details...');
    try {
      const officeUser = officeUsers.find(ou => String(ou.Office_ID) === String(editingOffice.Office_ID));
      
      const updatedOffice: Partial<Office> = {
        Office_Name: officeForm.Office_Name,
        Address: officeForm.Address,
        State: officeForm.State,
        District: officeForm.District,
        Pincode: officeForm.Pincode,
        Dept_ID: officeForm.Dept_ID,
        T_STMP_UPD: new Date().toISOString(),
      };

      const updatedOfficeUser: Partial<OfficeUser> = {
        Dept_ID: officeForm.Dept_ID,
        Officer_Name: officeForm.Officer_Name,
        Designation: officeForm.Designation,
        Email_ID: officeForm.Email_ID,
        Mobile: officeForm.Mobile,
        T_STMP_UPD: new Date().toISOString(),
      };

      await sheetService.update('Office', 'Office_ID', editingOffice.Office_ID, updatedOffice);
      if (officeUser) {
        await sheetService.update('Office_User', 'User_ID', officeUser.User_ID, updatedOfficeUser);
        
        if (officeForm.User_Name || officeForm.Password) {
          const updatedUser: Partial<User> = {
            User_Name: officeForm.User_Name,
            Password: officeForm.Password,
            T_STMP_UPD: new Date().toISOString(),
          };
          await sheetService.update('User', 'User_ID', officeUser.User_ID, updatedUser);
        }
      }

      setShowModal(false);
      setEditingOffice(null);
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
    if (!selectedOfficeId) return;
    
    const officeId = selectedOfficeId;
    setShowDeleteModal(false);
    startProgress('Checking for dependencies...');
    try {
      const allAds = await sheetService.getAll<Advertisement>('Advertisement');
      const hasAds = allAds.some(ad => String(ad.Office_ID).trim() === String(officeId).trim());

      if (hasAds) {
        toast.error(t('manage.err_delete_office_has_ads'));
        return;
      }

      startProgress('Deleting office and accounts...');
      const officeUser = officeUsers.find(ou => String(ou.Office_ID) === String(officeId));
      
      await sheetService.delete('Office', 'Office_ID', officeId);
      if (officeUser) {
        await sheetService.delete('Office_User', 'User_ID', officeUser.User_ID);
        await sheetService.delete('User', 'User_ID', officeUser.User_ID);
      }
      
      // Update local state immediately
      setOffices(prev => prev.filter(o => String(o.Office_ID) !== String(officeId)));
      if (officeUser) {
        setOfficeUsers(prev => prev.filter(ou => String(ou.User_ID) !== String(officeUser.User_ID)));
        setUsers(prev => prev.filter(u => String(u.User_ID) !== String(officeUser.User_ID)));
      }
      
      // Optional: Refresh from server after a delay
      setTimeout(() => fetchData(), 3000);
    } catch (error) {
      toast.error(t('manage.error_delete'));
    } finally {
      setSelectedOfficeId(null);
      stopProgress();
    }
  };

  const resetForm = () => {
    setOfficeForm({
      Office_Name: '',
      Address: '',
      State: '',
      District: '',
      Pincode: '',
      Dept_ID: departments[0]?.Dept_ID || '',
      User_Name: '',
      Password: '',
      Officer_Name: '',
      Designation: '',
      Email_ID: '',
      Mobile: '',
    });
  };

  const filteredOffices = offices.filter(o => {
    const matchesSearch = o.Office_Name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.Address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.District && o.District.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = selectedDept === 'ALL' || String(o.Dept_ID) === String(selectedDept);
    return matchesSearch && matchesDept;
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
            <Building2 className="w-8 h-8 mr-3 text-blue-600" />
            {t('manage.offices')}
          </h1>
          <p className="text-gray-600">{t('manage.globals_subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditingOffice(null); resetForm(); setShowModal(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('manage.add_new')}
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 font-hindi-support">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('manage.search_offices')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 font-hindi-support"
            >
              <option value="ALL">{t('manage.all_depts')}</option>
              {departments.map(d => (
                <option key={d.Dept_ID} value={d.Dept_ID}>{d.Dept_Name}</option>
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
                <th className="px-6 py-3">{t('manage.office_name')}</th>
                <th className="px-6 py-3">{t('admin.stats.depts')}</th>
                <th className="px-6 py-3">{t('manage.officer_in_charge')}</th>
                <th className="px-6 py-3">{t('manage.mobile')}</th>
                <th className="px-6 py-3 text-right">{t('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOffices.length > 0 ? (
                filteredOffices.map((o, index) => {
                  const dept = departments.find(d => String(d.Dept_ID).trim() === String(o.Dept_ID).trim());
                  const officeUser = officeUsers.find(ou => String(ou.Office_ID).trim() === String(o.Office_ID).trim());
                  return (
                    <tr key={`${o.Office_ID}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{o.Office_Name}</div>
                        <div className="text-xs text-gray-500">{o.Address}</div>
                        <div className="text-[10px] text-gray-400">
                          {o.District && `${translateConstant(t, o.District)}, `}{translateConstant(t, o.State)} {o.Pincode && `- ${o.Pincode}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                          {dept?.Dept_Name || t('manage.unknown')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{officeUser?.Officer_Name || t('manage.na')}</div>
                        <div className="text-xs text-gray-500">{officeUser?.Designation || t('manage.na')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 font-sans">{officeUser?.Email_ID}</div>
                        <div className="text-xs text-gray-600 font-sans">{officeUser?.Mobile}</div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(o)}
                          className="text-blue-400 hover:text-blue-600 p-1"
                          title={t('manage.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOfficeId(o.Office_ID);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-400 hover:text-red-600 p-1"
                          title={t('manage.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                    {t('manage.no_offices')}
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
                  {t('manage.delete_office_confirm')}
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedOfficeId(null);
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

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{editingOffice ? t('manage.edit') : t('manage.add_new')}</h3>
                <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={editingOffice ? handleUpdate : handleAdd} className="p-6 overflow-y-auto max-h-[80vh] font-hindi-support">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-1">{t('manage.office_details')}</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('manage.office_name')}</label>
                      <input
                        type="text"
                        required
                        value={officeForm.Office_Name}
                        onChange={e => setOfficeForm({ ...officeForm, Office_Name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('admin.stats.depts')}</label>
                      <select
                        required
                        value={officeForm.Dept_ID}
                        onChange={e => setOfficeForm({ ...officeForm, Dept_ID: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      >
                        <option value="">{t('manage.select_dept')}</option>
                        {departments.map(d => (
                          <option key={d.Dept_ID} value={d.Dept_ID}>{d.Dept_Name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('manage.address')}</label>
                      <textarea
                        required
                        value={officeForm.Address}
                        onChange={e => setOfficeForm({ ...officeForm, Address: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('manage.state')}</label>
                        <select
                          required
                          value={officeForm.State}
                          onChange={e => setOfficeForm({ ...officeForm, State: e.target.value, District: '' })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        >
                          <option value="">{t('manage.select_state')}</option>
                          {INDIA_STATES.map(state => (
                            <option key={state} value={state}>{translateConstant(t, state)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('manage.district')}</label>
                        <select
                          required
                          value={officeForm.District}
                          onChange={e => setOfficeForm({ ...officeForm, District: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                          disabled={!officeForm.State}
                        >
                          <option value="">{t('manage.select_dist')}</option>
                          {officeForm.State && INDIA_STATES_DISTRICTS[officeForm.State]?.map(dist => (
                            <option key={dist} value={dist}>{translateConstant(t, dist)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('manage.pincode')}</label>
                      <input
                        type="text"
                        required
                        value={officeForm.Pincode}
                        onChange={e => setOfficeForm({ ...officeForm, Pincode: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 font-hindi-support">
                    <h4 className="font-bold text-gray-900 border-b pb-1">{t('manage.login_credentials')}</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('manage.username')}</label>
                      <input
                        type="text"
                        required
                        value={officeForm.User_Name}
                        onChange={e => setOfficeForm({ ...officeForm, User_Name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('manage.password')}</label>
                      <input
                        type="password"
                        required
                        value={officeForm.Password}
                        onChange={e => setOfficeForm({ ...officeForm, Password: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-sans"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4 font-hindi-support">
                    <h4 className="font-bold text-gray-900 border-b pb-1">{t('manage.officer_in_charge')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('manage.officer_name')}</label>
                        <input
                          type="text"
                          required
                          value={officeForm.Officer_Name}
                          onChange={e => setOfficeForm({ ...officeForm, Officer_Name: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('manage.designation')}</label>
                        <input
                          type="text"
                          required
                          value={officeForm.Designation}
                          onChange={e => setOfficeForm({ ...officeForm, Designation: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('manage.email')}</label>
                        <input
                          type="email"
                          required
                          value={officeForm.Email_ID}
                          onChange={e => setOfficeForm({ ...officeForm, Email_ID: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('manage.mobile')}</label>
                        <input
                          type="tel"
                          required
                          value={officeForm.Mobile}
                          onChange={e => setOfficeForm({ ...officeForm, Mobile: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-sans"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-8">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center font-hindi-support"
                  >
                    {isSubmitting ? t('common.processing') : <><Save className="w-5 h-5 mr-2" /> {editingOffice ? t('manage.save') : t('manage.add_new')}</>}
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

export default ManageOffices;
