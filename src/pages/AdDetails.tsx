import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sheetService } from '../services/sheetService';
import { formatDate, translateConstant } from '../lib/utils';
import { Advertisement, Post, Office, Department, Application, OfficeUser } from '../types';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Building2, FileText, CheckCircle, ArrowRight, Download, AlertTriangle, Mail, Phone, User, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const AdDetails: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [office, setOffice] = useState<Office | null>(null);
  const [dept, setDept] = useState<Department | null>(null);
  const [officeUser, setOfficeUser] = useState<OfficeUser | null>(null);
  const [userApplications, setUserApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const ads = await sheetService.getAll<Advertisement>('Advertisement');
        const foundAd = ads.find(a => String(a.Adv_ID) === String(id));
        if (foundAd) {
          setAd(foundAd);
          const [postsData, offices, depts, officeUsers] = await Promise.all([
            sheetService.getAll<Post>('Post'),
            sheetService.getAll<Office>('Office'),
            sheetService.getAll<Department>('Department'),
            sheetService.getAll<OfficeUser>('Office_User'),
          ]);
          setPosts(postsData.filter(p => String(p.Adv_ID).trim() === String(id).trim()));
          
          const foundOffice = offices.find(o => String(o.Office_ID).trim() === String(foundAd.Office_ID).trim()) || null;
          setOffice(foundOffice);
          setDept(depts.find(d => String(d.Dept_ID).trim() === String(foundAd.Dept_ID).trim()) || null);
          
          if (foundOffice) {
            setOfficeUser(officeUsers.find(ou => String(ou.Office_ID).trim() === String(foundOffice.Office_ID).trim()) || null);
          }
          
          if (user) {
            const allApplications = await sheetService.getAll<Application>('Application');
            setUserApplications(allApplications.filter(a => String(a.User_ID) === String(user.User_ID)));
          }
        }
      } catch (error) {
        console.error('Error fetching ad details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const hasApplied = (postId: string) => {
    return userApplications.some(a => String(a.Post_ID) === String(postId));
  };

  const handleApply = (postId: string) => {
    if (!ad) return;

    if (hasApplied(postId)) {
      toast.error(t('ad_details.already_applied'));
      return;
    }
    
    const now = new Date();
    const startDate = new Date(ad.Start_Date);
    const endDate = new Date(ad.End_Date);
    
    if (now < startDate) {
      toast.error(`${t('ad_details.starts_on')} ${formatDate(ad.Start_Date)}`);
      return;
    }
    
    if (now > endDate) {
      toast.error(`${t('ad_details.ended_on')} ${formatDate(ad.End_Date)}`);
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }
    if (user.User_Type !== 'applicant') {
      toast.error(t('ad_details.only_applicants'));
      return;
    }
    navigate(`/apply/${id}/${postId}`);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!ad) return <div className="text-center py-20 font-hindi-support">{t('ad_details.ad_not_found')}</div>;

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="bg-blue-600 p-8 text-white">
          <div className="flex items-center text-sm font-medium text-blue-100 mb-2">
            <Building2 className="w-4 h-4 mr-2" />
            {dept?.Dept_Name} / {office?.Office_Name}
            {office && (
              <span className="ml-2 opacity-80 font-normal">
                ({office.District && `${office.District}, `}{office.State})
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-4 font-hindi-support">{ad.Title}</h1>
          <div className="flex flex-wrap gap-4 text-sm font-hindi-support">
            <div className="flex items-center bg-blue-700 px-3 py-1 rounded-full">
              <Calendar className="w-4 h-4 mr-2" />
              {t('landing.appl_filling')}: {t('landing.from_to', { start: formatDate(ad.Start_Date), end: formatDate(ad.End_Date) })}
            </div>
            {ad.Clm_Strt_Dt && ad.Clm_End_Dt && (
              <div className="flex items-center bg-blue-800 px-3 py-1 rounded-full border border-blue-500">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-300" />
                {t('landing.claims_objections')}: {t('landing.from_to', { start: formatDate(ad.Clm_Strt_Dt), end: formatDate(ad.Clm_End_Dt) })}
              </div>
            )}
            <div className="flex items-center bg-blue-700 px-3 py-1 rounded-full">
              <FileText className="w-4 h-4 mr-2" />
              {t('ad_details.ref_no')}: {ad.Letter_No}
            </div>
            {ad.Adv_Doc && (
              <a
                href={ad.Adv_Doc}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center bg-white text-blue-600 px-4 py-1 rounded-full font-bold hover:bg-blue-50 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('ad_details.download_ad')}
              </a>
            )}
          </div>
        </div>

        <div className="p-8">
          {/* Instructions */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 font-hindi-support">{t('ad_details.instructions')}</h2>
            <div className="text-gray-700 whitespace-pre-wrap">{ad.Instructions}</div>
          </section>

          {/* Terms & Conditions */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 font-hindi-support">{t('ad_details.terms')}</h2>
            <div className="text-gray-700 whitespace-pre-wrap">{ad.Terms_Conditions}</div>
          </section>

          {/* Office Contact Info */}
          <section className="mb-10 bg-blue-50/50 rounded-2xl p-6 border border-blue-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-blue-900 font-hindi-support">{t('ad_details.office_contact.title')}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Office Details */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="p-1.5 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">{t('ad_details.office_contact.dept_name')}</p>
                    <p className="text-sm font-bold text-gray-900">{dept?.Dept_Name || t('common.unknown_dept')}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-1.5 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">{t('ad_details.office_contact.office_name')}</p>
                    <p className="text-sm font-bold text-gray-900">{office?.Office_Name || t('common.unknown_office')}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-1.5 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">{t('ad_details.office_contact.address')}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {office?.Address}<br />
                      {office?.District && `${translateConstant(t, office.District)}, `}{translateConstant(t, office?.State)} - {office?.Pincode}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Right Column: Contact Person */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="p-1.5 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">{t('ad_details.office_contact.incharge')}</p>
                    <p className="text-sm font-bold text-gray-900">{officeUser?.Officer_Name || 'Officer-in-Charge'}</p>
                    {officeUser?.Designation && <p className="text-xs text-gray-600 mt-0.5 italic">{officeUser.Designation}</p>}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-1.5 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">{t('ad_details.office_contact.mobile')}</p>
                    <a href={`tel:${officeUser?.Mobile}`} className="text-sm font-bold text-blue-700 hover:underline">{officeUser?.Mobile || 'N/A'}</a>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-1.5 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-0.5">{t('ad_details.office_contact.email')}</p>
                    <a href={`mailto:${officeUser?.Email_ID}`} className="text-sm font-bold text-blue-700 hover:underline">{officeUser?.Email_ID || 'N/A'}</a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Posts */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 font-hindi-support">{t('ad_details.available_posts')}</h2>
            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold font-hindi-support">
                  <tr>
                    <th className="px-3 py-3 border-b">{t('dashboard.post')}</th>
                    <th className="px-3 py-3 border-b">{t('ad_details.post_type')}</th>
                    <th className="px-3 py-3 border-b">{t('ad_details.payscale')}</th>
                    <th className="px-3 py-3 border-b">{t('ad_details.qualification')}</th>
                    <th className="px-3 py-3 border-b">{t('ad_details.experience')}</th>
                    <th className="px-3 py-3 border-b text-center">{t('dashboard.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-hindi-support">
                  {posts.map((post, index) => (
                    <tr key={`${post.Post_ID}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-4 min-w-[120px]">
                        <p className="font-bold text-blue-700 text-sm mb-1">{post.Post_Name}</p>
                      </td>
                      <td className="px-3 py-4 min-w-[120px] align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium inline-block w-max">{translateConstant(t, post.Post_Type || '')}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-medium inline-block w-max">{translateConstant(t, post.Class || '')}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-medium inline-block w-max">{translateConstant(t, post.Service_Type || '')}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 min-w-[100px] text-gray-700 align-top text-xs">{post.Payscale}</td>
                      <td className="px-3 py-4 min-w-[200px] text-gray-700 align-top whitespace-pre-wrap text-xs">{post.Qualification}</td>
                      <td className="px-3 py-4 min-w-[150px] text-gray-700 align-top whitespace-pre-wrap text-xs">{post.Experience}</td>
                      <td className="px-3 py-4 text-center min-w-[120px] align-top">
                        <button
                          onClick={() => handleApply(post.Post_ID)}
                          disabled={ad && (new Date() < new Date(ad.Start_Date) || new Date() > new Date(ad.End_Date) || hasApplied(post.Post_ID))}
                          className={`w-full sm:w-auto inline-flex px-4 py-2 rounded-lg font-semibold transition-colors items-center justify-center text-xs ${
                            hasApplied(post.Post_ID)
                              ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
                              : ad && (new Date() < new Date(ad.Start_Date) || new Date() > new Date(ad.End_Date))
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {hasApplied(post.Post_ID) ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              {t('ad_details.applied')}
                            </>
                          ) : ad && new Date() < new Date(ad.Start_Date) ? (
                            t('ad_details.opening_soon')
                          ) : ad && new Date() > new Date(ad.End_Date) ? (
                            t('ad_details.closed')
                          ) : (
                            t('ad_details.apply_now')
                          )}
                          {!hasApplied(post.Post_ID) && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default AdDetails;
