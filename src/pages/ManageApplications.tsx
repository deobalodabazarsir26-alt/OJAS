import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { Application, Advertisement, Post, GeneralUser, AdditionalInfo, AddressInfo, QualificationInfo, ExperienceInfo, Claim } from '../types';
import { FileText, Download, Trash2, Search, Filter, AlertTriangle, Loader2, ChevronLeft, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate, translateConstant } from '../lib/utils';
import toast from 'react-hot-toast';
import { pdfService } from '../services/pdfService';

const ManageApplications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<GeneralUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);

  // Filters
  const [selectedAdId, setSelectedAdId] = useState('');
  const [selectedPostId, setSelectedPostId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [appData, adData, postData, userData] = await Promise.all([
        sheetService.getAll<Application>('Application'),
        sheetService.getAll<Advertisement>('Advertisement'),
        sheetService.getAll<Post>('Post'),
        sheetService.getAll<GeneralUser>('General_User'),
      ]);
      
      setApplications(appData);
      setAds(adData);
      setPosts(postData);
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching manage applications data:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (appl: Application) => {
    if (!window.confirm(t('manage_applications.delete_confirm', { id: appl.Appl_ID }))) {
      return;
    }

    setIsDeleting(appl.Appl_ID);
    const toastId = toast.loading(t('common.processing'));
    startProgress(t('manage_applications.progress_start', 'Starting deletion process...'));
    
    try {
      console.log('Starting deletion of application:', appl.Appl_ID);
      
      // 1. Delete Files from Drive
      updateProgress(10, t('manage_applications.progress_finding', 'Finding related records...'));
      const [addInfos, allClaims] = await Promise.all([
        sheetService.getAll<AdditionalInfo>('Additional_Info'),
        sheetService.getAll<Claim>('Claim')
      ]);
      
      const foundAddInfo = addInfos.find(i => String(i.Appl_ID) === String(appl.Appl_ID));
      const applClaims = allClaims.filter(c => String(c.Appl_ID) === String(appl.Appl_ID));
      
      const filesToDelete: string[] = [];
      if (foundAddInfo) {
        if (foundAddInfo.Domicile_Certificate_URL?.startsWith('http')) filesToDelete.push(foundAddInfo.Domicile_Certificate_URL);
        if (foundAddInfo.Caste_Certificate_URL?.startsWith('http')) filesToDelete.push(foundAddInfo.Caste_Certificate_URL);
        if (foundAddInfo.PwD_Certificate_URL?.startsWith('http')) filesToDelete.push(foundAddInfo.PwD_Certificate_URL);
      }
      
      applClaims.forEach(claim => {
        if (claim.Proof_Doc_URL?.startsWith('http')) filesToDelete.push(claim.Proof_Doc_URL);
      });

      if (filesToDelete.length > 0) {
        updateProgress(30, t('manage_applications.progress_files', 'Cleaning up files from Drive...'));
        let count = 0;
        for (const fileUrl of filesToDelete) {
          try {
            count++;
            updateProgress(30 + (count / filesToDelete.length * 20), t('manage_applications.progress_file_deleting', 'Deleting file {{count}} of {{total}}...', { count, total: filesToDelete.length }));
            await sheetService.deleteFile(fileUrl);
          } catch (e) {
            console.warn('Failed to delete file from drive:', fileUrl, e);
          }
        }
      }

      // 2. Delete related table records
      updateProgress(60, t('manage_applications.progress_secondary', 'Removing application profile details...'));
      console.log('Deleting from secondary tables sequentially...');
      
      // Get all related records first to know how many entries to delete for 1:N relations
      const [allQuals, allExps] = await Promise.all([
        sheetService.getAll<QualificationInfo>('Qualification_Info'),
        sheetService.getAll<ExperienceInfo>('Experience_Info')
      ]);
      
      const qualCount = allQuals.filter(q => String(q.Appl_ID) === String(appl.Appl_ID)).length;
      const expCount = allExps.filter(e => String(e.Appl_ID) === String(appl.Appl_ID)).length;
      const claimCount = applClaims.length;

      const secondaryTables = [
        { name: 'Additional_Info', count: 1 },
        { name: 'Address_Info', count: 1 },
        { name: 'Qualification_Info', count: qualCount },
        { name: 'Experience_Info', count: expCount },
        { name: 'Claim', count: claimCount }
      ] as const;

      let tableCount = 0;
      for (const table of secondaryTables) {
        tableCount++;
        updateProgress(60 + (tableCount / secondaryTables.length * 20), t('manage_applications.progress_table', 'Removing data from {{table}}...', { table: table.name }));
        
        // Call delete for each found row (this handles the 1st-match-delete limitation of the current Apps Script)
        for (let i = 0; i < table.count; i++) {
          try {
            console.log(`Deleting ${table.name} (${i+1}/${table.count}) for ${appl.Appl_ID}`);
            await sheetService.delete(table.name as any, 'Appl_ID', appl.Appl_ID);
          } catch (e) {
            console.warn(`Non-critical delete failure for ${table.name}:`, e);
          }
        }
      }

      // 3. Delete Main Application Record LAST
      updateProgress(90, t('manage_applications.progress_finalizing', 'Finalizing application removal...'));
      console.log('Deleting from Application table...');
      await sheetService.delete('Application', 'Appl_ID', appl.Appl_ID);

      // Optimistic Update: Remove from local state immediately after cloud confirm (or even before)
      setApplications(prev => prev.filter(app => app.Appl_ID !== appl.Appl_ID));

      toast.success(t('manage_applications.success_delete', 'Record deleted successfully'), { id: toastId });
      updateProgress(100, t('common.completed', 'Completed'));
      // We still call fetchData to be sure, but the UI is already updated
      fetchData();
    } catch (error) {
      console.error('Deletion error:', error);
      toast.error('Failed to delete application fully', { id: toastId });
    } finally {
      setIsDeleting(null);
      stopProgress();
    }
  };

  const downloadPDF = async (appl: Application) => {
    setIsGeneratingPDF(appl.Appl_ID);
    startProgress('Preparing application PDF...');
    try {
      const [addInfos, addrInfos, qualifications, experiences] = await Promise.all([
        sheetService.getAll<AdditionalInfo>('Additional_Info'),
        sheetService.getAll<AddressInfo>('Address_Info'),
        sheetService.getAll<QualificationInfo>('Qualification_Info'),
        sheetService.getAll<ExperienceInfo>('Experience_Info'),
      ]);

      const additionalInfo = addInfos.find(i => String(i.Appl_ID) === String(appl.Appl_ID));
      const addressInfo = addrInfos.find(i => String(i.Appl_ID) === String(appl.Appl_ID));
      const applQuals = qualifications.filter(q => String(q.Appl_ID) === String(appl.Appl_ID));
      const applExps = experiences.filter(e => String(e.Appl_ID) === String(appl.Appl_ID));
      
      const userProfile = users.find(u => String(u.User_ID) === String(appl.User_ID));
      const ad = ads.find(a => String(a.Adv_ID) === String(appl.Adv_ID));
      const post = posts.find(p => String(p.Post_ID) === String(appl.Post_ID));

      if (!userProfile) throw new Error('User profile not found');

      await pdfService.generateApplicationPDF(
        appl,
        userProfile,
        additionalInfo || null,
        addressInfo || null,
        applQuals,
        applExps,
        ad?.Title || 'Advertisement',
        post?.Post_Name || 'Post',
        t,
        {
          includeCertificates: true,
          onProgress: (msg, prog) => updateProgress(prog, msg)
        }
      );
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(null);
      stopProgress();
    }
  };

  const filteredApplications = applications.filter(app => {
    const isAdMatch = !selectedAdId || String(app.Adv_ID) === String(selectedAdId);
    const isPostMatch = !selectedPostId || String(app.Post_ID) === String(selectedPostId);
    
    const user = users.find(u => String(u.User_ID) === String(app.User_ID));
    const isSearchMatch = !searchQuery || 
      app.Appl_ID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.Candidate_Name?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return isAdMatch && isPostMatch && isSearchMatch;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-hindi-support">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate('/admin/dashboard')} className="mr-4 p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('manage_applications.title')}</h1>
            <p className="text-gray-600">{t('manage_applications.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('manage_applications.search_label')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('manage_applications.search_placeholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="w-full sm:w-64">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('manage_applications.ad_label')}</label>
            <select
              value={selectedAdId}
              onChange={e => { setSelectedAdId(e.target.value); setSelectedPostId(''); }}
              className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{t('manage_applications.all_ads')}</option>
              {ads.map(ad => (
                <option key={ad.Adv_ID} value={ad.Adv_ID}>{ad.Title}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-64">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('manage_applications.post_label')}</label>
            <select
              value={selectedPostId}
              onChange={e => setSelectedPostId(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={!selectedAdId}
            >
              <option value="">{t('manage_applications.all_posts')}</option>
              {posts.filter(p => !selectedAdId || String(p.Adv_ID) === String(selectedAdId)).map(post => (
                <option key={post.Post_ID} value={post.Post_ID}>{post.Post_Name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-3">{t('manage_applications.id')}</th>
                <th className="px-6 py-3">{t('manage_applications.candidate')}</th>
                <th className="px-6 py-3">{t('manage_applications.post')}</th>
                <th className="px-6 py-3">{t('manage_applications.date')}</th>
                <th className="px-6 py-3 text-right">{t('manage_applications.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredApplications.length > 0 ? (
                filteredApplications.map((app) => {
                  const user = users.find(u => String(u.User_ID) === String(app.User_ID));
                  const post = posts.find(p => String(p.Post_ID) === String(app.Post_ID));
                  return (
                    <motion.tr 
                      key={app.Appl_ID} 
                      className="hover:bg-gray-50"
                      layout
                    >
                      <td className="px-6 py-4 text-sm font-mono">{app.Appl_ID}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{user?.Candidate_Name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{user?.Mobile}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{post?.Post_Name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(app.Apply_Date)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => downloadPDF(app)}
                            disabled={isGeneratingPDF === app.Appl_ID}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold disabled:opacity-50"
                            title="Download PDF"
                          >
                            {isGeneratingPDF === app.Appl_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {t('manage_applications.pdf')}
                          </button>
                          <button
                            onClick={() => handleDelete(app)}
                            disabled={isDeleting === app.Appl_ID}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold disabled:opacity-50"
                            title="Delete"
                          >
                            {isDeleting === app.Appl_ID ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {t('manage_applications.delete')}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-500">
                    {t('manage_applications.no_apps_found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start">
        <AlertTriangle className="w-6 h-6 text-amber-600 mr-4 shrink-0 mt-1" />
        <div>
          <h3 className="text-amber-900 font-bold mb-1">{t('manage_applications.delete_note_title')}</h3>
          <div className="text-amber-800 text-sm">
            {t('manage_applications.delete_note_text')}
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('manage_applications.table_main')}</li>
              <li>{t('manage_applications.table_details')}</li>
              <li>{t('manage_applications.table_drive')}</li>
            </ul>
            <span className="font-bold mt-2 block italic text-red-600">{t('manage_applications.delete_warning')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageApplications;
