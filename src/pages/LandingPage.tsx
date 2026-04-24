import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sheetService } from '../services/sheetService';
import { formatDate } from '../lib/utils';
import { Advertisement, Office, Department } from '../types';
import { Calendar, MapPin, Building2, ArrowRight, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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
        console.error('Error fetching ads:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getOfficeDisplay = (id: string) => {
    if (!id) return t('common.not_specified', 'Not Specified');
    const office = offices.find(o => String(o.Office_ID).trim() === String(id).trim());
    if (!office) return t('common.unknown_office', 'Unknown Office');
    return `${office.Office_Name} (${office.District ? `${office.District}, ` : ''}${office.State})`;
  };

  const getDeptName = (id: string) => {
    if (!id) return t('common.not_specified', 'Not Specified');
    const dept = depts.find(d => String(d.Dept_ID).trim() === String(id).trim());
    return dept ? dept.Dept_Name : t('common.unknown_dept', 'Unknown Dept');
  };

  const categorizedAds = ads.reduce((acc, ad) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(ad.End_Date);
    // Use snapping logic to avoid timezone issues
    const snappedEnd = new Date(endDate.getTime() + (12 * 60 * 60 * 1000));
    snappedEnd.setHours(0, 0, 0, 0);
    
    if (snappedEnd >= today) {
      acc.open.push(ad);
    } else {
      acc.closed.push(ad);
    }
    return acc;
  }, { open: [] as Advertisement[], closed: [] as Advertisement[] });

  const openAds = categorizedAds.open;
  const closedAds = categorizedAds.closed;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-700 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 font-hindi-support"
          >
            {t('landing.hero_title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-blue-100 max-w-3xl mx-auto font-hindi-support"
          >
            {t('landing.hero_subtitle')}
          </motion.p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Open Advertisements Section */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 font-hindi-support">{t('landing.ads_title')}</h2>
          <div className="text-sm text-gray-500 font-hindi-support">
            {t('landing.showing', { count: openAds.length })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : openAds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 font-hindi-support mb-16">
            {openAds.map((ad, index) => {
              const today = new Date();
              const start = new Date(ad.Start_Date);
              const isComingSoon = start > today;
              
              return (
                <motion.div
                  key={`${ad.Adv_ID}-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        <Building2 className="w-3 h-3 mr-1" />
                        {getDeptName(ad.Dept_ID)}
                      </div>
                      {isComingSoon && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                          {t('landing.coming_soon')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 uppercase">{ad.Title}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      {getOfficeDisplay(ad.Office_ID)}
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-semibold text-gray-700 block text-xs uppercase tracking-tight">
                            {t('landing.appl_filling')}
                          </span>
                          <span className="text-xs">
                            {t('landing.from_to', { start: formatDate(ad.Start_Date), end: formatDate(ad.End_Date) })}
                          </span>
                        </div>
                      </div>

                      {(ad.Clm_Strt_Dt || ad.Clm_End_Dt) && (
                        <div className="flex items-start text-sm text-gray-600">
                          <AlertTriangle className="w-4 h-4 mr-2 text-amber-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-700 block text-xs uppercase tracking-tight">
                              {t('landing.claims_objections')}
                            </span>
                            <span className="text-xs text-amber-800">
                              {t('landing.from_to', { 
                                start: ad.Clm_Strt_Dt ? formatDate(ad.Clm_Strt_Dt) : '...', 
                                end: ad.Clm_End_Dt ? formatDate(ad.Clm_End_Dt) : '...' 
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-xs text-gray-400">{t('landing.ref')}: {ad.Letter_No}</span>
                      <Link
                        to={`/ad/${ad.Adv_ID}`}
                        className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700"
                      >
                        {t('landing.view_details')}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 mb-16">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900">{t('landing.no_ads')}</h3>
            <p className="text-gray-500 mt-2">{t('landing.check_back')}</p>
          </div>
        )}

        {/* Closed Advertisements Section */}
        {!isLoading && closedAds.length > 0 && (
          <div className="mt-16">
            <div className="flex justify-between items-center mb-8 border-t pt-12">
              <div>
                <h2 className="text-2xl font-bold text-gray-600 font-hindi-support">{t('landing.closed_ads_title')}</h2>
                <p className="text-sm text-gray-500 font-hindi-support mt-1">{t('landing.closed_ads_subtitle')}</p>
              </div>
              <div className="text-sm text-gray-400 font-hindi-support">
                {t('landing.showing', { count: closedAds.length })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 font-hindi-support">
              {closedAds.map((ad, index) => (
                <motion.div
                  key={`${ad.Adv_ID}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 overflow-hidden grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Building2 className="w-3 h-3 mr-1" />
                        {getDeptName(ad.Dept_ID)}
                      </div>
                      <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                        {t('landing.closed')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2 line-clamp-2 uppercase">{ad.Title}</h3>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      {getOfficeDisplay(ad.Office_ID)}
                    </div>
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-2" />
                        {t('common.ended_on', 'Ended on')}: {formatDate(ad.End_Date)}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs text-gray-400">{t('landing.ref')}: {ad.Letter_No}</span>
                      <Link
                        to={`/ad/${ad.Adv_ID}`}
                        className="inline-flex items-center text-gray-600 font-semibold hover:text-blue-600"
                      >
                        {t('landing.view_details')}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
