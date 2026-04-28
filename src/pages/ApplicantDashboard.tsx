import React, { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { useAuth } from '../context/AuthContext';
import { Application, Advertisement, Post, AdditionalInfo, AddressInfo, QualificationInfo, ExperienceInfo, Claim } from '../types';
import { FileText, Download, Clock, CheckCircle, User as UserIcon, Loader2, AlertTriangle, Upload, X, Edit, Info, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, getEmbedUrl, translateConstant } from '../lib/utils';
import { GeneralUser } from '../types';
import { useProgress } from '../context/ProgressContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { pdfService } from '../services/pdfService';
import { printService } from '../services/printService';

const ApplicantDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const applicantProfile = profile as GeneralUser;
  const [applications, setApplications] = useState<Application[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedAppl, setSelectedAppl] = useState<Application | null>(null);
  const [claimForm, setClaimForm] = useState({ Description: '', Proof_Doc: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [applsData, adsData, postsData, claimsData] = await Promise.all([
          sheetService.getAll<Application>('Application'),
          sheetService.getAll<Advertisement>('Advertisement'),
          sheetService.getAll<Post>('Post'),
          sheetService.getAll<Claim>('Claim'),
        ]);
        setApplications(applsData.filter(a => String(a.User_ID) === String(user.User_ID)));
        setAds(adsData);
        setPosts(postsData);
        setClaims(claimsData.filter(c => String(c.User_ID) === String(user.User_ID)));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getAdTitle = (id: string) => ads.find(a => String(a.Adv_ID) === String(id))?.Title || t('common.unknown_ad', 'Unknown Ad');
  const getPostName = (id: string) => posts.find(p => String(p.Post_ID) === String(id))?.Post_Name || t('common.unknown_post', 'Unknown Post');

  const isClaimPeriodActive = (advId: string) => {
    const ad = ads.find(a => String(a.Adv_ID) === String(advId));
    if (!ad || !ad.Clm_Strt_Dt || !ad.Clm_End_Dt) return true; // Fallback if not configured

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(ad.Clm_Strt_Dt);
    const end = new Date(ad.Clm_End_Dt);

    return today >= start && today <= end;
  };

  const getClaimPeriodMessage = (advId: string) => {
    const ad = ads.find(a => String(a.Adv_ID) === String(advId));
    if (!ad) return "";
    if (!ad.Clm_Strt_Dt || !ad.Clm_End_Dt) return t('dashboard.claim_period_not_set', 'Claim Period: Not yet scheduled');

    return `${t('dashboard.claim_period')}: ${formatDate(ad.Clm_Strt_Dt)} to ${formatDate(ad.Clm_End_Dt)}`;
  };

  const isApplicationEditable = (advId: string) => {
    const ad = ads.find(a => String(a.Adv_ID) === String(advId));
    if (!ad) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(ad.End_Date);
    return today <= end;
  };

  const handleEditApplication = (appl: Application) => {
    navigate(`/apply/${appl.Adv_ID}/${appl.Post_ID}?edit=true&applId=${appl.Appl_ID}`);
  };

  const downloadPDF = async (appl: Application) => {
    setIsGeneratingPDF(appl.Appl_ID);
    startProgress('Preparing your application PDF...');
    
    try {
      updateProgress(10, 'Fetching application details...');
      const [additionalInfo, addressInfo, qualifications, experiences] = await Promise.all([
        sheetService.getAll<AdditionalInfo>('Additional_Info').then(data => data.find(i => String(i.Appl_ID) === String(appl.Appl_ID))),
        sheetService.getAll<AddressInfo>('Address_Info').then(data => data.find(i => String(i.Appl_ID) === String(appl.Appl_ID))),
        sheetService.getAll<QualificationInfo>('Qualification_Info').then(data => data.filter(i => String(i.Appl_ID) === String(appl.Appl_ID))),
        sheetService.getAll<ExperienceInfo>('Experience_Info').then(data => data.filter(i => String(i.Appl_ID) === String(appl.Appl_ID))),
      ]);

      await pdfService.generateApplicationPDF(
        appl,
        applicantProfile,
        additionalInfo || null,
        addressInfo || null,
        qualifications,
        experiences,
        getAdTitle(appl.Adv_ID),
        getPostName(appl.Post_ID),
        t,
        {
          includeCertificates: true,
          onProgress: (msg, prog) => updateProgress(prog, msg)
        }
      );
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(null);
      stopProgress();
    }
  };

  const handlePrint = async (appl: Application) => {
    setIsGeneratingPDF(appl.Appl_ID);
    startProgress('Preparing for printing...');
    
    try {
      updateProgress(10, 'Fetching application details...');
      const [additionalInfo, addressInfo, qualifications, experiences] = await Promise.all([
        sheetService.getAll<AdditionalInfo>('Additional_Info').then(data => data.find(i => String(i.Appl_ID) === String(appl.Appl_ID))),
        sheetService.getAll<AddressInfo>('Address_Info').then(data => data.find(i => String(i.Appl_ID) === String(appl.Appl_ID))),
        sheetService.getAll<QualificationInfo>('Qualification_Info').then(data => data.filter(i => String(i.Appl_ID) === String(appl.Appl_ID))),
        sheetService.getAll<ExperienceInfo>('Experience_Info').then(data => data.filter(i => String(i.Appl_ID) === String(appl.Appl_ID))),
      ]);

      if (!applicantProfile) return;

      await printService.generatePrintableApplication(
        appl,
        applicantProfile,
        ads.find(a => String(a.Adv_ID) === String(appl.Adv_ID)),
        posts.find(p => String(p.Post_ID) === String(appl.Post_ID)),
        additionalInfo || null,
        addressInfo || null,
        qualifications,
        experiences,
        t,
        (msg, prog) => updateProgress(prog, msg)
      );
      
    } catch (error) {
      console.error('Error preparing print view:', error);
      toast.error('Failed to prepare print view. Please try again.');
    } finally {
      setIsGeneratingPDF(null);
      stopProgress();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPG, PNG, etc.) are allowed');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit');
      return;
    }

    setIsUploading(true);
    try {
      const url = await sheetService.uploadFile(file);
      setClaimForm(prev => ({ ...prev, Proof_Doc: url }));
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppl || !user) return;

    if (!claimForm.Proof_Doc) {
      toast.error('Please upload a supporting proof document.');
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const nextId = await sheetService.getNextId('Claim', 'Claim_ID');
      const newClaim: Claim = {
        Claim_ID: String(nextId),
        Appl_ID: selectedAppl.Appl_ID,
        User_ID: user.User_ID,
        Description: claimForm.Description,
        Proof_Doc_URL: claimForm.Proof_Doc,
        Status: 'Pending',
        Officer_Remark: '',
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };

      await sheetService.insert('Claim', newClaim);
      setClaims(prev => [...prev, newClaim]);
      setShowClaimModal(false);
      setClaimForm({ Description: '', Proof_Doc: '' });
      setSelectedAppl(null);
      toast.success('Claim submitted successfully. It will be reviewed by officials.');
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim. Please try again.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-hindi-support">{t('dashboard.title')}</h1>
          <p className="text-gray-600">{t('dashboard.subtitle')}</p>
        </div>
        {applicantProfile?.Photo_URL && (
          <div className="w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-100">
            <img 
              src={getEmbedUrl(applicantProfile.Photo_URL)} 
              alt="Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg mr-4">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.total_appls')}</p>
            <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="bg-green-100 p-3 rounded-lg mr-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.eligible')}</p>
            <p className="text-2xl font-bold text-gray-900">{applications.filter(a => a.Status === 'Eligible').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="bg-red-100 p-3 rounded-lg mr-4">
            <Clock className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.ineligible')}</p>
            <p className="text-2xl font-bold text-gray-900">{applications.filter(a => a.Status === 'Ineligible').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden mb-12">
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="text-xl font-bold text-gray-900 font-hindi-support flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg mr-3">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            {t('dashboard.recent_appls')}
          </h2>
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
               {applications.length} {t('dashboard.total_appls')}
             </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] uppercase text-gray-500 font-bold tracking-wider border-b border-gray-100">
                <th className="px-8 py-4">{t('dashboard.appl_id')}</th>
                <th className="px-8 py-4">{t('dashboard.advertisement')} & {t('dashboard.post')}</th>
                <th className="px-8 py-4">{t('dashboard.status')}</th>
                <th className="px-8 py-4 text-center">{t('dashboard.claims', 'Claims')}</th>
                <th className="px-8 py-4 text-center">{t('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.length > 0 ? (
                applications.map((appl, index) => {
                  const ad = ads.find(a => String(a.Adv_ID) === String(appl.Adv_ID));
                  const claim = claims.find(c => String(c.Appl_ID) === String(appl.Appl_ID));
                  
                  return (
                    <motion.tr
                      key={`${appl.Appl_ID}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-blue-50/20 transition-colors"
                    >
                      <td className="px-8 py-6 align-top">
                        <div className="font-mono text-xs font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                          #{appl.Appl_ID}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {formatDate(appl.Apply_Date)}
                        </div>
                      </td>
                      <td className="px-8 py-6 align-top max-w-md">
                        <div className="text-sm font-bold text-gray-900 mb-1 leading-snug group-hover:text-blue-700 transition-colors">
                          {getPostName(appl.Post_ID)}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center line-clamp-1" title={getAdTitle(appl.Adv_ID)}>
                          <span className="w-1 h-1 bg-gray-300 rounded-full mr-2 shrink-0"></span>
                          {getAdTitle(appl.Adv_ID)}
                        </div>
                      </td>
                      <td className="px-8 py-6 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="relative group/remark flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit shadow-xs border transition-all ${
                              appl.Status === 'Eligible' ? 'bg-green-50 text-green-700 border-green-100' :
                              appl.Status === 'Ineligible' ? 'bg-red-50 text-red-700 border-red-100' :
                              claim?.Status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                 appl.Status === 'Eligible' ? 'bg-green-500' :
                                 appl.Status === 'Ineligible' ? 'bg-red-500' :
                                 claim?.Status === 'Pending' ? 'bg-amber-500' :
                                 'bg-blue-500'
                              }`} />
                              {claim?.Status === 'Pending' ? t('dashboard.claim_pending') : translateConstant(t, appl.Status || 'Submitted')}
                            </span>
                            
                            {appl.Remark && (
                              <>
                                <div className="p-1 bg-gray-50 rounded-full text-gray-400 group-hover/remark:bg-blue-50 group-hover/remark:text-blue-600 transition-all border border-gray-100 group-hover/remark:border-blue-100 cursor-help">
                                  <Info className="w-3 h-3" />
                                </div>
                                <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/remark:opacity-100 pointer-events-none transition-opacity z-20 leading-relaxed shadow-blue-900/10">
                                  <p className="font-bold border-b border-gray-700 mb-1 pb-1 text-gray-400 uppercase tracking-tighter">{t('dashboard.remarks')}</p>
                                  {appl.Remark}
                                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 align-top">
                        <div className="flex flex-col items-center">
                          {claim ? (
                             <div className="flex flex-col items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100 min-w-[120px]">
                               <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter mb-1 border-b border-blue-200 w-full text-center pb-1">
                                 {t('dashboard.claim_status')}
                               </span>
                               <span className={`text-[11px] font-bold ${
                                 claim.Status === 'Pending' ? 'text-amber-600' : 
                                 claim.Status === 'Approved' ? 'text-green-600' : 'text-red-600'
                               }`}>
                                 {claim.Status}
                               </span>
                             </div>
                          ) : (
                            appl.Status === 'Ineligible' ? (
                              <div className="flex flex-col items-center group/claim">
                                <button
                                  onClick={() => {
                                    if (!isClaimPeriodActive(appl.Adv_ID)) {
                                      toast.error(`Claims session is not active for this advertisement. ${getClaimPeriodMessage(appl.Adv_ID)}`);
                                      return;
                                    }
                                    setSelectedAppl(appl);
                                    setShowClaimModal(true);
                                  }}
                                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center ${
                                    isClaimPeriodActive(appl.Adv_ID) 
                                      ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm' 
                                      : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                                  }`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover/claim:scale-110" />
                                  {t('dashboard.submit_claim')}
                                </button>
                                {getClaimPeriodMessage(appl.Adv_ID) && (
                                  <span className="text-[9px] text-gray-400 italic mt-1 font-medium bg-gray-50/50 px-2 py-0.5 rounded text-center whitespace-nowrap">
                                    {getClaimPeriodMessage(appl.Adv_ID)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium italic">-</span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center align-top">
                        <div className="flex items-center justify-center gap-2">
                          {isApplicationEditable(appl.Adv_ID) && (
                            <button
                              onClick={() => handleEditApplication(appl)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-all border border-transparent hover:border-amber-100 shadow-xs group/btn"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                            </button>
                          )}

                          <button
                            onClick={() => downloadPDF(appl)}
                            disabled={isGeneratingPDF === appl.Appl_ID}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all border border-transparent hover:border-blue-100 shadow-xs disabled:opacity-50 group/btn"
                            title={t('common.pdf')}
                          >
                            {isGeneratingPDF === appl.Appl_ID ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                            )}
                          </button>

                          <button
                            onClick={() => handlePrint(appl)}
                            disabled={isGeneratingPDF === appl.Appl_ID}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all border border-transparent hover:border-indigo-100 shadow-xs disabled:opacity-50 group/btn"
                            title={t('common.print', 'Print Application')}
                          >
                            <Printer className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <FileText className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-lg font-bold text-gray-900 font-hindi-support mb-1">No Applications Found</p>
                      <p className="text-sm text-gray-500 font-hindi-support">{t('dashboard.no_appls')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-600 text-white">
              <h3 className="text-lg font-bold flex items-center font-hindi-support">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {t('dashboard.objection_modal_title')}
              </h3>
              <button 
                onClick={() => setShowClaimModal(false)}
                className="text-white hover:text-red-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitClaim} className="p-6 space-y-6">
              <div className="bg-red-50 p-4 rounded-lg text-red-800 text-xs leading-relaxed font-hindi-support">
                <p className="font-bold mb-1">{t('dashboard.important_notice')}:</p>
                <p>{t('dashboard.claim_desc')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-bold italic font-hindi-support">{t('dashboard.why_eligible')}</label>
                <textarea
                  required
                  rows={4}
                  value={claimForm.Description}
                  onChange={e => setClaimForm({ ...claimForm, Description: e.target.value })}
                  placeholder="Explain your case clearly..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-bold italic font-hindi-support">{t('dashboard.supporting_doc')}</label>
                <div className="relative">
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="claim-doc"
                  />
                  <label
                    htmlFor="claim-doc"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      claimForm.Proof_Doc ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    ) : claimForm.Proof_Doc ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                        <span className="text-xs text-green-600 font-bold uppercase tracking-wider">File Selected & Uploaded</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500 font-hindi-support">{t('dashboard.click_upload')}</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex space-x-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all font-hindi-support"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim || isUploading}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 disabled:opacity-50 transition-all font-hindi-support"
                >
                  {isSubmittingClaim ? t('common.processing') : t('dashboard.submit_claim')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ApplicantDashboard;
