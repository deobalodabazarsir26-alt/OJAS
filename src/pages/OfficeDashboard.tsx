import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { Advertisement, Post, Application, GeneralUser, AdditionalInfo, AddressInfo, QualificationInfo, ExperienceInfo, Claim } from '../types';
import { Plus, FileText, Users, Download, Trash2, Edit, X, Save, ShieldCheck, AlertCircle, Search, CheckCircle, XCircle, Eye, ExternalLink, User, GraduationCap, Briefcase, Home, ChevronLeft, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useConstants } from '../hooks/useConstants';
import { formatDate, getEmbedUrl, getDocPreviewUrl, formatDateForInput, translateConstant } from '../lib/utils';
import toast from 'react-hot-toast';

import { pdfService } from '../services/pdfService';

const OfficeDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { POST_TYPE_OPTIONS, SERVICE_TYPE_OPTIONS, CLASS_OPTIONS } = useConstants();
  const { profile } = useAuth();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const [activeTab, setActiveTab] = useState<'ads' | 'review' | 'claims'>('ads');
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [allGeneralUsers, setAllGeneralUsers] = useState<GeneralUser[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Review states
  const [selectedAdId, setSelectedAdId] = useState<string>('');
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
  const [viewingClaim, setViewingClaim] = useState<Claim | null>(null);
  const [applicantProfile, setApplicantProfile] = useState<GeneralUser | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo | null>(null);
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [qualifications, setQualifications] = useState<QualificationInfo[]>([]);
  const [experiences, setExperiences] = useState<ExperienceInfo[]>([]);
  const [reviewForm, setReviewForm] = useState({ Status: '', Remark: '' });
  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);

  const [showNewAdModal, setShowNewAdModal] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [adForm, setAdForm] = useState({
    Letter_No: '',
    Title: '',
    Instructions: '',
    Terms_Conditions: '',
    Start_Date: '',
    End_Date: '',
    Clm_Strt_Dt: '',
    Clm_End_Dt: '',
    Adv_Doc: '',
  });
  const [isAdFileLoading, setIsAdFileLoading] = useState(false);

  const [posts, setPosts] = useState<Partial<Post>[]>([
    { Post_Name: '', Post_Type: POST_TYPE_OPTIONS[0], Service_Type: SERVICE_TYPE_OPTIONS[0], Class: CLASS_OPTIONS[0], Payscale: '', Qualification: '', Experience: '' }
  ]);

  const fetchData = async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [adsData, applsData, postsData, usersData, claimsData] = await Promise.all([
        sheetService.getAll<Advertisement>('Advertisement'),
        sheetService.getAll<Application>('Application'),
        sheetService.getAll<Post>('Post'),
        sheetService.getAll<GeneralUser>('General_User'),
        sheetService.getAll<Claim>('Claim'),
      ]);
      // Filter ads by office
      const officeAds = adsData.filter(a => String(a.Office_ID).trim() === String((profile as any).Office_ID).trim());
      setAds(officeAds);
      setAllPosts(postsData);
      setAllGeneralUsers(usersData);
      
      // Filter applications for these ads
      const adIds = officeAds.map(a => String(a.Adv_ID).trim());
      const officeAppls = applsData.filter(a => adIds.includes(String(a.Adv_ID).trim()));
      setApplications(officeAppls);

      // Filter claims for these applications
      const applIds = officeAppls.map(a => String(a.Appl_ID).trim());
      setClaims(claimsData.filter(c => applIds.includes(String(c.Appl_ID).trim())));
    } catch (error) {
      console.error('Error fetching office data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleAddPost = () => {
    setPosts([...posts, { Post_Name: '', Post_Type: POST_TYPE_OPTIONS[0], Service_Type: SERVICE_TYPE_OPTIONS[0], Class: CLASS_OPTIONS[0], Payscale: '', Qualification: '', Experience: '' }]);
  };

  const handleRemovePost = (index: number) => {
    setPosts(posts.filter((_, i) => i !== index));
  };

  const handlePostChange = (index: number, field: keyof Post, value: string) => {
    const newPosts = [...posts];
    newPosts[index] = { ...newPosts[index], [field]: value };
    setPosts(newPosts);
  };

  const handleAdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds 2MB limit');
      return;
    }

    setIsAdFileLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setAdForm({ ...adForm, Adv_Doc: reader.result as string });
      setIsAdFileLoading(false);
    };
    reader.onerror = () => {
      setError('Error reading file');
      setIsAdFileLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (isAdFileLoading) {
      setError('Please wait for the file to finish loading...');
      return;
    }

    // Validation: End Date should not be lesser than Start Date
    if (new Date(adForm.End_Date) < new Date(adForm.Start_Date)) {
      setError('End Date cannot be earlier than Start Date');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    startProgress(editingAdId ? 'Updating advertisement...' : 'Creating new advertisement...');

    try {
      updateProgress(10, 'Preparing data...');
      if (editingAdId) {
        // Update existing advertisement
        const updatedAd: Advertisement = {
          Adv_ID: editingAdId,
          Dept_ID: (profile as any).Dept_ID,
          Office_ID: (profile as any).Office_ID,
          Letter_No: adForm.Letter_No,
          Title: adForm.Title,
          Instructions: adForm.Instructions,
          Terms_Conditions: adForm.Terms_Conditions,
          Adv_Doc: adForm.Adv_Doc,
          Start_Date: adForm.Start_Date,
          End_Date: adForm.End_Date,
          Clm_Strt_Dt: adForm.Clm_Strt_Dt,
          Clm_End_Dt: adForm.Clm_End_Dt,
          T_STMP_ADD: ads.find(a => String(a.Adv_ID) === String(editingAdId))?.T_STMP_ADD || new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString(),
        };

        updateProgress(30, 'Saving advertisement to Global Database...');
        await sheetService.update('Advertisement', 'Adv_ID', editingAdId, updatedAd);

        updateProgress(50, 'Managing posts...');
        // Handle posts more intelligently to avoid duplicates
        const [allPosts, allAppls] = await Promise.all([
          sheetService.getAll<Post>('Post'),
          sheetService.getAll<Application>('Application')
        ]);
        
        const existingPosts = allPosts.filter(p => String(p.Adv_ID) === String(editingAdId));
        const currentPostIds = posts.map(p => String(p.Post_ID)).filter(Boolean) as string[];

        // 1. Check if posts to delete have applications before proceeding
        const postsToDelete = existingPosts.filter(p => !currentPostIds.includes(String(p.Post_ID)));
        const adAppls = allAppls.filter(a => String(a.Adv_ID) === String(editingAdId));

        for (const p of postsToDelete) {
          const hasApps = adAppls.some(a => String(a.Post_ID) === String(p.Post_ID));
          if (hasApps) {
            toast.error(`Cannot remove post "${p.Post_Name}" because applications have already been submitted for it.`);
            setIsSubmitting(false);
            stopProgress();
            return;
          }
        }

        // Now safe to delete
        for (let i = 0; i < postsToDelete.length; i++) {
          const p = postsToDelete[i];
          updateProgress(50 + (i / postsToDelete.length) * 10, `Removing old post: ${p.Post_Name}`);
          await sheetService.delete('Post', 'Post_ID', p.Post_ID);
        }

        // 2. Update existing posts or insert new ones
        updateProgress(70, 'Updating posts...');
        let nextPostId = await sheetService.getNextId('Post', 'Post_ID');
        for (let i = 0; i < posts.length; i++) {
          const postData = posts[i];
          updateProgress(70 + (i / posts.length) * 20, `Saving post: ${postData.Post_Name}`);
          if (postData.Post_ID) {
            // Update existing post
            const updatedPost: Partial<Post> = {
              ...postData,
              T_STMP_UPD: new Date().toISOString(),
            };
            await sheetService.update('Post', 'Post_ID', postData.Post_ID, updatedPost);
          } else {
            // Insert new post
            const newPost: Post = {
              Post_ID: String(nextPostId++),
              Adv_ID: editingAdId,
              Post_Name: postData.Post_Name || '',
              Post_Type: postData.Post_Type || POST_TYPE_OPTIONS[0],
              Service_Type: postData.Service_Type || SERVICE_TYPE_OPTIONS[0],
              Class: postData.Class || CLASS_OPTIONS[0],
              Payscale: postData.Payscale || '',
              Qualification: postData.Qualification || '',
              Experience: postData.Experience || '',
              T_STMP_ADD: new Date().toISOString(),
              T_STMP_UPD: new Date().toISOString(),
            };
            await sheetService.insert('Post', newPost);
          }
        }
      } else {
        // Create new advertisement
        updateProgress(20, 'Generating ID...');
        const nextAdId = await sheetService.getNextId('Advertisement', 'Adv_ID');
        const adId = String(nextAdId);
        const newAd: Advertisement = {
          Adv_ID: adId,
          Dept_ID: (profile as any).Dept_ID,
          Office_ID: (profile as any).Office_ID,
          Letter_No: adForm.Letter_No,
          Title: adForm.Title,
          Instructions: adForm.Instructions,
          Terms_Conditions: adForm.Terms_Conditions,
          Adv_Doc: adForm.Adv_Doc,
          Start_Date: adForm.Start_Date,
          End_Date: adForm.End_Date,
          Clm_Strt_Dt: adForm.Clm_Strt_Dt,
          Clm_End_Dt: adForm.Clm_End_Dt,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString(),
        };

        updateProgress(40, 'Saving advertisement to Global Database...');
        await sheetService.insert('Advertisement', newAd);

        updateProgress(60, 'Saving posts...');
        let nextPostId = await sheetService.getNextId('Post', 'Post_ID');
        for (let i = 0; i < posts.length; i++) {
          const postData = posts[i];
          updateProgress(60 + (i / posts.length) * 30, `Saving post: ${postData.Post_Name}`);
          const newPost: Post = {
            Post_ID: String(nextPostId++),
            Adv_ID: adId,
            Post_Name: postData.Post_Name || '',
            Post_Type: postData.Post_Type || POST_TYPE_OPTIONS[0],
            Service_Type: postData.Service_Type || SERVICE_TYPE_OPTIONS[0],
            Class: postData.Class || CLASS_OPTIONS[0],
            Payscale: postData.Payscale || '',
            Qualification: postData.Qualification || '',
            Experience: postData.Experience || '',
            T_STMP_ADD: new Date().toISOString(),
            T_STMP_UPD: new Date().toISOString(),
          };
          await sheetService.insert('Post', newPost);
        }
      }

      updateProgress(100, 'Finalizing...');
      setShowNewAdModal(false);
      setEditingAdId(null);
      setIsAdFileLoading(false);
      setAdForm({ Letter_No: '', Title: '', Instructions: '', Terms_Conditions: '', Start_Date: '', End_Date: '', Adv_Doc: '' });
      setPosts([{ Post_Name: '', Post_Type: POST_TYPE_OPTIONS[0], Service_Type: SERVICE_TYPE_OPTIONS[0], Class: CLASS_OPTIONS[0], Payscale: '', Qualification: '', Experience: '' }]);
      fetchData();
    } catch (error) {
      console.error('Error saving advertisement:', error);
      setError('Error saving advertisement. Please try again.');
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleEditAd = async (ad: Advertisement) => {
    setEditingAdId(ad.Adv_ID);
    setIsAdFileLoading(false);
    setAdForm({
      Letter_No: ad.Letter_No || '',
      Title: ad.Title || '',
      Instructions: ad.Instructions || '',
      Terms_Conditions: ad.Terms_Conditions || '',
      Adv_Doc: ad.Adv_Doc || '',
      Start_Date: formatDateForInput(ad.Start_Date),
      End_Date: formatDateForInput(ad.End_Date),
      Clm_Strt_Dt: ad.Clm_Strt_Dt ? formatDateForInput(ad.Clm_Strt_Dt) : '',
      Clm_End_Dt: ad.Clm_End_Dt ? formatDateForInput(ad.Clm_End_Dt) : '',
    });

    // Fetch posts for this ad
    try {
      const allPosts = await sheetService.getAll<Post>('Post');
      const adPosts = allPosts.filter(p => String(p.Adv_ID) === String(ad.Adv_ID));
      setPosts(adPosts.length > 0 ? adPosts : [{ Post_Name: '', Post_Type: POST_TYPE_OPTIONS[0], Service_Type: SERVICE_TYPE_OPTIONS[0], Class: CLASS_OPTIONS[0], Payscale: '', Qualification: '', Experience: '' }]);
      setShowNewAdModal(true);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleDeleteAd = async (adId: string | null) => {
    if (!adId) return;
    
    setIsSubmitting(true);
    setError(null);
    startProgress('Checking for dependencies...');
    
    try {
      // Fetch applications to check dependency
      const allAppls = await sheetService.getAll<Application>('Application');
      const hasApplications = allAppls.some(a => String(a.Adv_ID).trim() === String(adId).trim());

      if (hasApplications) {
        toast.error('Cannot delete this advertisement because applications have already been submitted against it. Please delete the applications first or mark the advertisement as inactive.');
        setDeletingAdId(null);
        return;
      }

      startProgress('Deleting advertisement and related posts...');
      
      // 1. Fetch related posts
      const allPosts = await sheetService.getAll<Post>('Post');
      const adPosts = allPosts.filter(p => String(p.Adv_ID) === String(adId));
      
      // 2. Delete advertisement
      await sheetService.delete('Advertisement', 'Adv_ID', adId);
      
      // 3. Delete posts
      if (adPosts.length > 0) {
        for (let i = 0; i < adPosts.length; i++) {
          const p = adPosts[i];
          updateProgress(50 + (i / adPosts.length) * 40, `Removing post: ${p.Post_Name}`);
          await sheetService.delete('Post', 'Post_ID', p.Post_ID);
        }
      }

      updateProgress(100, 'Deletion process completed successfully');
      setAds(prev => prev.filter(ad => String(ad.Adv_ID) !== String(adId)));
      fetchData();
      setDeletingAdId(null);
      
    } catch (error) {
      console.error('Error during deletion process:', error);
      setError('Error deleting advertisement. Please try again.');
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleViewApplication = async (app: Application) => {
    setIsLoading(true);
    try {
      const [profiles, addInfos, addrInfos, quals, exps] = await Promise.all([
        sheetService.getAll<GeneralUser>('General_User'),
        sheetService.getAll<AdditionalInfo>('Additional_Info'),
        sheetService.getAll<AddressInfo>('Address_Info'),
        sheetService.getAll<QualificationInfo>('Qualification_Info'),
        sheetService.getAll<ExperienceInfo>('Experience_Info'),
      ]);

      const profile = profiles.find(p => String(p.User_ID) === String(app.User_ID));
      const addInfo = addInfos.find(i => String(i.Appl_ID) === String(app.Appl_ID));
      const addrInfo = addrInfos.find(i => String(i.Appl_ID) === String(app.Appl_ID));
      const appQuals = quals.filter(q => String(q.Appl_ID) === String(app.Appl_ID));
      const appExps = exps.filter(e => String(e.Appl_ID) === String(app.Appl_ID));

      setViewingApplication(app);
      setApplicantProfile(profile || null);
      setAdditionalInfo(addInfo || null);
      setAddressInfo(addrInfo || null);
      setQualifications(appQuals);
      setExperiences(appExps);
      setReviewForm({ 
        Status: app.Status || 'Submitted', 
        Remark: app.Remark || '' 
      });
      
      // Set first available document as active
      if (profile?.ID_Doc) setActiveDocUrl(profile.ID_Doc);
      else if (profile?.DOB_Doc) setActiveDocUrl(profile.DOB_Doc);
      else if (addInfo?.Domicile_Certificate_URL) setActiveDocUrl(addInfo.Domicile_Certificate_URL);
      else if (addInfo?.Caste_Certificate_URL) setActiveDocUrl(addInfo.Caste_Certificate_URL);
      else setActiveDocUrl(null);

    } catch (error) {
      console.error('Error fetching application details:', error);
      setError('Failed to load application details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingApplication) return;

    setIsSubmitting(true);
    startProgress('Saving review decision...');
    try {
      await sheetService.update('Application', 'Appl_ID', viewingApplication.Appl_ID, {
        Status: reviewForm.Status,
        Remark: reviewForm.Remark,
        T_STMP_UPD: new Date().toISOString()
      });
      
      // Update local state
      setApplications(prev => prev.map(a => 
        String(a.Appl_ID) === String(viewingApplication.Appl_ID) 
          ? { ...a, Status: reviewForm.Status, Remark: reviewForm.Remark } 
          : a
      ));
      
      setViewingApplication(null);
      updateProgress(100, 'Review saved successfully!');
    } catch (error) {
      console.error('Error saving review:', error);
      setError('Failed to save review. Please try again.');
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const handleActionClaim = async (action: 'Verified' | 'Rejected') => {
    if (!viewingClaim) return;

    setIsSubmitting(true);
    startProgress(action === 'Verified' ? 'Verifying claim and updating eligibility...' : 'Rejecting claim...');
    try {
      await sheetService.update('Claim', 'Claim_ID', viewingClaim.Claim_ID, {
        Status: action,
        Officer_Remark: reviewForm.Remark,
        T_STMP_UPD: new Date().toISOString()
      });

      if (action === 'Verified') {
        const appl = applications.find(a => String(a.Appl_ID) === String(viewingClaim.Appl_ID));
        if (appl) {
          await sheetService.update('Application', 'Appl_ID', appl.Appl_ID, {
            Status: 'Eligible',
            Remark: `Claim Verified: ${reviewForm.Remark}`,
            T_STMP_UPD: new Date().toISOString()
          });
          
          setApplications(prev => prev.map(a => 
            String(a.Appl_ID) === String(appl.Appl_ID) 
              ? { ...a, Status: 'Eligible', Remark: `Claim Verified: ${reviewForm.Remark}` } 
              : a
          ));
        }
      }

      setClaims(prev => prev.map(c => 
        String(c.Claim_ID) === String(viewingClaim.Claim_ID) 
          ? { ...c, Status: action, Officer_Remark: reviewForm.Remark } 
          : c
      ));

      setViewingClaim(null);
      updateProgress(100, `Claim ${action} successfully!`);
    } catch (error) {
      console.error('Error processing claim:', error);
      setError('Failed to process claim. Please try again.');
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  const exportToExcel = async (specificAd?: Advertisement) => {
    if (applications.length === 0 && !specificAd) {
      toast.error('No application data found to export.');
      return;
    }

    const adToExport = specificAd || ads.find(a => String(a.Adv_ID).trim() === String(selectedAdId).trim());
    const adTitle = adToExport ? adToExport.Title : 'All_Office_Data';

    startProgress(`Preparing detailed Excel export for ${adTitle}...`);
    try {
      updateProgress(10, 'Fetching additional application details...');
      const [allGeneralUsers, allAddl, allAddr, allQual, allExp, allPosts, allAppls] = await Promise.all([
        sheetService.getAll<GeneralUser>('General_User'),
        sheetService.getAll<AdditionalInfo>('Additional_Info'),
        sheetService.getAll<AddressInfo>('Address_Info'),
        sheetService.getAll<QualificationInfo>('Qualification_Info'),
        sheetService.getAll<ExperienceInfo>('Experience_Info'),
        sheetService.getAll<Post>('Post'),
        sheetService.getAll<Application>('Application'),
      ]);

      let filteredApps: Application[] = [];
      if (adToExport) {
        const targetAdId = String(adToExport.Adv_ID).trim();
        filteredApps = allAppls.filter(a => String(a.Adv_ID).trim() === targetAdId);
      } else if (selectedAdId) {
        const targetAdId = String(selectedAdId).trim();
        filteredApps = allAppls.filter(a => String(a.Adv_ID).trim() === targetAdId);
      } else {
        // Find all applications for all ads belonging to this office
        const officeAdIds = ads.map(a => String(a.Adv_ID).trim());
        filteredApps = allAppls.filter(a => officeAdIds.includes(String(a.Adv_ID).trim()));
      }

      if (filteredApps.length === 0) {
        toast.error('No applications found for the selected criteria.');
        return;
      }

      updateProgress(50, 'Processing data...');
      const exportData = filteredApps.map(apl => {
        const userId = String(apl.User_ID).trim();
        const applId = String(apl.Appl_ID).trim();
        
        const gUser = allGeneralUsers.find(gu => String(gu.User_ID).trim() === userId);
        const addl = allAddl.find(ai => String(ai.Appl_ID).trim() === applId);
        const addr = allAddr.find(ai => String(ai.Appl_ID).trim() === applId);
        const post = allPosts.find(p => String(p.Post_ID).trim() === String(apl.Post_ID).trim());
        const ad = ads.find(a => String(a.Adv_ID).trim() === String(apl.Adv_ID).trim());
        const quals = allQual.filter(q => String(q.Appl_ID).trim() === applId);
        const exps = allExp.filter(e => String(e.Appl_ID).trim() === applId);

        return {
          // Application Basic
          'Application ID': apl.Appl_ID,
          'Advertisement': ad?.Title || 'N/A',
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

          // document URLs
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

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary_Report');

      // Detailed Education
      const eduData = filteredApps.flatMap(apl => {
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
        const wsEdu = XLSX.utils.json_to_sheet(eduData);
        XLSX.utils.book_append_sheet(wb, wsEdu, 'Education_Details');
      }

      // Detailed Experience
      const expData = filteredApps.flatMap(apl => {
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
        const wsExp = XLSX.utils.json_to_sheet(expData);
        XLSX.utils.book_append_sheet(wb, wsExp, 'Experience_Details');
      }

      updateProgress(80, 'Generating file...');
      const timestamp = new Date().getTime();
      const officeName = (profile as any).Office_Name || 'Office';
      XLSX.writeFile(wb, `Office_Export_${officeName.replace(/ /g, '_')}_${timestamp}.xlsx`);
      updateProgress(100, 'Export successful!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Error exporting data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      stopProgress();
    }
  };

  const isReviewFacilityOpen = (adId: string) => {
    const ad = ads.find(a => String(a.Adv_ID) === String(adId));
    if (!ad) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(ad.End_Date);
    return today > endDate;
  };

  const filteredApplications = applications.filter(a => {
    const isAdMatch = !selectedAdId || String(a.Adv_ID) === String(selectedAdId);
    const isPostMatch = !selectedPostId || String(a.Post_ID) === String(selectedPostId);
    const isFacilityOpen = isReviewFacilityOpen(a.Adv_ID);
    return isAdMatch && isPostMatch && isFacilityOpen;
  });

  const handleNextApplication = () => {
    if (!viewingApplication) return;
    const currentIndex = filteredApplications.findIndex(a => String(a.Appl_ID) === String(viewingApplication.Appl_ID));
    if (currentIndex < filteredApplications.length - 1) {
      handleViewApplication(filteredApplications[currentIndex + 1]);
    }
  };

  const handlePrevApplication = () => {
    if (!viewingApplication) return;
    const currentIndex = filteredApplications.findIndex(a => String(a.Appl_ID) === String(viewingApplication.Appl_ID));
    if (currentIndex > 0) {
      handleViewApplication(filteredApplications[currentIndex - 1]);
    }
  };

  const downloadApplicationPDF = async () => {
    if (!viewingApplication || !applicantProfile) return;
    
    setIsGeneratingPDF(true);
    startProgress('Generating complete application PDF (with certificates)...');
    
    try {
      const ad = ads.find(a => String(a.Adv_ID) === String(viewingApplication.Adv_ID));
      const post = allPosts.find(p => String(p.Post_ID) === String(viewingApplication.Post_ID));
      
      await pdfService.generateApplicationPDF(
        viewingApplication,
        applicantProfile,
        additionalInfo,
        addressInfo,
        qualifications,
        experiences,
        ad?.Title || 'N/A',
        post?.Post_Name || 'N/A',
        t,
        {
          includeCertificates: true,
          onProgress: (msg, prog) => updateProgress(prog, msg)
        }
      );
    } catch (error) {
      console.error('Error generating office PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
      stopProgress();
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl inline-block">
          <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600">Your office user profile could not be loaded. Please contact the system administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('office.title')}</h1>
          <p className="text-gray-600">{t('office.subtitle')}</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('office.export_data')}
          </button>
          <button
            onClick={() => setShowNewAdModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('office.new_adv')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'ads' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('office.tabs.ads')}
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'review' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('office.tabs.review')}
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'claims' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('office.tabs.claims')}
        </button>
      </div>

      {activeTab === 'ads' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{t('office.stats.active')}</span>
              </div>
              <p className="text-sm text-gray-500">{t('office.stats.total_ads')}</p>
              <p className="text-2xl font-bold text-gray-900">{ads.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500">{t('office.stats.appls')}</p>
              <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-red-100 p-2 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500">{t('office.stats.pending_claims')}</p>
              <p className="text-2xl font-bold text-gray-900">{claims.filter(c => c.Status === 'Pending').length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <button
                onClick={() => setShowNewAdModal(true)}
                className="flex items-center justify-center w-full py-3 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-colors border border-blue-100"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('office.new_adv')}
              </button>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{t('office.table.ads_title')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">{t('office.table.ref_no')}</th>
                    <th className="px-6 py-3">{t('office.table.title')}</th>
                    <th className="px-6 py-3">{t('office.table.period')}</th>
                    <th className="px-6 py-3">{t('office.table.appls')}</th>
                    <th className="px-6 py-3 text-right">{t('office.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {ads.map((ad, index) => {
                      return (
                        <tr key={`${ad.Adv_ID}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono">{ad.Letter_No}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{ad.Title}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(ad.Start_Date)} - {formatDate(ad.End_Date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {applications.filter(a => String(a.Adv_ID) === String(ad.Adv_ID)).length}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => exportToExcel(ad)}
                              className="p-1 rounded transition-colors text-gray-400 hover:text-green-600 inline-block"
                              title={t('office.table.export_excel')}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {ad.Adv_Doc && (
                              <a 
                                href={ad.Adv_Doc} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1 rounded transition-colors text-gray-400 hover:text-green-600 inline-block"
                                title={t('office.table.view_doc')}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {(() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const startDate = new Date(ad.Start_Date);
                              // Use the same snapping logic as utils.ts for consistency
                              const snappedStart = new Date(startDate.getTime() + (12 * 60 * 60 * 1000));
                              snappedStart.setHours(0, 0, 0, 0);
                              
                              const hasStarted = today >= snappedStart;
                              
                              if (hasStarted) return null;
                              
                              return (
                                <>
                                  <button 
                                    onClick={() => handleEditAd(ad)}
                                    className="p-1 rounded transition-colors text-gray-400 hover:text-blue-600"
                                    title={t('office.table.edit_adv')}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setDeletingAdId(ad.Adv_ID)}
                                    className="p-1 rounded transition-colors text-gray-400 hover:text-red-600"
                                    title={t('office.table.delete_adv')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'claims' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('office.tabs.claims')}</h3>
                <p className="text-sm text-gray-500">{t('office.subtitle')}</p>
              </div>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                  {t('office.pending_review_count', { count: claims.filter(c => c.Status === 'Pending').length })}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold">
                  <tr>
                    <th className="px-6 py-3">{t('office.table.app_id')}</th>
                    <th className="px-6 py-3">{t('office.table.applicant')}</th>
                    <th className="px-6 py-3">{t('office.table.claim_reason')}</th>
                    <th className="px-6 py-3">{t('office.table.date')}</th>
                    <th className="px-6 py-3">{t('office.table.status')}</th>
                    <th className="px-6 py-3 text-right">{t('office.table.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 italic text-xs">
                  {claims.length > 0 ? (
                    claims.map((claim, idx) => {
                      const candidate = allGeneralUsers.find(u => String(u.User_ID) === String(claim.User_ID));
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-mono font-bold text-blue-600">{claim.Appl_ID}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{candidate?.Candidate_Name || t('common.unknown', 'Unknown')}</td>
                          <td className="px-6 py-4 max-w-xs truncate">{claim.Description}</td>
                          <td className="px-6 py-4 text-gray-500">{formatDate(claim.T_STMP_ADD)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              claim.Status === 'Verified' ? 'bg-green-100 text-green-700' :
                              claim.Status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {translateConstant(t, claim.Status || '')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setViewingClaim(claim);
                                setReviewForm({ Status: claim.Status, Remark: claim.Officer_Remark || '' });
                                const profile = allGeneralUsers.find(p => String(p.User_ID) === String(claim.User_ID));
                                setApplicantProfile(profile || null);
                                setActiveDocUrl(claim.Proof_Doc_URL);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center justify-end ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> {t('office.table.view_action')}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-normal">{t('office.no_claims')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('office.select_adv')}</label>
                <select
                  value={selectedAdId}
                  onChange={(e) => {
                    setSelectedAdId(e.target.value);
                    setSelectedPostId('');
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                >
                  <option value="">{t('office.all_ads')}</option>
                  {ads.map(ad => <option key={ad.Adv_ID} value={ad.Adv_ID}>{ad.Title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('office.select_post')}</label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  disabled={!selectedAdId}
                >
                  <option value="">{t('office.all_posts')}</option>
                  {allPosts
                    .filter(p => String(p.Adv_ID) === String(selectedAdId))
                    .map(post => <option key={post.Post_ID} value={post.Post_ID}>{post.Post_Name}</option>)
                  }
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">{t('office.appls_received')}</h2>
              <div className="text-sm text-gray-500">
                {t('office.showing_count', { count: filteredApplications.length })}
              </div>
            </div>

            {selectedAdId && !isReviewFacilityOpen(selectedAdId) ? (
              <div className="p-12 text-center">
                <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl inline-block max-w-lg">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('office.review_not_open')}</h3>
                  <p className="text-gray-600 mb-4">
                    {t('office.review_open_info')}
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-amber-100 text-sm font-bold text-amber-700">
                    {t('office.expected_open', { date: formatDate(new Date(new Date(ads.find(a => String(a.Adv_ID) === String(selectedAdId))?.End_Date || '').getTime() + 86400000).toISOString()) })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                    <tr>
                      <th className="px-6 py-3">{t('office.table.app_id')}</th>
                      <th className="px-6 py-3">{t('office.table.candidate')}</th>
                      <th className="px-6 py-3">{t('office.table.post')}</th>
                      <th className="px-6 py-3">{t('office.table.status')}</th>
                      <th className="px-6 py-3 text-right">{t('office.table.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredApplications.map((app) => {
                         const post = allPosts.find(p => String(p.Post_ID) === String(app.Post_ID));
                         const applicant = allGeneralUsers?.find(u => String(u.User_ID) === String(app.User_ID));
                         return (
                           <tr key={app.Appl_ID} className="hover:bg-gray-50">
                             <td className="px-6 py-4 text-sm font-mono">{app.Appl_ID}</td>
                             <td className="px-6 py-4 text-sm font-medium text-gray-900">
                               {applicant?.Candidate_Name || `User ID: ${app.User_ID}`}
                               {applicant?.Candidate_Name_HI && <p className="text-xs text-gray-500 font-normal">{applicant.Candidate_Name_HI}</p>}
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-600">{post?.Post_Name}</td>
                             <td className="px-6 py-4 text-sm">
                               <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                 app.Status === 'Eligible' ? 'bg-green-100 text-green-700' :
                                 app.Status === 'Ineligible' ? 'bg-red-100 text-red-700' :
                                 'bg-blue-100 text-blue-700'
                               }`}>
                                 {translateConstant(t, app.Status || 'Submitted')}
                               </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                               <button
                                 onClick={() => handleViewApplication(app)}
                                 className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center ml-auto"
                               >
                                 <Eye className="w-4 h-4 mr-1" /> {t('office.table.review')}
                               </button>
                             </td>
                           </tr>
                         );
                       })
                     }
                     {filteredApplications.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                          {t('office.showing_count', { count: 0 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Application Review Modal */}
      <AnimatePresence>
        {viewingApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-700 text-white">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-1">
                    <button 
                      onClick={handlePrevApplication}
                      disabled={filteredApplications.findIndex(a => String(a.Appl_ID) === String(viewingApplication.Appl_ID)) === 0}
                      className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Previous Application"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={handleNextApplication}
                      disabled={filteredApplications.findIndex(a => String(a.Appl_ID) === String(viewingApplication.Appl_ID)) === filteredApplications.length - 1}
                      className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Next Application"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t('office.review_modal.title')}: {viewingApplication.Appl_ID}</h3>
                    <p className="text-blue-100 text-sm">
                      {t('office.review_modal.candidate')}: {applicantProfile?.Candidate_Name || t('common.loading', 'Loading...')} 
                      <span className="mx-2 opacity-50">|</span> 
                      {t('office.review_modal.count_info', { current: filteredApplications.findIndex(a => String(a.Appl_ID) === String(viewingApplication.Appl_ID)) + 1, total: filteredApplications.length })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={downloadApplicationPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isGeneratingPDF ? t('office.review_modal.generating') : t('office.review_modal.full_pdf')}</span>
                  </button>
                  <button onClick={() => {
                    setViewingApplication(null);
                    setActiveDocUrl(null);
                  }} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                  {/* Left Column: Applicant Details (7/12) */}
                  <div className="lg:col-span-7 space-y-6 overflow-y-auto pr-2">
                    {/* Personal Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 uppercase text-sm tracking-wider text-blue-600 flex items-center">
                        <User className="w-4 h-4 mr-2" /> {t('office.review_modal.personal_details')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.name')}</p>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{applicantProfile?.Candidate_Name}</p>
                            <p className="text-xs text-gray-500">{applicantProfile?.Candidate_Name_HI}</p>
                          </div>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.father')}</p>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{applicantProfile?.Father_Name}</p>
                            <p className="text-xs text-gray-500">{applicantProfile?.Father_Name_HI}</p>
                          </div>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.mother')}</p>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{applicantProfile?.Mother_Name}</p>
                            <p className="text-xs text-gray-500">{applicantProfile?.Mother_Name_HI}</p>
                          </div>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.gender')}</p>
                          <p className="text-sm font-medium text-gray-900">{translateConstant(t, applicantProfile?.Gender || '')}</p>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.dob')}</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(applicantProfile?.DOB || '')}</p>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('apply.caste_category')}</p>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{translateConstant(t, additionalInfo?.Caste_Category || '')}</p>
                            {additionalInfo?.Caste_Category !== 'GEN' && (
                              <p className="text-[10px] text-gray-500">{translateConstant(t, additionalInfo?.Caste_District || '')}, {translateConstant(t, additionalInfo?.Caste_State || '')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.mobile')}</p>
                          <p className="text-sm font-medium text-gray-900">{applicantProfile?.Mobile}</p>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.email')}</p>
                          <p className="text-sm font-medium text-gray-900">{applicantProfile?.Email_ID}</p>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('profile.form.id_proof')} ({translateConstant(t, applicantProfile?.ID_Proof || '')})</p>
                          <p className="text-sm font-medium text-gray-900">{applicantProfile?.ID_Number}</p>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <p className="text-xs text-gray-500 uppercase font-semibold">{t('apply.domicile_cg')}</p>
                          <div className="text-right">
                             <p className="text-sm font-medium text-gray-900">{translateConstant(t, additionalInfo?.Is_CG === 'Yes' ? 'Yes' : 'No')}</p>
                             <p className="text-[10px] text-gray-500">{translateConstant(t, additionalInfo?.Locality || '')} ({translateConstant(t, additionalInfo?.Domicile_District || '')})</p>
                          </div>
                        </div>
                        {additionalInfo?.Is_PWD === 'Yes' && (
                          <div className="flex justify-between border-b border-gray-50 pb-1 col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-semibold">{t('apply.is_pwd')}</p>
                            <p className="text-sm font-medium text-gray-900">{additionalInfo?.PwD_Percentage}% {t('apply.pwd_percentage')} ({translateConstant(t, additionalInfo?.PwD_District || '')}, {translateConstant(t, additionalInfo?.PwD_State || '')})</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Qualifications Table */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 uppercase text-sm tracking-wider text-blue-600 flex items-center">
                        <GraduationCap className="w-4 h-4 mr-2" /> {t('office.review_modal.edu_details')}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                              <th className="px-3 py-2 border">{t('apply.sum_type')}</th>
                              <th className="px-3 py-2 border">{t('apply.course_name')}</th>
                              <th className="px-3 py-2 border">{t('apply.board_univ')}</th>
                              <th className="px-3 py-2 border text-center">{t('apply.pass_year')}</th>
                              <th className="px-3 py-2 border text-center">{t('apply.result_status')}</th>
                              <th className="px-3 py-2 border text-center">% / CGPA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {qualifications.map((q, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 border text-gray-600">{translateConstant(t, q.Qualification_Type || '')}</td>
                                <td className="px-3 py-2 border font-medium text-gray-900">{q.Course_Name}</td>
                                <td className="px-3 py-2 border text-gray-600">{q.Board_Name}</td>
                                <td className="px-3 py-2 border text-center text-gray-600">{q.Pass_Year}</td>
                                <td className="px-3 py-2 border text-center">
                                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">{translateConstant(t, q.Result_Status || '')}</span>
                                </td>
                                <td className="px-3 py-2 border text-center font-bold text-blue-600">{q.Percentage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Experience Table */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 uppercase text-sm tracking-wider text-blue-600 flex items-center">
                        <Briefcase className="w-4 h-4 mr-2" /> {t('office.review_modal.exp_details')}
                      </h4>
                      <div className="overflow-x-auto">
                        {experiences.length > 0 ? (
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                                <th className="px-3 py-2 border">{t('apply.post_held')}</th>
                                <th className="px-3 py-2 border">{t('apply.employer_name')}</th>
                                <th className="px-3 py-2 border text-center">{t('apply.sum_period')}</th>
                                <th className="px-3 py-2 border">{t('apply.sum_type')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {experiences.map((e, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 border font-medium text-gray-900">{e.Post_Held}</td>
                                  <td className="px-3 py-2 border text-gray-600">{e.Employer_Name}</td>
                                  <td className="px-3 py-2 border text-center text-xs text-gray-500">
                                    {formatDate(e.Start_Date)} - {e.End_Date ? formatDate(e.End_Date) : t('common.present', 'Present')}
                                  </td>
                                  <td className="px-3 py-2 border text-gray-600">{translateConstant(t, e.Employment_Type || '')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-xs text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed">{t('office.review_modal.no_exp')}</p>
                        )}
                      </div>
                    </div>

                    {/* Address Details */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 uppercase text-sm tracking-wider text-blue-600 flex items-center">
                        <Home className="w-4 h-4 mr-2" /> {t('office.review_modal.addr_details')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('apply.perm_address')}</p>
                          <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700 leading-relaxed">
                            {addressInfo?.Perm_Address}<br />
                            {addressInfo?.Perm_Landmark}<br />
                            {addressInfo?.Perm_District}, {addressInfo?.Perm_State} - {addressInfo?.Perm_Pincode}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('apply.curr_address')}</p>
                          <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700 leading-relaxed">
                            {addressInfo?.Curr_Address}<br />
                            {addressInfo?.Curr_Landmark}<br />
                            {addressInfo?.Curr_District}, {addressInfo?.Curr_State} - {addressInfo?.Curr_Pincode}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Review Sidebar (5/12) */}
                  <div className="lg:col-span-5 space-y-6 flex flex-col h-full">
                    {/* Photo & Signature */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center">
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{t('office.review_modal.photo')}</p>
                          <div className="w-full aspect-[3/4] bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-100 shadow-inner">
                            {applicantProfile?.Photo_URL ? (
                              <img 
                                src={getEmbedUrl(applicantProfile.Photo_URL)} 
                                alt="Photo" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">{t('common.no_data', 'No Data')}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{t('office.review_modal.sign')}</p>
                          <div className="w-full aspect-[3/1] bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-100 shadow-inner mt-auto">
                            {applicantProfile?.Signature_URL ? (
                              <img 
                                src={getEmbedUrl(applicantProfile.Signature_URL)} 
                                alt="Signature" 
                                className="w-full h-full object-contain" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">{t('common.no_data', 'No Data')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Selection & Viewer */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden min-h-[450px]">
                      <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">{t('office.review_modal.doc_selection')}</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'ID', fullLabel: 'ID Proof', url: applicantProfile?.ID_Doc },
                            { label: 'DOB', fullLabel: 'DOB Cert.', url: applicantProfile?.DOB_Doc },
                            { label: 'Dom.', fullLabel: 'Domicile', url: additionalInfo?.Domicile_Certificate_URL },
                            { label: 'Caste', fullLabel: 'Caste Cert.', url: additionalInfo?.Caste_Certificate_URL },
                            { label: 'PwD', fullLabel: 'PwD Cert.', url: additionalInfo?.PwD_Certificate_URL },
                          ].filter(d => d.url).map((doc, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveDocUrl(doc.url || null)}
                              title={doc.fullLabel}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all border ${
                                activeDocUrl === doc.url 
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                              }`}
                            >
                              {doc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-gray-200 relative">
                        {activeDocUrl ? (
                          activeDocUrl.startsWith('data:image/') || activeDocUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <div className="w-full h-full flex items-center justify-center p-4 bg-gray-100 overflow-auto">
                              <img 
                                src={getEmbedUrl(activeDocUrl)} 
                                alt="Document Preview" 
                                className="max-w-full max-h-full shadow-lg"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <iframe
                              src={getDocPreviewUrl(activeDocUrl)}
                              className="w-full h-full border-0 bg-white"
                              title={t('office.review_modal.preview')}
                            />
                          )
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                            <FileText className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-xs font-medium">{t('office.review_modal.select_doc_info')}</p>
                          </div>
                        )}
                      </div>
                      
                      {activeDocUrl && (
                        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex justify-end">
                          <a 
                            href={activeDocUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> {t('office.review_modal.open_original')}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Review Decision */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center text-sm">
                        <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" />
                        {t('office.review_modal.decision')}
                      </h4>
                      <form onSubmit={handleSaveReview} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t('office.table.status')}</label>
                            <select
                              required
                              value={reviewForm.Status}
                              onChange={(e) => setReviewForm({ ...reviewForm, Status: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                              <option value="Submitted">{translateConstant(t, 'Submitted')}</option>
                              <option value="Eligible">{translateConstant(t, 'Eligible')}</option>
                              <option value="Ineligible">{translateConstant(t, 'Ineligible')}</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                            >
                              {isSubmitting ? t('office.review_modal.saving') : t('office.review_modal.submit_decision')}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t('office.review_modal.official_remarks')}</label>
                          <textarea
                            required
                            rows={2}
                            value={reviewForm.Remark}
                            onChange={(e) => setReviewForm({ ...reviewForm, Remark: e.target.value })}
                            placeholder={t('office.review_modal.remarks_placeholder')}
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Claim Modal */}
      <AnimatePresence>
        {viewingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white shadow-lg">
                <div className="flex items-center">
                  <div className="bg-white/20 p-2 rounded-lg mr-3">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">{t('office.claim_modal.title')}</h3>
                    <p className="text-[10px] text-blue-100 font-medium">{t('office.table.app_id')}: {viewingClaim.Appl_ID}</p>
                  </div>
                </div>
                <button onClick={() => setViewingClaim(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                  {/* Left Column: Claim Details (7/12) */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 uppercase text-xs tracking-wider text-blue-600 flex items-center">
                        <FileText className="w-4 h-4 mr-2" /> {t('office.claim_modal.claim_details')}
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('office.claim_modal.applicant_desc')}</p>
                          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed border italic">
                            "{viewingClaim.Description}"
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('office.table.candidate')}</p>
                            <p className="text-sm font-bold text-gray-900">{applicantProfile?.Candidate_Name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('profile.form.mobile')}</p>
                            <p className="text-sm font-bold text-gray-900">{applicantProfile?.Mobile || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 uppercase text-xs tracking-wider text-green-600 flex items-center">
                        <Eye className="w-4 h-4 mr-2" /> {t('office.claim_modal.proof')}
                      </h4>
                      <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden relative min-h-[400px] border">
                        {activeDocUrl ? (
                          activeDocUrl.startsWith('data:image/') || activeDocUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <div className="w-full h-full flex items-center justify-center p-4 bg-gray-200">
                              <img 
                                src={getEmbedUrl(activeDocUrl)} 
                                alt="Proof Preview" 
                                className="max-w-full max-h-full shadow-lg"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <iframe
                              src={getDocPreviewUrl(activeDocUrl)}
                              className="w-full h-full border-0 bg-white"
                              title={t('office.claim_modal.proof')}
                            />
                          )
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                            <FileText className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm font-medium">{t('common.no_data', 'No Data')}</p>
                          </div>
                        )}
                      </div>
                      {activeDocUrl && (
                        <div className="mt-3 flex justify-end">
                          <a href={activeDocUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center">
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> {t('office.review_modal.open_original')}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Decision (5/12) */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-0">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center text-sm">
                        <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" />
                        {t('office.review_modal.decision')}
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">{t('office.review_modal.official_remarks')}</label>
                          <textarea
                            required
                            rows={4}
                            value={reviewForm.Remark}
                            onChange={(e) => setReviewForm({ ...reviewForm, Remark: e.target.value })}
                            placeholder={t('office.review_modal.remarks_placeholder')}
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          />
                        </div>

                        <div className="flex flex-col space-y-3">
                          <button
                            onClick={() => handleActionClaim('Verified')}
                            disabled={isSubmitting || !reviewForm.Remark}
                            className="w-full bg-green-600 text-white p-3 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center justify-center uppercase tracking-wider"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {isSubmitting ? t('office.claim_modal.verifying') : t('office.claim_modal.verify')}
                          </button>
                          <button
                            onClick={() => handleActionClaim('Rejected')}
                            disabled={isSubmitting || !reviewForm.Remark}
                            className="w-full bg-red-600 text-white p-3 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center uppercase tracking-wider"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {isSubmitting ? t('office.claim_modal.rejecting') : t('office.claim_modal.reject')}
                          </button>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-[10px] text-blue-800 leading-normal">
                            <span className="font-bold block mb-1">{t('apply.important_note')}:</span>
                            {t('office.claim_modal.verifying_info', 'Verifying a claim will automatically update the candidate\'s application status to Eligible and add your remark.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingAdId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 bg-red-600 text-white">
                <h3 className="text-lg font-bold">{t('manage_applications.delete_confirm')}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  {t('manage_applications.delete_warning')}
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setDeletingAdId(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteAd(deletingAdId)}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? t('common.deleting', 'Deleting...') : t('common.delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Advertisement Modal */}
      <AnimatePresence>
        {showNewAdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white">
                <h3 className="text-lg font-bold">{editingAdId ? 'Edit Advertisement' : 'Create New Advertisement'}</h3>
                <button 
                  onClick={() => {
                    setShowNewAdModal(false);
                    setEditingAdId(null);
                    setIsAdFileLoading(false);
                    setAdForm({ Letter_No: '', Title: '', Instructions: '', Terms_Conditions: '', Start_Date: '', End_Date: '', Adv_Doc: '' });
                    setPosts([{ Post_Name: '', Post_Type: POST_TYPE_OPTIONS[0], Service_Type: SERVICE_TYPE_OPTIONS[0], Class: CLASS_OPTIONS[0], Payscale: '', Qualification: '', Experience: '' }]);
                  }} 
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSaveAd} className="p-6 overflow-y-auto">
                {error && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 flex items-center text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-1">Basic Details</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Letter Number</label>
                      <input
                        type="text"
                        required
                        value={adForm.Letter_No}
                        onChange={e => setAdForm({ ...adForm, Letter_No: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
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
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input
                          type="date"
                          required
                          value={adForm.Start_Date}
                          onChange={e => setAdForm({ ...adForm, Start_Date: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                          type="date"
                          required
                          value={adForm.End_Date}
                          onChange={e => setAdForm({ ...adForm, End_Date: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Claim Start Date</label>
                        <input
                          type="date"
                          value={adForm.Clm_Strt_Dt}
                          onChange={e => setAdForm({ ...adForm, Clm_Strt_Dt: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Claim End Date</label>
                        <input
                          type="date"
                          value={adForm.Clm_End_Dt}
                          onChange={e => setAdForm({ ...adForm, Clm_End_Dt: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Detail Advertisement (PDF)</label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleAdFileChange}
                          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {isAdFileLoading && <p className="mt-1 text-xs text-blue-600">Reading file...</p>}
                        {adForm.Adv_Doc && !isAdFileLoading && (
                          <p className="mt-1 text-xs text-green-600 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" /> {adForm.Adv_Doc.startsWith('data:') ? 'New file ready' : 'Current document exists'}. Upload new to replace.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-1">Content</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Instructions</label>
                      <textarea
                        required
                        rows={3}
                        value={adForm.Instructions}
                        onChange={e => setAdForm({ ...adForm, Instructions: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
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
                    <h4 className="font-bold text-gray-900">Post Mapping</h4>
                    <button
                      type="button"
                      onClick={handleAddPost}
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-100 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Post
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
                          <label className="block text-xs font-medium text-gray-500">Post Name</label>
                          <input
                            type="text"
                            required
                            value={post.Post_Name}
                            onChange={e => handlePostChange(index, 'Post_Name', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Post Type</label>
                          <select
                            value={post.Post_Type}
                            onChange={e => handlePostChange(index, 'Post_Type', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                          >
                            {POST_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Service Type</label>
                          <select
                            value={post.Service_Type}
                            onChange={e => handlePostChange(index, 'Service_Type', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                          >
                            {SERVICE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Class</label>
                          <select
                            value={post.Class}
                            onChange={e => handlePostChange(index, 'Class', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                          >
                            {CLASS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Payscale</label>
                          <input
                            type="text"
                            value={post.Payscale}
                            onChange={e => handlePostChange(index, 'Payscale', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                          />
                        </div>
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Qualification</label>
                            <textarea
                              rows={2}
                              value={post.Qualification}
                              onChange={e => handlePostChange(index, 'Qualification', e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md p-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Experience</label>
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
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? 'Saving...' : <><Save className="w-5 h-5 mr-2" /> Save Advertisement & Posts</>}
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

export default OfficeDashboard;
