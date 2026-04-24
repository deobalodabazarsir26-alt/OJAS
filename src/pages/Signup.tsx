import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sheetService } from '../services/sheetService';
import { translationService } from '../services/translationService';
import { emailService } from '../services/emailService';
import { useProgress } from '../context/ProgressContext';
import { User, GeneralUser } from '../types';
import { motion } from 'motion/react';
import { Mail, Phone, User as UserIcon, Calendar, FileText, CheckCircle, Upload, Image as ImageIcon, FileUp, Languages } from 'lucide-react';
import { formatDate, getEmbedUrl, translateConstant } from '../lib/utils';
import { useConstants } from '../hooks/useConstants';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const Signup: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { GENDER_OPTIONS, DOB_PROOF_OPTIONS, ID_PROOF_OPTIONS } = useConstants();
  const navigate = useNavigate();
  const { startProgress, updateProgress, stopProgress } = useProgress();
  const [step, setStep] = useState(1); // 1: Details, 2: OTP, 3: Success
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    Candidate_Name: '',
    Candidate_Name_HI: '',
    Gender: 'Male',
    DOB: '',
    DOB_Certificate_Type: '10th marksheet',
    DOB_Doc: '',
    Father_Name: '',
    Father_Name_HI: '',
    Mother_Name: '',
    Mother_Name_HI: '',
    Photo_URL: '',
    Signature_URL: '',
    ID_Proof: 'Aadhar Card',
    ID_Number: '',
    ID_Doc: '',
    Email_ID: '',
    Mobile: '',
  });

  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState({ username: '', password: '' });

  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [filesLoading, setFilesLoading] = useState<Record<string, boolean>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  const handleTranslate = async (fieldName: 'Candidate_Name' | 'Father_Name' | 'Mother_Name') => {
    const text = formData[fieldName];
    if (!text) return;

    const targetField = `${fieldName}_HI` as keyof typeof formData;
    setIsTranslating(fieldName);
    
    try {
      const translated = await translationService.translate(text, 'hi');
      setFormData(prev => ({ ...prev, [targetField]: translated }));
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = e.target.name;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPG, PNG, etc.) are allowed');
      e.target.value = '';
      return;
    }
    setFilesLoading(prev => ({ ...prev, [name]: true }));
    
    const isPhotoOrSign = name === 'Photo_URL' || name === 'Signature_URL';
    const limit = isPhotoOrSign ? 500 * 1024 : 1024 * 1024; // 500KB or 1MB
    const limitLabel = isPhotoOrSign ? '500 KB' : '1 MB';

    if (file.size > limit) {
      toast.error(`File size should be less than ${limitLabel}`);
      e.target.value = '';
      setFilesLoading(prev => ({ ...prev, [name]: false }));
      return;
    }

    setFileNames(prev => ({ ...prev, [name]: file.name }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [name]: reader.result as string }));
      setFilesLoading(prev => ({ ...prev, [name]: false }));
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setFilesLoading(prev => ({ ...prev, [name]: false }));
    };
    reader.readAsDataURL(file);
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit validation for file fields and mobile
    if (!formData.DOB_Doc) {
      toast.error('Please upload DOB Proof.');
      return;
    }
    if (!formData.ID_Doc) {
      toast.error('Please upload ID Proof.');
      return;
    }
    if (!formData.Photo_URL) {
      toast.error('Please upload Photo.');
      return;
    }
    if (!formData.Signature_URL) {
      toast.error('Please upload Signature.');
      return;
    }
    if (formData.Mobile.length < 10 || !/^\d+$/.test(formData.Mobile)) {
      toast.error('Please enter a valid mobile number.');
      return;
    }

    const isAnyFileLoading = Object.values(filesLoading).some(loading => loading);
    if (isAnyFileLoading) {
      toast.error('Please wait for files to finish reading...');
      return;
    }

    setIsLoading(true);
    
    // Generate a 6-digit OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtp(newOtp);

    try {
      // Try to send real email
      await emailService.sendOTP(formData.Email_ID, formData.Candidate_Name, newOtp);
      
      // For demo purposes, we also log it to console in case EmailJS isn't configured
      console.log('OTP sent to:', formData.Email_ID, 'Code:', newOtp);
      
      setIsLoading(false);
      setStep(2);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp !== sentOtp && otp !== '123456') { // Allow 123456 as a backdoor for testing
      toast.error('Invalid OTP. Please try again.');
      return;
    }

    setIsLoading(true);
    startProgress('Creating your account...');

    try {
      updateProgress(20, 'Generating credentials...');
      const nextUserId = await sheetService.getNextId('User', 'User_ID');
      const userId = String(nextUserId);
      const username = formData.Email_ID.split('@')[0] + Math.floor(100 + Math.random() * 900);
      const password = 'Pass' + Math.floor(1000 + Math.random() * 9000);

      const newUser: User = {
        User_ID: userId,
        User_Name: username,
        Password: password,
        User_Type: 'applicant',
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };

      const newProfile: GeneralUser & { _userName?: string } = {
        ...formData,
        User_ID: userId,
        _userName: formData.Candidate_Name,
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString(),
      };

      console.log('Final Profile Payload:', newProfile);
      
      // Check if all required files are present as Base64
      const fileFields = ['DOB_Doc', 'ID_Doc', 'Photo_URL', 'Signature_URL'];
      fileFields.forEach(field => {
        const val = (newProfile as any)[field];
        if (!val || !val.startsWith('data:')) {
          console.warn(`Warning: Field ${field} is missing or not a Base64 string!`);
        } else {
          console.log(`Field ${field} is ready for upload (Length: ${val.length})`);
        }
      });

      updateProgress(50, 'Saving profile information & uploading files...');
      // We save the profile FIRST because it contains the files.
      // If file upload fails, this will throw and the User account won't be created.
      await sheetService.insert('General_User', newProfile);
      
      updateProgress(80, 'Creating user account...');
      await sheetService.insert('User', newUser);

      updateProgress(100, 'Account created successfully!');
      setGeneratedCredentials({ username, password });
      setStep(3);
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
      stopProgress();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white shadow-xl rounded-2xl overflow-hidden"
          >
            <div className="bg-blue-600 px-8 py-6 text-white text-center">
              <h2 className="text-2xl font-bold font-hindi-support">{t('signup.title')}</h2>
              <p className="text-blue-100 mt-1">{t('signup.subtitle')}</p>
            </div>
            <form onSubmit={handleInitialSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" /> {t('signup.basic_info')}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('signup.full_name_en')}</label>
                    <div className="flex gap-2">
                      <input type="text" name="Candidate_Name" required value={formData.Candidate_Name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                      <button
                        type="button"
                        onClick={() => handleTranslate('Candidate_Name')}
                        disabled={isTranslating === 'Candidate_Name' || !formData.Candidate_Name}
                        className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                        title={t('common.translate_to_hindi', 'Translate to Hindi')}
                      >
                        <Languages className={`w-5 h-5 ${isTranslating === 'Candidate_Name' ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('signup.full_name_hi')}</label>
                    <input type="text" name="Candidate_Name_HI" required value={formData.Candidate_Name_HI} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.gender')}</label>
                      <select name="Gender" value={formData.Gender} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.dob')}</label>
                      <input type="date" name="DOB" required value={formData.DOB} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.dob_proof_type')}</label>
                      <select name="DOB_Certificate_Type" value={formData.DOB_Certificate_Type} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        {DOB_PROOF_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.upload_dob_proof')}</label>
                      <input type="file" name="DOB_Doc" accept="image/*" required onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      {filesLoading.DOB_Doc && <p className="text-xs text-blue-500 animate-pulse mt-1">Reading file...</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2" /> {t('signup.family_id_details')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.father_name_en')}</label>
                      <div className="flex gap-2">
                        <input type="text" name="Father_Name" required value={formData.Father_Name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        <button
                          type="button"
                          onClick={() => handleTranslate('Father_Name')}
                          disabled={isTranslating === 'Father_Name' || !formData.Father_Name}
                          className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                          title={t('common.translate_to_hindi', 'Translate to Hindi')}
                        >
                          <Languages className={`w-4 h-4 ${isTranslating === 'Father_Name' ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.father_name_hi')}</label>
                      <input type="text" name="Father_Name_HI" required value={formData.Father_Name_HI} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.mother_name_en')}</label>
                      <div className="flex gap-2">
                        <input type="text" name="Mother_Name" required value={formData.Mother_Name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        <button
                          type="button"
                          onClick={() => handleTranslate('Mother_Name')}
                          disabled={isTranslating === 'Mother_Name' || !formData.Mother_Name}
                          className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                          title={t('common.translate_to_hindi', 'Translate to Hindi')}
                        >
                          <Languages className={`w-4 h-4 ${isTranslating === 'Mother_Name' ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.mother_name_hi')}</label>
                      <input type="text" name="Mother_Name_HI" required value={formData.Mother_Name_HI} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.id_proof_type')}</label>
                      <select name="ID_Proof" value={formData.ID_Proof} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        {ID_PROOF_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('signup.id_number')}</label>
                      <input type="text" name="ID_Number" required value={formData.ID_Number} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('signup.upload_id_proof')}</label>
                    <input type="file" name="ID_Doc" accept="image/*" required onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    {filesLoading.ID_Doc && <p className="text-xs text-blue-500 animate-pulse mt-1">Reading file...</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2" /> {t('signup.contact_info')}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('signup.email')}</label>
                    <input type="email" name="Email_ID" required value={formData.Email_ID} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('signup.mobile')}</label>
                    <input type="tel" name="Mobile" required value={formData.Mobile} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center">
                    <ImageIcon className="w-4 h-4 mr-2" /> {t('signup.photo_sign')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">{t('signup.photo_jpg')}</label>
                      <div className="relative">
                        <input type="file" name="Photo_URL" accept="image/*" required onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Upload Photo" />
                        <div className={`flex items-center justify-between p-3 border-2 border-dashed rounded-lg transition-colors ${formData.Photo_URL ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:bg-gray-50 w-full'}`}>
                          <div className="flex items-center space-x-3 truncate">
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${formData.Photo_URL ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                              <Upload className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="text-sm font-medium text-gray-700 truncate">{fileNames.Photo_URL || t('signup.photo_jpg', 'Upload Photo')}</span>
                              <span className="text-xs text-gray-500">Max size 500KB (JPG)</span>
                            </div>
                          </div>
                          {filesLoading.Photo_URL ? (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 ml-2"></div>
                          ) : formData.Photo_URL ? (
                            <div className="flex items-center flex-shrink-0 ml-2">
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {formData.Photo_URL && !filesLoading.Photo_URL && (
                        <div className="mt-2 border rounded-lg p-1 w-20 h-20 overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                          <img 
                            src={getEmbedUrl(formData.Photo_URL)} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">{t('signup.sign_jpg')}</label>
                      <div className="relative">
                        <input type="file" name="Signature_URL" accept="image/*" required onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Upload Signature" />
                        <div className={`flex items-center justify-between p-3 border-2 border-dashed rounded-lg transition-colors ${formData.Signature_URL ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:bg-gray-50 w-full'}`}>
                          <div className="flex items-center space-x-3 truncate">
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${formData.Signature_URL ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                              <Upload className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="text-sm font-medium text-gray-700 truncate">{fileNames.Signature_URL || t('signup.sign_jpg', 'Upload Signature')}</span>
                              <span className="text-xs text-gray-500">Max size 500KB (JPG)</span>
                            </div>
                          </div>
                          {filesLoading.Signature_URL ? (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 ml-2"></div>
                          ) : formData.Signature_URL ? (
                            <div className="flex items-center flex-shrink-0 ml-2">
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {formData.Signature_URL && !filesLoading.Signature_URL && (
                        <div className="mt-2 border rounded-lg p-1 w-24 h-12 overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                          <img 
                            src={getEmbedUrl(formData.Signature_URL)} 
                            alt="Preview" 
                            className="w-full h-full object-contain rounded" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? t('login.processing') : <><CheckCircle className="w-5 h-5 mr-2" /> {t('signup.send_otp')}</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl text-center"
          >
            <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 font-hindi-support">{t('signup.verify_otp')}</h2>
            <p className="text-gray-600 mb-6">{t('signup.otp_sent_to', { email: formData.Email_ID })}</p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text"
                placeholder={t('signup.enter_otp')}
                className="w-full border-2 border-gray-200 rounded-lg p-3 text-center text-2xl tracking-widest focus:border-blue-500 outline-none"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition-colors"
              >
                {isLoading ? t('signup.verifying', 'Verifying...') : t('signup.verify_create')}
              </button>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 font-hindi-support">{t('signup.success')}</h2>
            <p className="text-gray-600 mb-6">{t('signup.save_credentials')}</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left space-y-2 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('login.username')}:</span>
                <span className="font-mono font-bold">{generatedCredentials.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('login.password')}:</span>
                <span className="font-mono font-bold">{generatedCredentials.password}</span>
              </div>
            </div>
            <p className="text-xs text-red-500 mb-6 italic">Please save these credentials for future use.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition-colors"
            >
              {t('signup.go_to_login')}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Signup;
