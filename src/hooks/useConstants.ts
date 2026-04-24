import { useState, useEffect } from 'react';
import { sheetService } from '../services/sheetService';
import { GlobalConstant } from '../types';
import * as staticConstants from '../constants';

export const useConstants = () => {
  const [constants, setConstants] = useState<GlobalConstant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await sheetService.getAll<GlobalConstant>('Global_Constants');
        setConstants(data);
      } catch (error) {
        console.error('Error fetching constants:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConstants();
  }, []);

  const getOptions = (category: string, fallback: string[]) => {
    const liveOptions = constants
      .filter(c => c.Category === category)
      .map(c => c.Value);
    
    return liveOptions.length > 0 ? liveOptions : fallback;
  };

  return {
    isLoading,
    GENDER_OPTIONS: getOptions('GENDER', staticConstants.GENDER_OPTIONS),
    DOB_PROOF_OPTIONS: getOptions('DOB_PROOF', staticConstants.DOB_PROOF_OPTIONS),
    ID_PROOF_OPTIONS: getOptions('ID_PROOF', staticConstants.ID_PROOF_OPTIONS),
    YES_NO_OPTIONS: getOptions('YES_NO', staticConstants.YES_NO_OPTIONS),
    CASTE_CATEGORY_OPTIONS: getOptions('CASTE_CATEGORY', staticConstants.CASTE_CATEGORY_OPTIONS),
    LOCALITY_OPTIONS: getOptions('LOCALITY', staticConstants.LOCALITY_OPTIONS),
    QUALIFICATION_TYPE_OPTIONS: getOptions('QUALIFICATION_TYPE', staticConstants.QUALIFICATION_TYPE_OPTIONS),
    POST_TYPE_OPTIONS: getOptions('POST_TYPE', staticConstants.POST_TYPE_OPTIONS),
    SERVICE_TYPE_OPTIONS: getOptions('SERVICE_TYPE', staticConstants.SERVICE_TYPE_OPTIONS),
    CLASS_OPTIONS: getOptions('CLASS', staticConstants.CLASS_OPTIONS),
    DEPT_TYPE_OPTIONS: getOptions('DEPT_TYPE', staticConstants.DEPT_TYPE_OPTIONS),
    RESULT_STATUS_OPTIONS: getOptions('RESULT_STATUS', staticConstants.RESULT_STATUS_OPTIONS),
    MARKS_TYPE_OPTIONS: getOptions('MARKS_TYPE', staticConstants.MARKS_TYPE_OPTIONS),
    EMPLOYER_TYPE_OPTIONS: getOptions('EMPLOYER_TYPE', staticConstants.EMPLOYER_TYPE_OPTIONS),
    EMPLOYMENT_TYPE_OPTIONS: getOptions('EMPLOYMENT_TYPE', staticConstants.EMPLOYMENT_TYPE_OPTIONS),
  };
};
