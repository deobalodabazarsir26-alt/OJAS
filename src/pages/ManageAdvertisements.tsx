import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { Advertisement, Post, Office, Department } from '../types';
import { 
  FileText, Search, Filter, Trash2, Edit, Save, X, Plus,
  AlertCircle, CheckCircle, ExternalLink, Calendar, Building2, Download, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useConstants } from '../hooks/useConstants';
import { formatDate, formatDateForInput, translateConstant } from '../lib/utils';
import { utils, writeFile } from 'xlsx';
import { useTranslation } from 'react-i18next';
import { Application, GeneralUser, AdditionalInfo, AddressInfo, QualificationInfo, ExperienceInfo } from '../types';
import toast from 'react-hot-toast';

const ManageAdvertisements: React.FC = () => {
  const { t } = useTranslation();
  const { POST_TYPE_OPTIONS, SERVICE_TYPE_OPTIONS, CLASS_OPTIONS } = useConstants();
  const navigate = useNavigate();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdFileLoading, setIsAdFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for editing
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adForm, setAdForm] = useState<Partial<Advertisement>>({
    Letter_No: '',
    Title: '',
    Instructions: '',
    Terms_Conditions: '',
    Start_Date: '',
    End_Date: '',
    Clm_Strt_Dt: '',
    Clm_End_Dt: '',
    Adv_Doc: '',
    Office_ID: '',
    Dept_ID: ''
  });
  const [posts, setPosts] = useState<Partial<Post>[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [adsData, officesData, deptsData] = await Promise.all([
        sheetService.getAll<Advertisement>('Advertisement'),
        sheetService.getAll<Office>('Office'),
        sheetService.getAll<Department>('Department'),
      ]);
      setAds(adsData);
      setOffices(officesData);
      setDepts(deptsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getOfficeName = (id: string) => {
    const office = offices.find(o => String(o.Office_ID) === String(id));
    return office ? office.Office_Name : 'Unknown Office';
  };

  const getDeptName = (id: string) => {
    const dept = depts.find(d => String(d.Dept_ID) === String(id));
    return dept ? dept.Dept_Name : 'Unknown Dept';
  };

  const handleEditAd = async (ad: Advertisement) => {
    setEditingAdId(ad.Adv_ID);
    setAdForm({
      Letter_No: ad.Letter_No,
      Title: ad.Title,
      Instructions: ad.Instructions,
      Terms_Conditions: ad.Terms_Conditions,
      Start_Date: formatDateForInput(ad.Start_Date),
      End_Date: formatDateForInput(ad.End_Date),
      Clm_Strt_Dt: ad.Clm_Strt_Dt ? formatDateForInput(ad.Clm_Strt_Dt) : '',
      Clm_End_Dt: ad.Clm_End_Dt ? formatDateForInput(ad.Clm_End_Dt) : '',
      Adv_Doc: ad.Adv_Doc,
      Office_ID: ad.Office_ID,
      Dept_ID: ad.Dept_ID
    });

    // Fetch posts for this ad
    try {
      const allPosts = await sheetService.getAll<Post>('Post');
      const adPosts = allPosts.filter(p => String(p.Adv_ID) === String(ad.Adv_ID));
      setPosts(adPosts.length > 0 ? adPosts : [{ Post_Name: '', Post_Type: POST_TYPE_OPTIONS[0], Service_Type: SERVICE_TYPE_OPTIONS[0], Class: CLASS_OPTIONS[0], Payscale: '', Qualification: '', Experience: '' }]);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
    
    setShowEditModal(true);
  };

  const handleAdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file.');
        return;
      }
      setIsAdFileLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdForm(prev => ({ ...prev, Adv_Doc: reader.result as string }));
        setIsAdFileLoading(false);
      };
      reader.onerror = () => {
        toast.error('Error reading file');
        setIsAdFileLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostChange = (index: number, field: keyof Post, value: string) => {
    const newPosts = [...posts];
    newPosts[index] = { ...newPosts[index], [field]: value };
    setPosts(newPosts);
  };

  const handleAddPost = () => {
    setPosts([...posts, { Post_Name: '', Post_Type: POST_TYPE_OPTIONS[0], Service_Type: SERVICE_TYPE_OPTIONS[0], Class: CLASS_OPTIONS[0], Payscale: '', Qualification: '', Experience: '' }]);
  };

  const handleRemovePost = (index: number) => {
    if (posts.length > 1) {
      setPosts(posts.filter((_, i) => i !== index));
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdId) return;

    setIsSubmitting(true);
    setError(null);
    startProgress('Checking dependencies...');
    try {
      // 0. Fetch dependencies
      const [allPosts, allAppls] = await Promise.all([
        sheetService.getAll<Post>('Post'),
        sheetService.getAll<Application>('Application')
      ]);

      const existingPosts = allPosts.filter(p => String(p.Adv_ID) === String(editingAdId));
      const adAppls = allAppls.filter(a => String(a.Adv_ID) === String(editingAdId));

      // Check if any removed post has applications
      const currentPostIds = posts.map(p => String(p.Post_ID)).filter(p => p !== 'undefined');
      const postsToRemove = existingPosts.filter(p => !currentPostIds.includes(String(p.Post_ID)));

      for (const p of postsToRemove) {
        const hasApps = adAppls.some(a => String(a.Post_ID) === String(p.Post_ID));
        if (hasApps) {
          toast.error(`Cannot remove post "${p.Post_Name}" because applications have already been submitted for it.`);
          setIsSubmitting(false);
          stopProgress();
          return;
        }
      }

      startProgress('Updating advertisement...');
      // 1. Update Advertisement
      const adPayload = {
        ...adForm,
        T_STMP_UPD: new Date().toISOString()
      };
      await sheetService.update('Advertisement', 'Adv_ID', editingAdId, adPayload);

      // 2. Manage Posts
      updateProgress(50, 'Removing old posts...');
      for (const p of postsToRemove) {
        await sheetService.delete('Post', 'Post_ID', p.Post_ID);
      }

      updateProgress(70, 'Saving current posts...');
      let nextPostId = await sheetService.getNextId('Post', 'Post_ID');
      for (const post of posts) {
        if (post.Post_ID) {
          // Update existing
          await sheetService.update('Post', 'Post_ID', post.Post_ID, {
            ...post,
            T_STMP_UPD: new Date().toISOString()
          });
        } else {
          // Insert new
          await sheetService.insert('Post', {
            ...post,
            Post_ID: String(nextPostId++),
            Adv_ID: editingAdId,
            T_STMP_ADD: new Date().toISOString(),
            T_STMP_UPD: new Date().toISOString()
          });
        }
      }

      updateProgress(100, 'Advertisement updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update advertisement');
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleDeleteAd = async (id: string) => {
    setIsSubmitting(true);
    startProgress('Checking for dependencies...');
    try {
      // Fetch applications to check dependency
      const allAppls = await sheetService.getAll<Application>('Application');
      const hasApplications = allAppls.some(a => String(a.Adv_ID).trim() === String(id).trim());

      if (hasApplications) {
        toast.error('Cannot delete this advertisement because applications have already been submitted against it. Please delete the applications first or mark the advertisement as inactive.');
        setDeletingAdId(null);
        return;
      }

      startProgress('Deleting advertisement and related posts...');
      
      // 1. Fetch related posts to handle 1:N deletion robustly
      const allPosts = await sheetService.getAll<Post>('Post');
      const adPosts = allPosts.filter(p => String(p.Adv_ID).trim() === String(id).trim());

      // 2. Delete posts one by one to ensure all are removed from remote sheet 
      // (safeguard against older Apps Script versions that only delete 1st match)
      for (let i = 0; i < adPosts.length; i++) {
        const p = adPosts[i];
        updateProgress(40 + (i / adPosts.length) * 40, `Removing post: ${p.Post_Name}`);
        await sheetService.delete('Post', 'Post_ID', p.Post_ID);
      }

      // 3. Delete advertisement
      updateProgress(90, 'Removing advertisement record...');
      await sheetService.delete('Advertisement', 'Adv_ID', id);
      
      setDeletingAdId(null);
      setAds(prev => prev.filter(ad => String(ad.Adv_ID) !== String(id)));
      fetchData();
    } catch (err) {
      toast.error('Error deleting advertisement: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleExportApplications = async (ad: Advertisement) => {
    startProgress(`Preparing export for ${ad.Title}...`);
    try {
      updateProgress(10, 'Fetching all required application data...');
      const [allAppls, allGeneralUsers, allAddl, allAddr, allQual, allExp, allPosts] = await Promise.all([
        sheetService.getAll<Application>('Application'),
        sheetService.getAll<GeneralUser>('General_User'),
        sheetService.getAll<AdditionalInfo>('Additional_Info'),
        sheetService.getAll<AddressInfo>('Address_Info'),
        sheetService.getAll<QualificationInfo>('Qualification_Info'),
        sheetService.getAll<ExperienceInfo>('Experience_Info'),
        sheetService.getAll<Post>('Post'),
      ]);

      const targetAdId = String(ad.Adv_ID).trim();
      const adAppls = allAppls.filter(apl => String(apl.Adv_ID).trim() === targetAdId);
      
      console.log(`Found ${adAppls.length} applications for ad ${targetAdId}`);
      
      if (adAppls.length === 0) {
        toast.error('No applications found for this advertisement stored in the database.');
        return;
      }

      updateProgress(50, 'Processing and joining records...');
      const exportData = adAppls.map(apl => {
        const userId = String(apl.User_ID).trim();
        const applId = String(apl.Appl_ID).trim();
        
        const gUser = allGeneralUsers.find(gu => String(gu.User_ID).trim() === userId);
        const addl = allAddl.find(ai => String(ai.Appl_ID).trim() === applId);
        const addr = allAddr.find(ai => String(ai.Appl_ID).trim() === applId);
        const post = allPosts.find(p => String(p.Post_ID).trim() === String(apl.Post_ID).trim());
        const quals = allQual.filter(q => String(q.Appl_ID).trim() === applId);
        const exps = allExp.filter(e => String(e.Appl_ID).trim() === applId);

        return {
          // Application Basic
          'Application ID': apl.Appl_ID,
          'Applied Post': post?.Post_Name || 'N/A',
          'Apply Date': formatDate(apl.Apply_Date),
          'Status': apl.Status || 'Submitted',
          'Admin Remark': apl.Remark || '',

          // Candidate Basic (General User)
          'Candidate Name': gUser?.Candidate_Name || 'N/A',
          'Candidate Name (Hindi)': gUser?.Candidate_Name_HI || 'N/A',
          'Gender': gUser?.Gender || 'N/A',
          'Date of Birth': gUser?.DOB || 'N/A',
          'DOB Proof Type': gUser?.DOB_Certificate_Type || 'N/A',
          'Father Name': gUser?.Father_Name || 'N/A',
          'Father Name (Hindi)': gUser?.Father_Name_HI || 'N/A',
          'Mother Name': gUser?.Mother_Name || 'N/A',
          'Mother Name (Hindi)': gUser?.Mother_Name_HI || 'N/A',
          'ID Proof Type': gUser?.ID_Proof || 'N/A',
          'ID Number': gUser?.ID_Number || 'N/A',
          'Mobile': gUser?.Mobile || 'N/A',
          'Email': gUser?.Email_ID || 'N/A',

          // Additional Information
          'Is Chhattisgarh Domicile?': addl?.Is_CG || 'N/A',
          'Domicile State': addl?.Domicile_State || 'N/A',
          'Domicile District': addl?.Domicile_District || 'N/A',
          'Locality': addl?.Locality || 'N/A',
          'Caste Category': addl?.Caste_Category || 'N/A',
          'Caste State': addl?.Caste_State || 'N/A',
          'Caste District': addl?.Caste_District || 'N/A',
          'Is Person with Disability (PwD)?': addl?.Is_PWD || 'N/A',
          'PwD Cert. Issuing State': addl?.PwD_State || 'N/A',
          'PwD Cert. Issuing District': addl?.PwD_District || 'N/A',
          'PwD Percentage': addl?.PwD_Percentage || 'N/A',

          // Address Information
          'Permanent Address': addr?.Perm_Address || 'N/A',
          'Permanent Landmark': addr?.Perm_Landmark || 'N/A',
          'Permanent District': addr?.Perm_District || 'N/A',
          'Permanent State': addr?.Perm_State || 'N/A',
          'Permanent Pincode': addr?.Perm_Pincode || 'N/A',
          'Current Address Same as Permanent?': addr?.Is_Same || 'N/A',
          'Current Address': addr?.Curr_Address || 'N/A',
          'Current Landmark': addr?.Curr_Landmark || 'N/A',
          'Current District': addr?.Curr_District || 'N/A',
          'Current State': addr?.Curr_State || 'N/A',
          'Current Pincode': addr?.Curr_Pincode || 'N/A',

          // Document URLs
          'Photo URL': gUser?.Photo_URL || '',
          'Signature URL': gUser?.Signature_URL || '',
          'DOB Proof URL': gUser?.DOB_Doc || '',
          'ID Proof URL': gUser?.ID_Doc || '',
          'Domicile Certificate URL': addl?.Domicile_Certificate_URL || '',
          'Caste Certificate URL': addl?.Caste_Certificate_URL || '',
          'PwD Certificate URL': addl?.PwD_Certificate_URL || '',

          // Summaries
          'Education Summary': quals.map(q => `${q.Qualification_Type}: ${q.Course_Name} from ${q.Board_Name} (${q.Pass_Year}) - ${q.Percentage}%`).join(' | '),
          'Work Experience Summary': exps.map(e => `${e.Post_Held} at ${e.Employer_Name} (${e.Start_Date} to ${e.End_Date})`).join(' | '),
        };
      });

      const wb = utils.book_new();
      const ws = utils.json_to_sheet(exportData);
      utils.book_append_sheet(wb, ws, 'Summary_Report');

      // Detailed Education
      const eduData = adAppls.flatMap(apl => {
        const applId = String(apl.Appl_ID).trim();
        const quals = allQual.filter(q => String(q.Appl_ID).trim() === applId);
        const gUser = allGeneralUsers.find(gu => String(gu.User_ID).trim() === String(apl.User_ID).trim());
        return quals.map(q => ({
          'Application ID': apl.Appl_ID,
          'Candidate Name': gUser?.Candidate_Name || 'N/A',
          'Qualification Type': q.Qualification_Type,
          'Course Name': q.Course_Name,
          'Board/University': q.Board_Name,
          'Institute Name': q.Institute_Name || 'N/A',
          'Pass Year': q.Pass_Year,
          'Result Status': q.Result_Status,
          'Marks Type': q.Marks_Type || 'N/A',
          'Max Marks': q.Max_Marks || 'N/A',
          'Marks Obtained': q.Marks_Obtained || 'N/A',
          'Percentage': q.Percentage
        }));
      });
      if (eduData.length > 0) {
        const wsEdu = utils.json_to_sheet(eduData);
        utils.book_append_sheet(wb, wsEdu, 'Education_Details');
      }

      // Detailed Experience
      const expData = adAppls.flatMap(apl => {
        const applId = String(apl.Appl_ID).trim();
        const exps = allExp.filter(e => String(e.Appl_ID).trim() === applId);
        const gUser = allGeneralUsers.find(gu => String(gu.User_ID).trim() === String(apl.User_ID).trim());
        return exps.map(e => ({
          'Application ID': apl.Appl_ID,
          'Candidate Name': gUser?.Candidate_Name || 'N/A',
          'Currently Working': e.Currently_Working,
          'Employer Type': e.Employer_Type || 'N/A',
          'Employment Type': e.Employment_Type || 'N/A',
          'Employer Name': e.Employer_Name,
          'Employer Address': e.Employer_Address || 'N/A',
          'Post Held': e.Post_Held,
          'Start Date': e.Start_Date,
          'End_Date': e.End_Date,
        }));
      });
      if (expData.length > 0) {
        const wsExp = utils.json_to_sheet(expData);
        utils.book_append_sheet(wb, wsExp, 'Experience_Details');
      }

      updateProgress(80, 'Generating Excel file...');
      const safeLetterNo = String(ad.Letter_No || 'N/A').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `Applications_${targetAdId}_${safeLetterNo}.xlsx`;
      writeFile(wb, fileName);
      updateProgress(100, 'Excel file exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failure during data export: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      stopProgress();
    }
  };

  const filteredAds = ads.filter(ad => {
    const matchesSearch = ad.Title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ad.Letter_No.toLowerCase().includes(searchTerm.toLowerCase());
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(ad.Start_Date);
    const end = new Date(ad.End_Date);
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = today >= start && today <= end;
    } else if (statusFilter === 'upcoming') {
      matchesStatus = today < start;
    } else if (statusFilter === 'closed') {
      matchesStatus = today > end;
    }
    
    return matchesSearch && matchesStatus;
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
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            {t('manage.ads')}
          </h1>
          <p className="text-gray-600 font-hindi-support">{t('manage.admin_control')}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('manage.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 font-hindi-support"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 font-hindi-support"
            >
              <option value="all">{t('ad_details.status_all')}</option>
              <option value="active">{t('ad_details.status_active')}</option>
              <option value="upcoming">{t('ad_details.status_upcoming')}</option>
              <option value="closed">{t('ad_details.status_closed')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold font-hindi-support">
            <tr>
              <th className="px-6 py-3">{t('dashboard.advertisement')}</th>
              <th className="px-6 py-3">{t('manage.office_dept')}</th>
              <th className="px-6 py-3">{t('manage.dates')}</th>
              <th className="px-6 py-3">{t('dashboard.status')}</th>
              <th className="px-6 py-3 text-right">{t('dashboard.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-hindi-support">
            {filteredAds.length > 0 ? (
              filteredAds.map((ad, index) => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const start = new Date(ad.Start_Date);
                const end = new Date(ad.End_Date);
                
                let status = { label: t('ad_details.status_active', 'Active'), color: 'bg-green-100 text-green-700' };
                if (today < start) status = { label: t('ad_details.status_upcoming', 'Upcoming'), color: 'bg-blue-100 text-blue-700' };
                if (today > end) status = { label: t('ad_details.status_closed', 'Closed'), color: 'bg-gray-100 text-gray-700' };

                return (
                  <tr key={ad.Adv_ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{ad.Title}</div>
                      <div className="text-xs text-gray-500">{t('ad_details.ref_no')}: {ad.Letter_No}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{getOfficeName(ad.Office_ID)}</div>
                      <div className="text-xs text-gray-500">{getDeptName(ad.Dept_ID)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="mb-2">
                        <div className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">{t('landing.appl_filling')}</div>
                        <div className="text-xs text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-blue-500" />
                          {formatDate(ad.Start_Date)} to {formatDate(ad.End_Date)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] font-bold text-amber-600 uppercase mb-0.5">{t('landing.claims_objections')}</div>
                        {ad.Clm_Strt_Dt && ad.Clm_End_Dt ? (
                          <div className="text-xs text-gray-600 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                            {formatDate(ad.Clm_Strt_Dt)} to {formatDate(ad.Clm_End_Dt)}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">Not Scheduled</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded-full uppercase ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleExportApplications(ad)}
                        className="p-1 rounded transition-colors text-gray-400 hover:text-green-600 inline-block"
                        title={t('manage.export_excel')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {ad.Adv_Doc && (
                        <a 
                          href={ad.Adv_Doc} 
                           target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 rounded transition-colors text-gray-400 hover:text-green-600 inline-block"
                          title={t('manage.view_pdf')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleEditAd(ad)}
                        className="text-blue-400 hover:text-blue-600 p-1"
                        title={t('manage.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingAdId(ad.Adv_ID)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title={t('manage.cascading_delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-hindi-support">
                  {t('manage.no_ads_found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white font-hindi-support">
                <h3 className="text-lg font-bold">{t('manage.edit_ad', 'Edit Advertisement')}</h3>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSaveAd} className="p-6 overflow-y-auto font-hindi-support">
                {error && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 flex items-center text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-1">{t('manage.basic_details')}</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('ad_details.ref_no', 'Letter Number')}</label>
                      <input
                        type="text"
                        required
                        value={adForm.Letter_No}
                        onChange={e => setAdForm({ ...adForm, Letter_No: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('dashboard.advertisement', 'Title')}</label>
                      <input
                        type="text"
                        required
                        value={adForm.Title}
                        onChange={e => setAdForm({ ...adForm, Title: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('ad_details.starts')}</label>
                        <input
                          type="date"
                          required
                          value={adForm.Start_Date}
                          onChange={e => setAdForm({ ...adForm, Start_Date: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('ad_details.ends')}</label>
                        <input
                          type="date"
                          required
                          value={adForm.End_Date}
                          onChange={e => setAdForm({ ...adForm, End_Date: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('dashboard.claim_period')} ({t('ad_details.starts')})</label>
                        <input
                          type="date"
                          value={adForm.Clm_Strt_Dt}
                          onChange={e => setAdForm({ ...adForm, Clm_Strt_Dt: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('dashboard.claim_period')} ({t('ad_details.ends')})</label>
                        <input
                          type="date"
                          value={adForm.Clm_End_Dt}
                          onChange={e => setAdForm({ ...adForm, Clm_End_Dt: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('ad_details.download_ad')}</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleAdFileChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {isAdFileLoading && <p className="mt-1 text-xs text-blue-600">Reading file...</p>}
                      {adForm.Adv_Doc && !isAdFileLoading && (
                        <p className="mt-1 text-xs text-green-600 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" /> {adForm.Adv_Doc.startsWith('data:') ? 'New file ready' : 'Current document exists'}.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-1">{t('manage.content')}</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('ad_details.instructions')}</label>
                      <textarea
                        required
                        rows={3}
                        value={adForm.Instructions}
                        onChange={e => setAdForm({ ...adForm, Instructions: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('ad_details.terms')}</label>
                      <textarea
                        required
                        rows={3}
                        value={adForm.Terms_Conditions}
                        onChange={e => setAdForm({ ...adForm, Terms_Conditions: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h4 className="font-bold text-gray-900">{t('manage.post_mapping')}</h4>
                    <button
                      type="button"
                      onClick={handleAddPost}
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-100 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" /> {t('manage.add_post')}
                    </button>
                  </div>
                  
                  {posts.map((post, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative">
                      {posts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePost(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500">{t('ad_details.post_name')}</label>
                          <input
                            type="text"
                            required
                            value={post.Post_Name}
                            onChange={e => handlePostChange(index, 'Post_Name', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">{t('ad_details.post_type')}</label>
                          <select
                            value={post.Post_Type}
                            onChange={e => handlePostChange(index, 'Post_Type', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm font-hindi-support"
                          >
                            {POST_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">{t('ad_details.service_type')}</label>
                          <select
                            value={post.Service_Type}
                            onChange={e => handlePostChange(index, 'Service_Type', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm font-hindi-support"
                          >
                            {SERVICE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">{t('ad_details.class')}</label>
                          <select
                            value={post.Class}
                            onChange={e => handlePostChange(index, 'Class', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm font-hindi-support"
                          >
                            {CLASS_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">{t('ad_details.payscale')}</label>
                          <input
                            type="text"
                            value={post.Payscale}
                            onChange={e => handlePostChange(index, 'Payscale', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                          />
                        </div>
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500">{t('ad_details.qualification')}</label>
                            <textarea
                              rows={2}
                              value={post.Qualification}
                              onChange={e => handlePostChange(index, 'Qualification', e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">{t('ad_details.experience')}</label>
                            <textarea
                              rows={2}
                              value={post.Experience}
                              onChange={e => handlePostChange(index, 'Experience', e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center font-hindi-support"
                  >
                    {isSubmitting ? t('common.processing') : <><Save className="w-5 h-5 mr-2" /> {t('manage.save')}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingAdId && (
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
                <p className="text-gray-600 mb-4 font-medium">
                  {t('manage.delete_ad_are_you_the_sure', 'Are you sure you want to delete this advertisement?')}
                </p>
                <div className="bg-amber-50 p-4 rounded-lg text-xs text-amber-800 space-y-2 mb-6 border border-amber-200">
                  <p className="font-bold flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Security Check:
                  </p>
                  <p>Deletion is only possible if NO applications have been submitted against this advertisement.</p>
                  <p>If applications exist, you should adjust the end date to close the advertisement instead.</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setDeletingAdId(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('dashboard.cancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteAd(deletingAdId)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? t('common.processing') : t('manage.delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageAdvertisements;
