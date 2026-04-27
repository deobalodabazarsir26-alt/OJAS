import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sheetService } from '../services/sheetService';
import { useProgress } from '../context/ProgressContext';
import { formatDate, getEmbedUrl, formatDateForInput, translateConstant } from '../lib/utils';
import {
  Advertisement,
  Post,
  GeneralUser,
  Application,
  AdditionalInfo,
  AddressInfo,
  QualificationInfo,
  ExperienceInfo,
} from '../types';
import { motion } from 'motion/react';
import { Check, ChevronRight, ChevronLeft, Save, FileText, User, Home, GraduationCap, Briefcase, Info, Trash2 } from 'lucide-react';
import { useConstants } from '../hooks/useConstants';
import { INDIA_STATES, INDIA_STATES_DISTRICTS } from '../data/indiaData';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const ApplyJob: React.FC = () => {
  const { t } = useTranslation();
  const { 
    YES_NO_OPTIONS, 
    CASTE_CATEGORY_OPTIONS, 
    QUALIFICATION_TYPE_OPTIONS,
    RESULT_STATUS_OPTIONS,
    MARKS_TYPE_OPTIONS,
    EMPLOYER_TYPE_OPTIONS,
    EMPLOYMENT_TYPE_OPTIONS,
    DEPT_TYPE_OPTIONS
  } = useConstants();
  const { adId, postId } = useParams<{ adId: string; postId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { startProgress, updateProgress, stopProgress } = useProgress();

  const isEditMode = searchParams.get('edit') === 'true';
  const editingApplId = searchParams.get('applId');

  const [step, setStep] = useState(1);
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Form States
  const [additionalInfo, setAdditionalInfo] = useState<Partial<AdditionalInfo>>({
    Is_CG: 'Yes',
    Domicile_State: 'Chhattisgarh',
    Domicile_District: '',
    Locality: 'Urban',
    Domicile_Certificate_URL: '',
    Caste_Category: 'GEN',
    Caste_State: 'Chhattisgarh',
    Caste_District: '',
    Caste_Certificate_URL: '',
    Is_PWD: 'No',
    PwD_State: 'Chhattisgarh',
    PwD_District: '',
    PwD_Percentage: '',
    PwD_Certificate_URL: '',
  });

  const [addressInfo, setAddressInfo] = useState<Partial<AddressInfo>>({
    Perm_Address: '',
    Perm_Landmark: '',
    Perm_State: 'Chhattisgarh',
    Perm_District: '',
    Perm_Pincode: '',
    Is_Same: 'No',
    Curr_Address: '',
    Curr_Landmark: '',
    Curr_State: 'Chhattisgarh',
    Curr_District: '',
    Curr_Pincode: '',
  });

  const [qualifications, setQualifications] = useState<Partial<QualificationInfo>[]>([
    { 
      Qualification_Type: 'High School (10th) Certificate',
      Course_Name: '',
      Board_Name: '',
      Institute_Name: '',
      Pass_Year: '',
      Result_Status: 'Passed',
      Marks_Type: 'Percentage',
      Max_Marks: '',
      Marks_Obtained: '',
      Percentage: '',
    },
  ]);

  const [experiences, setExperiences] = useState<Partial<ExperienceInfo>[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ads, posts] = await Promise.all([
          sheetService.getAll<Advertisement>('Advertisement'),
          sheetService.getAll<Post>('Post'),
        ]);
        
        const foundAd = ads.find(a => String(a.Adv_ID) === String(adId));
        const foundPost = posts.find(p => String(p.Post_ID) === String(postId));

        if (user && foundPost && !isEditMode) {
          const allApplications = await sheetService.getAll<Application>('Application');
          const alreadyApplied = allApplications.some(
            a => String(a.User_ID) === String(user.User_ID) && String(a.Post_ID) === String(postId)
          );
          
          if (alreadyApplied) {
            toast.error(t('apply.already_applied', 'You have already applied for this post.'));
            navigate('/applicant/dashboard');
            return;
          }
        }

        if (isEditMode && editingApplId) {
          const [addInfos, addrInfos, quals, exps] = await Promise.all([
            sheetService.getAll<AdditionalInfo>('Additional_Info'),
            sheetService.getAll<AddressInfo>('Address_Info'),
            sheetService.getAll<QualificationInfo>('Qualification_Info'),
            sheetService.getAll<ExperienceInfo>('Experience_Info'),
          ]);

          const foundAddInfo = addInfos.find(i => String(i.Appl_ID) === String(editingApplId));
          const foundAddrInfo = addrInfos.find(i => String(i.Appl_ID) === String(editingApplId));
          const foundQuals = quals.filter(q => String(q.Appl_ID) === String(editingApplId));
          const foundExps = exps.filter(e => String(e.Appl_ID) === String(editingApplId));

          if (foundAddInfo) setAdditionalInfo(foundAddInfo);
          if (foundAddrInfo) setAddressInfo(foundAddrInfo);
          if (foundQuals.length > 0) setQualifications(foundQuals);
          if (foundExps.length > 0) setExperiences(foundExps);
        }

        setAd(foundAd || null);
        setPost(foundPost || null);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [adId, postId, isEditMode, editingApplId, user]);

  const validateStep = (currentStep: number) => {
    let isValid = true;
    const newErrors: Record<string, boolean> = {};

    switch(currentStep) {
      case 2:
        if (!additionalInfo.Domicile_State) newErrors['Domicile_State'] = true;
        if (!additionalInfo.Domicile_District) newErrors['Domicile_District'] = true;
        if (!additionalInfo.Locality) newErrors['Locality'] = true;
        if (!additionalInfo.Caste_Category) newErrors['Caste_Category'] = true;

        if (Object.keys(newErrors).length > 0) {
           toast.error('Please fill all required fields in this step.');
           isValid = false;
        }

        if (additionalInfo.Is_CG === 'Yes' && !additionalInfo.Domicile_Certificate_URL) {
           newErrors['Domicile_Certificate_URL'] = true;
           toast.error('Please upload Domicile Certificate.');
           isValid = false;
        }
        if (additionalInfo.Caste_Category !== 'GEN') {
           if (!additionalInfo.Caste_State) newErrors['Caste_State'] = true;
           if (!additionalInfo.Caste_District) newErrors['Caste_District'] = true;
           if (!additionalInfo.Caste_Certificate_URL) newErrors['Caste_Certificate_URL'] = true;
           
           if (!additionalInfo.Caste_State || !additionalInfo.Caste_District || !additionalInfo.Caste_Certificate_URL) {
             toast.error('Please fill caste details and upload certificate.');
             isValid = false;
           }
        }
        if (additionalInfo.Is_PWD === 'Yes') {
           if (!additionalInfo.PwD_State) newErrors['PwD_State'] = true;
           if (!additionalInfo.PwD_District) newErrors['PwD_District'] = true;
           if (!additionalInfo.PwD_Percentage) newErrors['PwD_Percentage'] = true;
           if (!additionalInfo.PwD_Certificate_URL) newErrors['PwD_Certificate_URL'] = true;

           if (!additionalInfo.PwD_State || !additionalInfo.PwD_District || !additionalInfo.PwD_Percentage || !additionalInfo.PwD_Certificate_URL) {
             toast.error('Please fill PwD details and upload certificate.');
             isValid = false;
           } else {
             const pwdNum = parseFloat(additionalInfo.PwD_Percentage || '0');
             if (isNaN(pwdNum) || pwdNum <= 0 || pwdNum > 100) {
               newErrors['PwD_Percentage'] = true;
               toast.error('Please enter a valid PwD percentage between 0 and 100.');
               isValid = false;
             }
           }
        }
        break;
      case 3:
        if (!addressInfo.Perm_Address) newErrors['Perm_Address'] = true;
        if (!addressInfo.Perm_State) newErrors['Perm_State'] = true;
        if (!addressInfo.Perm_District) newErrors['Perm_District'] = true;
        if (!addressInfo.Perm_Pincode) newErrors['Perm_Pincode'] = true;

        if (Object.keys(newErrors).length > 0) {
           toast.error('Please fill permanent address details.');
           isValid = false;
        }

        if (addressInfo.Is_Same === 'No') {
           let currError = false;
           if (!addressInfo.Curr_Address) { newErrors['Curr_Address'] = true; currError = true; }
           if (!addressInfo.Curr_State) { newErrors['Curr_State'] = true; currError = true; }
           if (!addressInfo.Curr_District) { newErrors['Curr_District'] = true; currError = true; }
           if (!addressInfo.Curr_Pincode) { newErrors['Curr_Pincode'] = true; currError = true; }
           
           if (currError) {
             toast.error('Please fill current address details.');
             isValid = false;
           }
        }
        break;
      case 4:
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < qualifications.length; i++) {
            const q = qualifications[i];
            let qError = false;
            if (!q.Course_Name) { newErrors[`qual_${i}_Course_Name`] = true; qError = true; }
            if (!q.Board_Name) { newErrors[`qual_${i}_Board_Name`] = true; qError = true; }
            if (!q.Institute_Name) { newErrors[`qual_${i}_Institute_Name`] = true; qError = true; }
            if (!q.Pass_Year) { newErrors[`qual_${i}_Pass_Year`] = true; qError = true; }
            if (!q.Max_Marks) { newErrors[`qual_${i}_Max_Marks`] = true; qError = true; }
            if (!q.Marks_Obtained) { newErrors[`qual_${i}_Marks_Obtained`] = true; qError = true; }
            if (!q.Percentage) { newErrors[`qual_${i}_Percentage`] = true; qError = true; }

            if (qError) {
               toast.error(`Please fill all fields for qualification ${i + 1}.`);
               isValid = false;
               continue;
            }

            const passYearNum = parseInt(q.Pass_Year, 10);
            if (isNaN(passYearNum) || passYearNum < 1900 || passYearNum > currentYear) {
               newErrors[`qual_${i}_Pass_Year`] = true;
               toast.error(`Please enter a valid Pass Year (e.g., 2020) for qualification ${i + 1}.`);
               isValid = false;
            }

            const maxMarks = parseFloat(q.Max_Marks);
            const obtMarks = parseFloat(q.Marks_Obtained);
            const perc = parseFloat(q.Percentage);

            if (isNaN(maxMarks) || isNaN(obtMarks) || isNaN(perc)) {
               newErrors[`qual_${i}_Max_Marks`] = true;
               newErrors[`qual_${i}_Marks_Obtained`] = true;
               newErrors[`qual_${i}_Percentage`] = true;
               toast.error(`Marks and percentage must be valid numbers for qualification ${i + 1}.`);
               isValid = false;
            } else {
              if (maxMarks <= 0) {
                 newErrors[`qual_${i}_Max_Marks`] = true;
                 toast.error(`Maximum marks must be greater than 0 for qualification ${i + 1}.`);
                 isValid = false;
              }

              if (obtMarks < 0) {
                 newErrors[`qual_${i}_Marks_Obtained`] = true;
                 toast.error(`Obtained marks cannot be negative for qualification ${i + 1}.`);
                 isValid = false;
              }

              if (obtMarks > maxMarks) {
                 newErrors[`qual_${i}_Marks_Obtained`] = true;
                 toast.error(`Obtained Marks cannot be greater than Maximum Marks for qualification ${i + 1}.`);
                 isValid = false;
              }

              if (q.Marks_Type === 'Percentage') {
                 const calculatedPerc = (obtMarks / maxMarks) * 100;
                 if (Math.abs(calculatedPerc - perc) > 0.5) {
                    newErrors[`qual_${i}_Percentage`] = true;
                    toast.error(`The percentage for qualification ${i + 1} seems incorrect. Based on the marks, it should be ${calculatedPerc.toFixed(2)}%.`);
                    isValid = false;
                 }
                 if (perc > 100 || perc < 0) {
                   newErrors[`qual_${i}_Percentage`] = true;
                   toast.error(`Percentage cannot be greater than 100 or less than 0 for qualification ${i + 1}.`);
                   isValid = false;
                 }
              } else if (q.Marks_Type === 'CGPA' || q.Marks_Type === 'Grade') {
                 if (perc > 100 || perc < 0) {
                   newErrors[`qual_${i}_Percentage`] = true;
                   toast.error(`Converted percentage cannot be greater than 100 or less than 0 for qualification ${i + 1}.`);
                   isValid = false;
                 }
              }
            }
        }
        break;
      case 5:
        for (let i = 0; i < experiences.length; i++) {
            const e = experiences[i];
            let eError = false;
            if (!e.Employer_Name) { newErrors[`exp_${i}_Employer_Name`] = true; eError = true; }
            if (!e.Employer_Type) { newErrors[`exp_${i}_Employer_Type`] = true; eError = true; }
            if (!e.Employment_Type) { newErrors[`exp_${i}_Employment_Type`] = true; eError = true; }
            if (!e.Post_Held) { newErrors[`exp_${i}_Post_Held`] = true; eError = true; }
            if (!e.Start_Date) { newErrors[`exp_${i}_Start_Date`] = true; eError = true; }

            if (eError) {
               toast.error(`Please fill required fields for experience ${i + 1}.`);
               isValid = false;
               continue;
            }

            if (e.Currently_Working === 'No' && !e.End_Date) {
               newErrors[`exp_${i}_End_Date`] = true;
               toast.error(`Please fill End Date for experience ${i + 1}.`);
               isValid = false;
            }
            if (e.Currently_Working === 'No' && e.Start_Date && e.End_Date) {
               if (new Date(e.Start_Date) > new Date(e.End_Date)) {
                  newErrors[`exp_${i}_Start_Date`] = true;
                  newErrors[`exp_${i}_End_Date`] = true;
                  toast.error(`Start Date cannot be broadly after End Date for experience ${i + 1}.`);
                  isValid = false;
               }
            }
        }
        break;
    }
    
    setFormErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
    }
  };
  const handleBack = () => setStep(s => s - 1);

  const getInputClass = (fieldName: string, baseClass: string = "mt-1 block w-full border rounded-md p-2") => {
    return `${baseClass} ${formErrors[fieldName] ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, stateSetter: any, currentState: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPG, PNG, etc.) are allowed');
      e.target.value = '';
      return;
    }

    const limit = 1024 * 1024; // 1MB for documents
    if (file.size > limit) {
      toast.error('File size should be less than 1 MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      stateSetter({ ...currentState, [e.target.name]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;
    if (!user || !ad || !post) return;

    const now = new Date();
    const startDate = new Date(ad.Start_Date);
    const endDate = new Date(ad.End_Date);

    if (now < startDate) {
      toast.error(`${t('apply.starts_on', 'Application for this job starts on')} ${formatDate(ad.Start_Date)}`);
      return;
    }
    
    if (now > endDate) {
      toast.error(`${t('apply.ended_on', 'Application for this job ended on')} ${formatDate(ad.End_Date)}`);
      return;
    }

    setIsSubmitting(true);
    const modeText = isEditMode ? 'Updating' : 'Submitting';
    startProgress(`${modeText} your application...`);

    try {
      let applId = editingApplId;
      const timestamp = new Date().toISOString();

      if (!isEditMode) {
        updateProgress(10, 'Generating application ID...');
        const nextApplId = await sheetService.getNextId('Application', 'Appl_ID');
        applId = String(nextApplId);

        const application: Application = {
          Appl_ID: applId,
          Adv_ID: ad.Adv_ID,
          Post_ID: post.Post_ID,
          User_ID: user.User_ID,
          Apply_Date: timestamp,
          Status: 'Submitted',
          Remark: '',
          T_STMP_ADD: timestamp,
          T_STMP_UPD: timestamp,
        };

        updateProgress(30, 'Saving main application data...');
        await sheetService.insert('Application', application);
      } else if (applId) {
        updateProgress(30, 'Updating main application data...');
        await sheetService.update('Application', 'Appl_ID', applId, {
          T_STMP_UPD: timestamp,
        });
      }

      if (!applId) throw new Error('Application ID missing');
      
      const candidateName = applicantProfile?.Candidate_Name || user.User_Name;

      // Update or Insert Additional Info
      updateProgress(50, `${isEditMode ? 'Updating' : 'Saving'} additional information...`);
      const addlData = { 
        Appl_ID: applId, 
        User_ID: user.User_ID, 
        Candidate_Name: candidateName,
        Is_CG: additionalInfo.Is_CG || 'Yes',
        Domicile_State: additionalInfo.Domicile_State || '',
        Domicile_District: additionalInfo.Domicile_District || '',
        Locality: additionalInfo.Locality || '',
        Domicile_Certificate_URL: additionalInfo.Domicile_Certificate_URL || '',
        Caste_Category: additionalInfo.Caste_Category || '',
        Caste_State: additionalInfo.Caste_State || '',
        Caste_District: additionalInfo.Caste_District || '',
        Caste_Certificate_URL: additionalInfo.Caste_Certificate_URL || '',
        Is_PWD: additionalInfo.Is_PWD || 'No',
        PwD_State: additionalInfo.PwD_State || '',
        PwD_District: additionalInfo.PwD_District || '',
        PwD_Percentage: additionalInfo.PwD_Percentage || '',
        PwD_Certificate_URL: additionalInfo.PwD_Certificate_URL || '',
        T_STMP_UPD: timestamp,
      };

      if (isEditMode) {
        await sheetService.update('Additional_Info', 'Appl_ID', applId, addlData);
      } else {
        await sheetService.insert('Additional_Info', { ...addlData, T_STMP_ADD: timestamp });
      }
      
      // Update or Insert Address Info
      updateProgress(60, `${isEditMode ? 'Updating' : 'Saving'} address information...`);
      const addrData = { 
        Appl_ID: applId, 
        User_ID: user.User_ID, 
        Candidate_Name: candidateName,
        Perm_Address: addressInfo.Perm_Address || '',
        Perm_Landmark: addressInfo.Perm_Landmark || '',
        Perm_State: addressInfo.Perm_State || '',
        Perm_District: addressInfo.Perm_District || '',
        Perm_Pincode: addressInfo.Perm_Pincode || '',
        Is_Same: addressInfo.Is_Same || 'No',
        Curr_Address: addressInfo.Curr_Address || '',
        Curr_Landmark: addressInfo.Curr_Landmark || '',
        Curr_State: addressInfo.Curr_State || '',
        Curr_District: addressInfo.Curr_District || '',
        Curr_Pincode: addressInfo.Curr_Pincode || '',
        T_STMP_UPD: timestamp,
      };

      if (isEditMode) {
        await sheetService.update('Address_Info', 'Appl_ID', applId, addrData);
      } else {
        await sheetService.insert('Address_Info', { ...addrData, T_STMP_ADD: timestamp });
      }

      // Handle Qualifications - Wipe all existing for this Appl_ID and Re-insert
      updateProgress(70, `${isEditMode ? 'Updating' : 'Saving'} qualifications...`);
      if (isEditMode) {
        // Since delete might only remove one row at a time in Apps Script, 
        // we loop to ensure all are cleared.
        const existing = await sheetService.getAll<QualificationInfo>('Qualification_Info');
        const countToClear = existing.filter(q => String(q.Appl_ID) === String(applId)).length;
        for (let i = 0; i < countToClear; i++) {
          await sheetService.delete('Qualification_Info', 'Appl_ID', String(applId));
        }
      }
      
      for (let i = 0; i < qualifications.length; i++) {
        const q = qualifications[i];
        updateProgress(70 + (i / qualifications.length) * 15, `Saving qualification: ${q.Qualification_Type}`);
        await sheetService.insert('Qualification_Info', { 
          ...q, 
          Appl_ID: applId, 
          User_ID: user.User_ID, 
          Candidate_Name: candidateName,
          T_STMP_ADD: timestamp,
          T_STMP_UPD: timestamp,
        });
      }

      // Handle Experience - Wipe all existing for this Appl_ID and Re-insert
      updateProgress(85, `${isEditMode ? 'Updating' : 'Saving'} experience details...`);
      if (isEditMode) {
        const existing = await sheetService.getAll<ExperienceInfo>('Experience_Info');
        const countToClear = existing.filter(e => String(e.Appl_ID) === String(applId)).length;
        for (let i = 0; i < countToClear; i++) {
          await sheetService.delete('Experience_Info', 'Appl_ID', String(applId));
        }
      }

      for (let i = 0; i < experiences.length; i++) {
        const e = experiences[i];
        updateProgress(85 + (i / experiences.length) * 10, `Saving experience: ${e.Employer_Name}`);
        await sheetService.insert('Experience_Info', { 
          ...e, 
          Appl_ID: applId, 
          User_ID: user.User_ID, 
          Candidate_Name: candidateName,
          T_STMP_ADD: timestamp,
          T_STMP_UPD: timestamp,
        });
      }

      updateProgress(100, `${isEditMode ? 'Application updated' : 'Application submitted'} successfully!`);
      toast.success(`${isEditMode ? 'Application updated' : 'Application submitted'} successfully!`);
      navigate('/applicant/dashboard');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'submit'} application. Please try again.`);
    } finally {
      setIsSubmitting(false);
      stopProgress();
    }
  };

  if (isLoading || authLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const applicantProfile = profile as GeneralUser;
  if (!ad || !post) return <div className="text-center py-20">Job details not found.</div>;

  const steps = [
    { id: 1, name: t('apply.steps.general'), icon: User },
    { id: 2, name: t('apply.steps.additional'), icon: Info },
    { id: 3, name: t('apply.steps.address'), icon: Home },
    { id: 4, name: t('apply.steps.qualification'), icon: GraduationCap },
    { id: 5, name: t('apply.steps.experience'), icon: Briefcase },
    { id: 6, name: t('apply.steps.preview'), icon: FileText },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= s.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                  {step > s.id ? <Check className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className={`mt-2 text-xs font-medium ${step >= s.id ? 'text-blue-600' : 'text-gray-500'}`}>{s.name}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100"
      >
        {/* Step 1: General Info (Read Only) */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-900 font-hindi-support">{t('apply.general_info_title')}</h2>
              <div className="flex items-center space-x-4">
                {applicantProfile?.Photo_URL && (
                  <div className="w-20 h-20 rounded-lg border-2 border-blue-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img 
                      src={getEmbedUrl(applicantProfile.Photo_URL)} 
                      alt="Photo" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error("Photo failed to load", applicantProfile.Photo_URL);
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Photo';
                      }}
                    />
                  </div>
                )}
                {applicantProfile?.Signature_URL && (
                  <div className="w-24 h-12 rounded-lg border-2 border-blue-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img 
                      src={getEmbedUrl(applicantProfile.Signature_URL)} 
                      alt="Signature" 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error("Signature failed to load", applicantProfile.Signature_URL);
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x50?text=No+Sign';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <h3 className="font-semibold text-blue-700 flex items-center font-hindi-support">
                  <User className="w-4 h-4 mr-2" /> {t('apply.personal_details')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.candidate_name')}</p>
                    <p className="font-medium text-gray-900">{profile?.Candidate_Name}</p>
                    <p className="text-sm text-gray-600 font-hindi-support">{profile?.Candidate_Name_HI}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.father_name')}</p>
                    <p className="font-medium text-gray-900">{profile?.Father_Name}</p>
                    <p className="text-sm text-gray-600 font-hindi-support">{profile?.Father_Name_HI}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.mother_name')}</p>
                    <p className="font-medium text-gray-900">{profile?.Mother_Name}</p>
                    <p className="text-sm text-gray-600 font-hindi-support">{profile?.Mother_Name_HI}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-blue-700 flex items-center font-hindi-support">
                  <Info className="w-4 h-4 mr-2" /> {t('apply.identity_contact')}
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.gender')}</p>
                      <p className="font-medium text-gray-900">{translateConstant(t, profile?.Gender || '')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.dob')}</p>
                      <p className="font-medium text-gray-900">{formatDate(profile?.DOB || '')}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.email')}</p>
                    <p className="font-medium text-gray-900">{profile?.Email_ID}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.mobile')}</p>
                    <p className="font-medium text-gray-900">{profile?.Mobile}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">{t('signup.id_number')}</p>
                    <p className="font-medium text-gray-900">{profile?.ID_Number}</p>
                    <p className="text-xs text-gray-500">{translateConstant(t, profile?.ID_Proof || '')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-blue-700 flex items-center font-hindi-support">
                  <FileText className="w-4 h-4 mr-2" /> {t('apply.uploaded_docs')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t('signup.dob_proof')} ({profile?.DOB_Certificate_Type})</p>
                    {profile?.DOB_Doc && (
                      <a href={profile.DOB_Doc} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded font-hindi-support">
                        <FileText className="w-3 h-3 mr-1" /> {t('common.view_document', 'View Document')}
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t('signup.id_proof')} ({translateConstant(t, profile?.ID_Proof || '')})</p>
                    {profile?.ID_Doc && (
                      <a href={profile.ID_Doc} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded font-hindi-support">
                        <FileText className="w-3 h-3 mr-1" /> {t('common.view_document', 'View Document')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800 flex items-start font-hindi-support">
              <Info className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t('apply.important_note')}:</p>
                <p>{t('apply.note_profile_fetch')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Additional Info */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 font-hindi-support">{t('apply.additional_info_title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.is_cg')}</label>
                <select
                  value={additionalInfo.Is_CG}
                  onChange={e => setAdditionalInfo({ ...additionalInfo, Is_CG: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                >
                  {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.domicile_state')}</label>
                <select
                  value={additionalInfo.Domicile_State}
                  onChange={e => setAdditionalInfo({ ...additionalInfo, Domicile_State: e.target.value, Domicile_District: '' })}
                  className={getInputClass('Domicile_State', 'mt-1 block w-full border rounded-md p-2')}
                >
                  <option value="">{t('signup.select_state', 'Select State')}</option>
                  {INDIA_STATES.map(state => <option key={state} value={state}>{translateConstant(t, state)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.domicile_district')}</label>
                <select
                  value={additionalInfo.Domicile_District}
                  onChange={e => setAdditionalInfo({ ...additionalInfo, Domicile_District: e.target.value })}
                  className={getInputClass('Domicile_District', 'mt-1 block w-full border rounded-md p-2 font-hindi-support')}
                  disabled={!additionalInfo.Domicile_State}
                >
                  <option value="">{t('signup.select_district', 'Select District')}</option>
                  {additionalInfo.Domicile_State && INDIA_STATES_DISTRICTS[additionalInfo.Domicile_State]?.map(dist => (
                    <option key={dist} value={dist}>{translateConstant(t, dist)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.locality')}</label>
                <select
                  value={additionalInfo.Locality}
                  onChange={e => setAdditionalInfo({ ...additionalInfo, Locality: e.target.value })}
                  className={getInputClass('Locality', 'mt-1 block w-full border rounded-md p-2')}
                >
                  <option value="Urban">{translateConstant(t, 'Urban')}</option>
                  <option value="Rural">{translateConstant(t, 'Rural')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.caste_category')}</label>
                <select
                  value={additionalInfo.Caste_Category}
                  onChange={e => setAdditionalInfo({ ...additionalInfo, Caste_Category: e.target.value })}
                  className={getInputClass('Caste_Category', 'mt-1 block w-full border rounded-md p-2')}
                >
                  {CASTE_CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                </select>
              </div>
              {additionalInfo.Caste_Category !== 'GEN' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.caste_state')}</label>
                    <select
                      value={additionalInfo.Caste_State}
                      onChange={e => setAdditionalInfo({ ...additionalInfo, Caste_State: e.target.value, Caste_District: '' })}
                      className={getInputClass('Caste_State', 'mt-1 block w-full border rounded-md p-2')}
                    >
                      <option value="">{t('signup.select_state', 'Select State')}</option>
                      {INDIA_STATES.map(state => <option key={state} value={state}>{translateConstant(t, state)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.caste_district')}</label>
                    <select
                      value={additionalInfo.Caste_District}
                      onChange={e => setAdditionalInfo({ ...additionalInfo, Caste_District: e.target.value })}
                      className={getInputClass('Caste_District', 'mt-1 block w-full border rounded-md p-2 font-hindi-support')}
                      disabled={!additionalInfo.Caste_State}
                    >
                      <option value="">{t('signup.select_district', 'Select District')}</option>
                      {additionalInfo.Caste_State && INDIA_STATES_DISTRICTS[additionalInfo.Caste_State]?.map(dist => (
                        <option key={dist} value={dist}>{translateConstant(t, dist)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.is_pwd')}</label>
                <select
                  value={additionalInfo.Is_PWD}
                  onChange={e => setAdditionalInfo({ ...additionalInfo, Is_PWD: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                >
                  {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                </select>
              </div>
              {additionalInfo.Is_PWD === 'Yes' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.pwd_state')}</label>
                    <select
                      value={additionalInfo.PwD_State}
                      onChange={e => setAdditionalInfo({ ...additionalInfo, PwD_State: e.target.value, PwD_District: '' })}
                      className={getInputClass('PwD_State', 'mt-1 block w-full border rounded-md p-2')}
                    >
                      <option value="">{t('signup.select_state', 'Select State')}</option>
                      {INDIA_STATES.map(state => <option key={state} value={state}>{translateConstant(t, state)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.pwd_district')}</label>
                    <select
                      value={additionalInfo.PwD_District}
                      onChange={e => setAdditionalInfo({ ...additionalInfo, PwD_District: e.target.value })}
                      className={getInputClass('PwD_District', 'mt-1 block w-full border rounded-md p-2 font-hindi-support')}
                      disabled={!additionalInfo.PwD_State}
                    >
                      <option value="">{t('signup.select_district', 'Select District')}</option>
                      {additionalInfo.PwD_State && INDIA_STATES_DISTRICTS[additionalInfo.PwD_State]?.map(dist => (
                        <option key={dist} value={dist}>{translateConstant(t, dist)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.pwd_percentage')}</label>
                    <input
                      type="number"
                      value={additionalInfo.PwD_Percentage}
                      onChange={e => setAdditionalInfo({ ...additionalInfo, PwD_Percentage: e.target.value })}
                      className={getInputClass('PwD_Percentage', 'mt-1 block w-full border rounded-md p-2')}
                    />
                  </div>
                </>
              )}
              {additionalInfo.Is_CG === 'Yes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.upload_domicile')}</label>
                  <input
                    type="file"
                    name="Domicile_Certificate_URL"
                    accept="image/*"
                    onChange={e => handleFileChange(e, setAdditionalInfo, additionalInfo)}
                    className={getInputClass('Domicile_Certificate_URL', 'mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100')}
                  />
                  {additionalInfo.Domicile_Certificate_URL && (
                    <p className="mt-1 text-xs text-green-600 font-medium font-hindi-support">✓ {t('signup.file_selected', 'File selected')}</p>
                  )}
                </div>
              )}
              {additionalInfo.Caste_Category !== 'GEN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.upload_caste')}</label>
                  <input
                    type="file"
                    name="Caste_Certificate_URL"
                    accept="image/*"
                    onChange={e => handleFileChange(e, setAdditionalInfo, additionalInfo)}
                    className={getInputClass('Caste_Certificate_URL', 'mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100')}
                  />
                  {additionalInfo.Caste_Certificate_URL && (
                    <p className="mt-1 text-xs text-green-600 font-medium font-hindi-support">✓ {t('signup.file_selected', 'File selected')}</p>
                  )}
                </div>
              )}
              {additionalInfo.Is_PWD === 'Yes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.upload_pwd')}</label>
                  <input
                    type="file"
                    name="PwD_Certificate_URL"
                    accept="image/*"
                    onChange={e => handleFileChange(e, setAdditionalInfo, additionalInfo)}
                    className={getInputClass('PwD_Certificate_URL', 'mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100')}
                  />
                  {additionalInfo.PwD_Certificate_URL && (
                    <p className="mt-1 text-xs text-green-600 font-medium font-hindi-support">✓ {t('signup.file_selected', 'File selected')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Address Info */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 font-hindi-support">{t('apply.address_info_title')}</h2>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 font-hindi-support">{t('apply.perm_address')}</h3>
              <textarea
                placeholder={t('apply.perm_address')}
                value={addressInfo.Perm_Address}
                onChange={e => setAddressInfo({ ...addressInfo, Perm_Address: e.target.value })}
                className={getInputClass('Perm_Address', 'w-full border rounded-md p-2')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder={t('apply.landmark')}
                  value={addressInfo.Perm_Landmark}
                  onChange={e => setAddressInfo({ ...addressInfo, Perm_Landmark: e.target.value })}
                  className="border border-gray-300 rounded-md p-2"
                />
                <select
                  value={addressInfo.Perm_State}
                  onChange={e => setAddressInfo({ ...addressInfo, Perm_State: e.target.value, Perm_District: '' })}
                  className={getInputClass('Perm_State', 'border rounded-md p-2 w-full')}
                >
                  <option value="">{t('signup.select_state', 'Select State')}</option>
                  {INDIA_STATES.map(state => <option key={state} value={state}>{translateConstant(t, state)}</option>)}
                </select>
                <select
                  value={addressInfo.Perm_District}
                  onChange={e => setAddressInfo({ ...addressInfo, Perm_District: e.target.value })}
                  className={getInputClass('Perm_District', 'border rounded-md p-2 font-hindi-support w-full')}
                  disabled={!addressInfo.Perm_State}
                >
                  <option value="">{t('signup.select_district', 'Select District')}</option>
                  {addressInfo.Perm_State && INDIA_STATES_DISTRICTS[addressInfo.Perm_State]?.map(dist => (
                    <option key={dist} value={dist}>{translateConstant(t, dist)}</option>
                  ))}
                </select>
                <input
                  placeholder={t('apply.pincode')}
                  value={addressInfo.Perm_Pincode}
                  onChange={e => setAddressInfo({ ...addressInfo, Perm_Pincode: e.target.value })}
                  className={getInputClass('Perm_Pincode', 'border rounded-md p-2 w-full')}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressInfo.Is_Same === 'Yes'}
                  onChange={e => {
                    const isSame = e.target.checked ? 'Yes' : 'No';
                    if (isSame === 'Yes') {
                      setAddressInfo({
                        ...addressInfo,
                        Is_Same: 'Yes',
                        Curr_Address: addressInfo.Perm_Address,
                        Curr_Landmark: addressInfo.Perm_Landmark,
                        Curr_State: addressInfo.Perm_State,
                        Curr_District: addressInfo.Perm_District,
                        Curr_Pincode: addressInfo.Perm_Pincode,
                      });
                    } else {
                      setAddressInfo({ ...addressInfo, Is_Same: 'No' });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700 font-hindi-support">{t('apply.same_as_perm')}</span>
              </label>
            </div>

            {addressInfo.Is_Same === 'No' && (
              <div className="space-y-4 pt-4">
                <h3 className="font-semibold text-gray-700 font-hindi-support">{t('apply.curr_address')}</h3>
                <textarea
                  placeholder={t('apply.curr_address')}
                  value={addressInfo.Curr_Address}
                  onChange={e => setAddressInfo({ ...addressInfo, Curr_Address: e.target.value })}
                  className={getInputClass('Curr_Address', 'w-full border rounded-md p-2')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    placeholder={t('apply.landmark')}
                    value={addressInfo.Curr_Landmark}
                    onChange={e => setAddressInfo({ ...addressInfo, Curr_Landmark: e.target.value })}
                    className="border border-gray-300 rounded-md p-2"
                  />
                  <select
                    value={addressInfo.Curr_State}
                    onChange={e => setAddressInfo({ ...addressInfo, Curr_State: e.target.value, Curr_District: '' })}
                    className={getInputClass('Curr_State', 'border rounded-md p-2 font-hindi-support w-full')}
                  >
                    <option value="">{t('signup.select_state', 'Select State')}</option>
                    {INDIA_STATES.map(state => <option key={state} value={state}>{translateConstant(t, state)}</option>)}
                  </select>
                  <select
                    value={addressInfo.Curr_District}
                    onChange={e => setAddressInfo({ ...addressInfo, Curr_District: e.target.value })}
                    className={getInputClass('Curr_District', 'border rounded-md p-2 font-hindi-support w-full')}
                    disabled={!addressInfo.Curr_State}
                  >
                    <option value="">{t('signup.select_district', 'Select District')}</option>
                    {addressInfo.Curr_State && INDIA_STATES_DISTRICTS[addressInfo.Curr_State]?.map(dist => (
                      <option key={dist} value={dist}>{translateConstant(t, dist)}</option>
                    ))}
                  </select>
                  <input
                    placeholder={t('apply.pincode')}
                    value={addressInfo.Curr_Pincode}
                    onChange={e => setAddressInfo({ ...addressInfo, Curr_Pincode: e.target.value })}
                    className={getInputClass('Curr_Pincode', 'border rounded-md p-2 w-full')}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Qualification */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 font-hindi-support">{t('apply.qualification_title')}</h2>
            {qualifications.map((q, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4 relative">
                {qualifications.length > 1 && (
                  <button
                    onClick={() => setQualifications(qualifications.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                    title="Remove Qualification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={q.Qualification_Type}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Qualification_Type = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Qualification_Type`, 'border rounded-md p-2 w-full')}
                  >
                    {QUALIFICATION_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                  </select>
                  <input
                    placeholder={t('apply.course_name')}
                    value={q.Course_Name}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Course_Name = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Course_Name`, 'border rounded-md p-2 w-full')}
                  />
                  <input
                    placeholder={t('apply.board_univ')}
                    value={q.Board_Name}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Board_Name = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Board_Name`, 'border rounded-md p-2 w-full')}
                  />
                  <input
                    placeholder={t('apply.inst_name')}
                    value={q.Institute_Name}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Institute_Name = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Institute_Name`, 'border rounded-md p-2 w-full')}
                  />
                  <input
                    placeholder={t('apply.pass_year')}
                    value={q.Pass_Year}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Pass_Year = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Pass_Year`, 'border rounded-md p-2 w-full')}
                  />
                  <select
                    value={q.Result_Status}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Result_Status = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Result_Status`, 'border rounded-md p-2 w-full')}
                  >
                    <option value="">{t('apply.result_status')}</option>
                    {RESULT_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                  </select>
                  <select
                    value={q.Marks_Type}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Marks_Type = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Marks_Type`, 'border rounded-md p-2 w-full')}
                  >
                    <option value="">{t('apply.marks_type')}</option>
                    {MARKS_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                  </select>
                  <input
                    placeholder={t('apply.max_marks')}
                    type="number"
                    value={q.Max_Marks}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Max_Marks = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Max_Marks`, 'border rounded-md p-2 w-full')}
                  />
                  <input
                    placeholder={t('apply.obt_marks')}
                    type="number"
                    value={q.Marks_Obtained}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Marks_Obtained = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Marks_Obtained`, 'border rounded-md p-2 w-full')}
                  />
                  <input
                    placeholder={t('apply.percentage')}
                    type="number"
                    value={q.Percentage}
                    onChange={e => {
                      const newQ = [...qualifications];
                      newQ[i].Percentage = e.target.value;
                      setQualifications(newQ);
                    }}
                    className={getInputClass(`qual_${i}_Percentage`, 'border rounded-md p-2 w-full')}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => setQualifications([...qualifications, { 
                Qualification_Type: 'Graduation Certificate',
                Course_Name: '',
                Board_Name: '',
                Institute_Name: '',
                Pass_Year: '',
                Result_Status: 'Passed',
                Marks_Type: 'Percentage',
                Max_Marks: '',
                Marks_Obtained: '',
                Percentage: '',
              }])}
              className="text-blue-600 font-medium hover:underline font-hindi-support"
            >
              + {t('apply.add_qualification')}
            </button>
          </div>
        )}

        {/* Step 5: Experience */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 font-hindi-support">{t('apply.experience_title')}</h2>
            {experiences.length === 0 ? (
              <p className="text-gray-500 italic font-hindi-support">{t('apply.no_experience_added', 'No experience added. Click below to add if applicable.')}</p>
            ) : (
              experiences.map((exp, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4 relative">
                  <button
                    onClick={() => setExperiences(experiences.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                    title="Remove Experience"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.currently_working')}</label>
                      <select
                        value={exp.Currently_Working}
                        onChange={e => {
                          const newE = [...experiences];
                          newE[i].Currently_Working = e.target.value;
                          if (e.target.value === 'Yes') {
                            newE[i].End_Date = '';
                          }
                          setExperiences(newE);
                        }}
                        className={getInputClass(`exp_${i}_Currently_Working`, 'mt-1 block w-full border rounded-md p-2')}
                      >
                        {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.employer_type')}</label>
                      <select
                        value={exp.Employer_Type}
                        onChange={e => {
                          const newE = [...experiences];
                          newE[i].Employer_Type = e.target.value;
                          setExperiences(newE);
                        }}
                        className={getInputClass(`exp_${i}_Employer_Type`, 'mt-1 block w-full border rounded-md p-2 font-hindi-support')}
                      >
                        <option value="">{t('apply.select_employer_type', 'Select Employer Type')}</option>
                        {DEPT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-hindi-support">{t('apply.employment_type')}</label>
                      <select
                        value={exp.Employment_Type}
                        onChange={e => {
                          const newE = [...experiences];
                          newE[i].Employment_Type = e.target.value;
                          setExperiences(newE);
                        }}
                        className={getInputClass(`exp_${i}_Employment_Type`, 'mt-1 block w-full border rounded-md p-2 font-hindi-support')}
                      >
                        <option value="">{t('apply.select_employment_type', 'Select Employment Type')}</option>
                        {EMPLOYMENT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{translateConstant(t, opt)}</option>)}
                      </select>
                    </div>
                  </div>
                  <input
                    placeholder={t('apply.employer_name')}
                    value={exp.Employer_Name}
                    onChange={e => {
                      const newE = [...experiences];
                      newE[i].Employer_Name = e.target.value;
                      setExperiences(newE);
                    }}
                    className={getInputClass(`exp_${i}_Employer_Name`, 'w-full border rounded-md p-2')}
                  />
                  <textarea
                    placeholder={t('apply.address')}
                    value={exp.Employer_Address}
                    onChange={e => {
                      const newE = [...experiences];
                      newE[i].Employer_Address = e.target.value;
                      setExperiences(newE);
                    }}
                    className={getInputClass(`exp_${i}_Employer_Address`, 'w-full border rounded-md p-2')}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      placeholder={t('apply.post_held')}
                      value={exp.Post_Held}
                      onChange={e => {
                        const newE = [...experiences];
                        newE[i].Post_Held = e.target.value;
                        setExperiences(newE);
                      }}
                      className={getInputClass(`exp_${i}_Post_Held`, 'border rounded-md p-2')}
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-500 font-hindi-support">{t('apply.start_date')}</label>
                        <input
                          type="date"
                          value={formatDateForInput(exp.Start_Date)}
                          onChange={e => {
                            const newE = [...experiences];
                            newE[i].Start_Date = e.target.value;
                            setExperiences(newE);
                          }}
                          className={getInputClass(`exp_${i}_Start_Date`, 'w-full border rounded-md p-2')}
                        />
                      </div>
                      {exp.Currently_Working === 'No' && (
                        <div className="flex-1">
                          <label className="block text-[10px] text-gray-500 font-hindi-support">{t('apply.end_date')}</label>
                          <input
                            type="date"
                            value={formatDateForInput(exp.End_Date)}
                            onChange={e => {
                              const newE = [...experiences];
                              newE[i].End_Date = e.target.value;
                              setExperiences(newE);
                            }}
                            className={getInputClass(`exp_${i}_End_Date`, 'w-full border rounded-md p-2')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setExperiences([...experiences, { 
                Currently_Working: 'No',
                Employer_Type: '',
                Employment_Type: '',
                Employer_Name: '',
                Employer_Address: '',
                Post_Held: '',
                Start_Date: '',
                End_Date: ''
              }])}
              className="text-blue-600 font-medium hover:underline font-hindi-support"
            >
              + {t('apply.add_experience')}
            </button>
          </div>
        )}

        {/* Step 6: Preview & Declaration */}
        {step === 6 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-4 font-hindi-support">{t('apply.steps.preview_declaration')}</h2>
            
            {/* Quick Preview */}
            <div className="bg-gray-50 p-6 rounded-xl space-y-6 text-sm font-hindi-support border border-gray-100 relative">
              {/* Photo Display */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b pb-6">
                {/* Left side: Photo */}
                {applicantProfile?.Photo_URL && (
                  <div className="flex flex-col items-start">
                    <div className="w-24 h-24 rounded border border-gray-300 overflow-hidden bg-white mb-2">
                       <img 
                          src={getEmbedUrl(applicantProfile.Photo_URL)} 
                          alt="Applicant Photo" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{t('signup.applicant_photo', 'Applicant Photo')}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-800 border-b pb-2">{t('apply.steps.general')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">{t('signup.name_mr_ms', 'Full Name')}:</span> <span className="font-medium text-gray-900">{applicantProfile?.Candidate_Name}</span> <span className="text-sm text-gray-600 font-hindi-support ml-1">({applicantProfile?.Candidate_Name_HI})</span></div>
                  <div><span className="text-gray-500">{t('signup.father_name', 'Father Name')}:</span> <span className="font-medium text-gray-900">{applicantProfile?.Father_Name}</span> <span className="text-sm text-gray-600 font-hindi-support ml-1">({applicantProfile?.Father_Name_HI})</span></div>
                  <div><span className="text-gray-500">{t('signup.mother_name', 'Mother Name')}:</span> <span className="font-medium text-gray-900">{applicantProfile?.Mother_Name}</span> <span className="text-sm text-gray-600 font-hindi-support ml-1">({applicantProfile?.Mother_Name_HI})</span></div>
                  <div><span className="text-gray-500">{t('signup.dob')}:</span> <span className="font-medium text-gray-900">{formatDate(applicantProfile?.DOB)}</span></div>
                  <div><span className="text-gray-500">{t('signup.gender')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, applicantProfile?.Gender || '')}</span></div>
                  <div><span className="text-gray-500">{t('signup.mobile')}:</span> <span className="font-medium text-gray-900">{applicantProfile?.Mobile}</span></div>
                  <div><span className="text-gray-500">{t('signup.email')}:</span> <span className="font-medium text-gray-900">{applicantProfile?.Email_ID}</span></div>
                  <div><span className="text-gray-500">{t('signup.id_number')}:</span> <span className="font-medium text-gray-900">{applicantProfile?.ID_Number}</span> <span className="text-sm text-gray-600">({translateConstant(t, applicantProfile?.ID_Proof || '')})</span></div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-800 border-b pb-2">{t('apply.steps.additional')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><span className="text-gray-500">{t('apply.domicile_cg', 'Domicile Chhattisgarh')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Is_CG || '')}</span></div>
                  {additionalInfo.Is_CG === 'Yes' && (
                    <>
                      <div><span className="text-gray-500">{t('apply.domicile_state', 'Domicile State')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Domicile_State || '')}</span></div>
                      <div><span className="text-gray-500">{t('apply.domicile_district', 'Domicile District')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Domicile_District || '')}</span></div>
                    </>
                  )}
                  <div><span className="text-gray-500">{t('apply.locality', 'Locality')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Locality || '')}</span></div>
                  
                  <div><span className="text-gray-500">{t('apply.caste_cat', 'Caste Category')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Caste_Category || '')}</span></div>
                  {additionalInfo.Caste_Category !== 'GEN' && (
                    <>
                      <div><span className="text-gray-500">{t('apply.caste_state', 'Caste State')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Caste_State || '')}</span></div>
                      <div><span className="text-gray-500">{t('apply.caste_district', 'Caste District')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Caste_District || '')}</span></div>
                    </>
                  )}
                  
                  <div><span className="text-gray-500">{t('apply.is_pwd')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.Is_PWD || '')}</span></div>
                  {additionalInfo.Is_PWD === 'Yes' && (
                    <>
                      <div><span className="text-gray-500">{t('apply.pwd_percentage', 'PwD Percentage')}:</span> <span className="font-medium text-gray-900">{additionalInfo.PwD_Percentage}%</span></div>
                      <div><span className="text-gray-500">{t('apply.pwd_state', 'PwD Cert. Issuing State')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.PwD_State || '')}</span></div>
                      <div><span className="text-gray-500">{t('apply.pwd_district', 'PwD Cert. Issuing District')}:</span> <span className="font-medium text-gray-900">{translateConstant(t, additionalInfo.PwD_District || '')}</span></div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-800 border-b pb-2">{t('apply.steps.address')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 block mb-1">{t('apply.perm_address')}:</span>
                    <span className="font-medium text-gray-900">{addressInfo.Perm_Address}, {addressInfo.Perm_Landmark && `${addressInfo.Perm_Landmark}, `}{translateConstant(t, addressInfo.Perm_District)}, {translateConstant(t, addressInfo.Perm_State)} - {addressInfo.Perm_Pincode}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">{t('apply.curr_address')}:</span>
                     {addressInfo.Is_Same === 'Yes' ? (
                       <span className="font-medium text-gray-900 italic text-sm">{t('apply.same_as_perm_short', '(Same as permanent address)')}</span>
                     ) : (
                       <span className="font-medium text-gray-900">{addressInfo.Curr_Address}, {addressInfo.Curr_Landmark && `${addressInfo.Curr_Landmark}, `}{translateConstant(t, addressInfo.Curr_District)}, {translateConstant(t, addressInfo.Curr_State)} - {addressInfo.Curr_Pincode}</span>
                     )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-800 border-b pb-2">{t('apply.steps.qualification')}</h3>
                {qualifications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-gray-100 text-gray-600">
                         <tr>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_course', 'Course')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_board', 'Board/Univ')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_inst', 'Inst.')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_year', 'Year')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_type', 'Type')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_marks', 'Marks')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_result', 'Result')}</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-200">
                         {qualifications.map((q, i) => (
                           <tr key={i}>
                             <td className="px-3 py-2">{q.Course_Name}</td>
                             <td className="px-3 py-2">{q.Board_Name}</td>
                             <td className="px-3 py-2">{q.Institute_Name}</td>
                             <td className="px-3 py-2">{q.Pass_Year}</td>
                             <td className="px-3 py-2">{translateConstant(t, q.Marks_Type || '')}</td>
                             <td className="px-3 py-2">{q.Marks_Obtained}/{q.Max_Marks}</td>
                             <td className="px-3 py-2 font-medium">{q.Percentage}%</td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-gray-500 italic">{t('apply.no_qual', 'No qualifications added.')}</span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-800 border-b pb-2">{t('apply.steps.experience')}</h3>
                {experiences.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                       <thead className="bg-gray-100 text-gray-600">
                         <tr>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_employer', 'Employer')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_emp_type', 'Employer Type')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_post', 'Post Held')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_type', 'Type')}</th>
                            <th className="px-3 py-2 font-semibold">{t('apply.sum_period', 'Period')}</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-200">
                         {experiences.map((exp, i) => (
                           <tr key={i}>
                             <td className="px-3 py-2">
                               {exp.Employer_Name}
                               {exp.Employer_Address && <div className="text-gray-500 text-[10px] truncate max-w-[150px]">{exp.Employer_Address}</div>}
                             </td>
                             <td className="px-3 py-2">{translateConstant(t, exp.Employer_Type || '')}</td>
                             <td className="px-3 py-2">{exp.Post_Held}</td>
                             <td className="px-3 py-2">{translateConstant(t, exp.Employment_Type || '')}</td>
                             <td className="px-3 py-2">
                               {exp.Start_Date} {t('ad_details.to', 'to')} {exp.Currently_Working === 'Yes' ? t('apply.present', 'Present') : exp.End_Date}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-gray-500 italic">{t('apply.no_exp', 'No experience added.')}</span>
                )}
              </div>
            </div>

            {/* Declaration */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-8">
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={isAgreedToTerms}
                    onChange={(e) => setIsAgreedToTerms(e.target.checked)}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 mb-2 font-hindi-support">{t('apply.steps.preview_declaration')}</h4>
                  <p className="text-blue-800 text-sm leading-relaxed font-hindi-support">
                    I hereby declare that all the information provided in this application is true, complete, and correct to the best of my knowledge and belief. I understand that in the event of any information being found false or incorrect at any stage, my candidature/appointment shall be liable to be cancelled/terminated without any notice.
                  </p>
                  <p className="text-blue-800 text-sm leading-relaxed font-hindi-support mt-2">
                    मैं एतद्द्वारा घोषणा करता/करती हूँ कि इस आवेदन में दी गई सभी जानकारी मेरे सर्वोत्तम ज्ञान और विश्वास के अनुसार सत्य, पूर्ण और सही है। मैं समझता/समझती हूँ कि किसी भी स्तर पर कोई भी जानकारी झूठी या गलत पाए जाने की स्थिति में, मेरी उम्मीदवारी/नियुक्ति बिना किसी पूर्व सूचना के रद्द/समाप्त कर दी जाएगी।
                  </p>
                </div>
              </label>

              {/* Signature Block Below Declaration */}
              {applicantProfile?.Signature_URL && (
                <div className="mt-6 border-t border-blue-200 pt-6 flex flex-col items-end">
                  <div className="w-32 h-16 rounded border border-gray-300 overflow-hidden bg-white mb-2 p-1">
                     <img 
                        src={getEmbedUrl(applicantProfile.Signature_URL)} 
                        alt={t('signup.applicant_signature')} 
                        className="w-full h-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                  </div>
                  <span className="text-xs text-blue-900 font-bold">{applicantProfile?.Candidate_Name}</span>
                  <span className="text-[10px] text-blue-600">{t('signup.applicant_signature')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-12 flex justify-between font-hindi-support">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            {t('apply.prev')}
          </button>
          {step < 6 ? (
            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              {t('apply.next')}
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isAgreedToTerms}
              className="flex items-center px-8 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? t('common.processing') : t('apply.submit_application')}
              <Save className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ApplyJob;
