// This service will handle data persistence.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCYkmvmh-aexu3GRsVJGDnZ9TrmKXHsFhIAHO4dVxHpVSVDdTqDW1ZlvbbRNSC0YhS/exec';

const STORAGE_KEYS = {
  User: 'ojas_users',
  Department: 'ojas_departments',
  Office: 'ojas_offices',
  General_User: 'ojas_general_users',
  Office_User: 'ojas_office_users',
  Advertisement: 'ojas_advertisements',
  Post: 'ojas_posts',
  Application: 'ojas_applications',
  Additional_Info: 'ojas_additional_info',
  Address_Info: 'ojas_address_info',
  Qualification_Info: 'ojas_qualification_info',
  Experience_Info: 'ojas_experience_info',
  Global_Constants: 'ojas_global_constants',
  Claim: 'ojas_claims',
};

// Initialize with some mock data if empty
const initializeMockData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.Department)) {
    localStorage.setItem(STORAGE_KEYS.Department, JSON.stringify([
      { Dept_ID: '1', Dept_Name: 'Education', Dept_Type: 'State Govt.', T_STMP_ADD: new Date().toISOString() },
      { Dept_ID: '2', Dept_Name: 'Health', Dept_Type: 'State Govt.', T_STMP_ADD: new Date().toISOString() },
    ]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.Office)) {
    localStorage.setItem(STORAGE_KEYS.Office, JSON.stringify([
      { Office_ID: '1', Office_Name: 'DEO Raipur', Address: 'Raipur', Dept_ID: '1', T_STMP_ADD: new Date().toISOString() },
    ]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.User)) {
    localStorage.setItem(STORAGE_KEYS.User, JSON.stringify([
      { User_ID: '1', User_Name: 'admin', Password: 'password', User_Type: 'admin', T_STMP_ADD: new Date().toISOString() },
      { User_ID: '2', User_Name: 'office1', Password: 'password', User_Type: 'office', T_STMP_ADD: new Date().toISOString() },
    ]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.Advertisement)) {
    localStorage.setItem(STORAGE_KEYS.Advertisement, JSON.stringify([
      { 
        Adv_ID: '1', 
        Dept_ID: '1', 
        Office_ID: '1', 
        Letter_No: 'ED/2026/001', 
        Title: 'Recruitment of Assistant Teachers 2026', 
        Instructions: '1. Read all terms carefully.\n2. Upload clear documents.', 
        Terms_Conditions: 'Age limit: 21-35 years.\nQualification: B.Ed/D.Ed.', 
        Start_Date: '2026-04-01', 
        End_Date: '2026-05-30', 
        T_STMP_ADD: new Date().toISOString() 
      },
      { 
        Adv_ID: '2', 
        Dept_ID: '2', 
        Office_ID: '1', 
        Letter_No: 'HL/2026/042', 
        Title: 'Staff Nurse Vacancy - District Hospital', 
        Instructions: 'Apply online only.', 
        Terms_Conditions: 'B.Sc Nursing required.', 
        Start_Date: '2026-04-05', 
        End_Date: '2026-04-25', 
        T_STMP_ADD: new Date().toISOString() 
      },
    ]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.Post)) {
    localStorage.setItem(STORAGE_KEYS.Post, JSON.stringify([
      { 
        Post_ID: '1', 
        Post_Name: 'Assistant Teacher (Maths)', 
        Post_Type: 'Regular', 
        Service_Type: 'Non-Gazetted', 
        Class: 'Class III', 
        Payscale: 'Level 8 (35400-112400)', 
        Qualification: 'Graduation in Maths + B.Ed', 
        Experience: 'Not Required', 
        Adv_ID: '1', 
        T_STMP_ADD: new Date().toISOString() 
      },
      { 
        Post_ID: '2', 
        Post_Name: 'Staff Nurse', 
        Post_Type: 'Contractual', 
        Service_Type: 'Non-Gazetted', 
        Class: 'Class III', 
        Payscale: 'Fixed 25000/-', 
        Qualification: 'B.Sc Nursing', 
        Experience: '2 Years', 
        Adv_ID: '2', 
        T_STMP_ADD: new Date().toISOString() 
      },
    ]));
  }
  const globalConstants = localStorage.getItem(STORAGE_KEYS.Global_Constants);
  if (!globalConstants || JSON.parse(globalConstants).length === 0) {
    const defaultConstants = [
      { Category: 'GENDER', Value: 'Male' },
      { Category: 'GENDER', Value: 'Female' },
      { Category: 'GENDER', Value: 'Other' },
      { Category: 'DOB_PROOF', Value: '10th marksheet' },
      { Category: 'DOB_PROOF', Value: '12th marksheet' },
      { Category: 'DOB_PROOF', Value: 'Birth Certificate' },
      { Category: 'ID_PROOF', Value: 'Aadhar Card' },
      { Category: 'ID_PROOF', Value: 'PAN Card' },
      { Category: 'ID_PROOF', Value: 'Voter ID Card' },
      { Category: 'ID_PROOF', Value: 'Passport' },
      { Category: 'ID_PROOF', Value: 'Driving License' },
      { Category: 'ID_PROOF', Value: 'Smart Card by RGI' },
      { Category: 'ID_PROOF', Value: 'ID Card issued by Employer' },
      { Category: 'ID_PROOF', Value: 'Health Smart Card' },
      { Category: 'YES_NO', Value: 'Yes' },
      { Category: 'YES_NO', Value: 'No' },
      { Category: 'CASTE_CATEGORY', Value: 'GEN' },
      { Category: 'CASTE_CATEGORY', Value: 'OBC' },
      { Category: 'CASTE_CATEGORY', Value: 'SC' },
      { Category: 'CASTE_CATEGORY', Value: 'ST' },
      { Category: 'LOCALITY', Value: 'Urban' },
      { Category: 'LOCALITY', Value: 'Rural' },
      { Category: 'QUALIFICATION_TYPE', Value: 'High School (10th) Certificate' },
      { Category: 'QUALIFICATION_TYPE', Value: 'Higher Secondary (12th) Certificate' },
      { Category: 'QUALIFICATION_TYPE', Value: 'Graduation Certificate' },
      { Category: 'QUALIFICATION_TYPE', Value: 'Post-Graduation Certificate' },
      { Category: 'QUALIFICATION_TYPE', Value: 'Diploma Certificate' },
      { Category: 'QUALIFICATION_TYPE', Value: 'ITI Certificate' },
      { Category: 'QUALIFICATION_TYPE', Value: 'PhD' },
      { Category: 'POST_TYPE', Value: 'Regular' },
      { Category: 'POST_TYPE', Value: 'Sanvida' },
      { Category: 'POST_TYPE', Value: 'Contractual' },
      { Category: 'POST_TYPE', Value: 'Daily Wages' },
      { Category: 'POST_TYPE', Value: 'Private' },
      { Category: 'SERVICE_TYPE', Value: 'Gazetted - Executive' },
      { Category: 'SERVICE_TYPE', Value: 'Gazetted and Non-Executive' },
      { Category: 'SERVICE_TYPE', Value: 'Non-Gazetted and Non-Executive' },
      { Category: 'SERVICE_TYPE', Value: 'Private' },
      { Category: 'CLASS', Value: 'Class I' },
      { Category: 'CLASS', Value: 'Class II' },
      { Category: 'CLASS', Value: 'Class III' },
      { Category: 'CLASS', Value: 'Class IV' },
      { Category: 'DEPT_TYPE', Value: 'State Govt.' },
      { Category: 'DEPT_TYPE', Value: 'Central Govt.' },
      { Category: 'DEPT_TYPE', Value: 'PSU' },
      { Category: 'DEPT_TYPE', Value: 'Autonomous Body' },
      { Category: 'RESULT_STATUS', Value: 'Passed' },
      { Category: 'RESULT_STATUS', Value: 'Appeared' },
      { Category: 'RESULT_STATUS', Value: 'Result Awaited' },
      { Category: 'MARKS_TYPE', Value: 'Percentage' },
      { Category: 'MARKS_TYPE', Value: 'CGPA' },
      { Category: 'MARKS_TYPE', Value: 'Grade' },
      { Category: 'EMPLOYER_TYPE', Value: 'Central Govt.' },
      { Category: 'EMPLOYER_TYPE', Value: 'State Govt.' },
      { Category: 'EMPLOYER_TYPE', Value: 'PSU' },
      { Category: 'EMPLOYER_TYPE', Value: 'Private' },
      { Category: 'EMPLOYER_TYPE', Value: 'Other' },
      { Category: 'EMPLOYMENT_TYPE', Value: 'Regular' },
      { Category: 'EMPLOYMENT_TYPE', Value: 'Contractual' },
      { Category: 'EMPLOYMENT_TYPE', Value: 'Temporary' },
    ].map((c, i) => ({
      ...c,
      Constant_ID: String(i + 1),
      T_STMP_ADD: new Date().toISOString(),
      T_STMP_UPD: new Date().toISOString()
    }));
    localStorage.setItem(STORAGE_KEYS.Global_Constants, JSON.stringify(defaultConstants));
  }
  if (!localStorage.getItem(STORAGE_KEYS.Claim)) {
    localStorage.setItem(STORAGE_KEYS.Claim, JSON.stringify([]));
  }
};

initializeMockData();

let isAppsScriptAvailable = true;

export const sheetService = {
  async getAll<T>(sheetName: keyof typeof STORAGE_KEYS, forceLocal: boolean = false): Promise<T[]> {
    if (!forceLocal && APPS_SCRIPT_URL && isAppsScriptAvailable) {
      try {
        const response = await fetch(`${APPS_SCRIPT_URL}?sheetName=${sheetName}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) return data;
        if (Array.isArray(data) && data.length === 0 && sheetName !== 'Global_Constants') return [];
        console.warn(`Apps Script returned empty or non-array for ${sheetName}, falling back to localStorage`);
      } catch (error) {
        // If it's a network error, we might want to stop trying to avoid spamming the console
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.warn(`Apps Script is unreachable at ${APPS_SCRIPT_URL}. Falling back to Local Storage mode.`);
          isAppsScriptAvailable = false; // Disable for this session
        } else {
          console.error(`Error fetching ${sheetName} from Apps Script:`, error);
        }
      }
    }
    const data = localStorage.getItem(STORAGE_KEYS[sheetName]);
    return data ? JSON.parse(data) : [];
  },

  async insert<T>(sheetName: keyof typeof STORAGE_KEYS, payload: T): Promise<void> {
    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { ...payload, T_STMP_ADD: timestamp, T_STMP_UPD: timestamp };

    if (APPS_SCRIPT_URL && isAppsScriptAvailable) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'insert', sheetName, payload: dataWithTimestamp }),
        });
        const result = await response.text();
        if (result.startsWith('Error')) {
          if (result.includes('Sheet not found')) {
            console.error(`ERROR: Sheet "${sheetName}" not found in your Google Sheet. Please run the "initDatabase" function in your Apps Script editor and re-deploy.`);
          } else if (result.includes('Access denied') || result.includes('DriveApp')) {
            console.error('ERROR: Google Drive access denied. Please re-authorize your Apps Script and ensure you are logged into only one Google account.');
          } else {
            console.error(`Apps Script Insert Error for ${sheetName}:`, result);
          }
          // We don't throw here to allow fallback to localStorage
        }
      } catch (error) {
        console.error(`Network error inserting into ${sheetName} via Apps Script:`, error);
        // Fallback to localStorage
      }
    }

    try {
      const current = await sheetService.getAll<any>(sheetName, true);
      
      // Optimization: Strip large Base64 data before saving to localStorage to prevent QuotaExceededError
      // We only do this if cloud is available, as the cloud holds the real file URLs
      const localData = { ...dataWithTimestamp };
      if (isAppsScriptAvailable) {
        for (const key in localData as any) {
          const val = (localData as any)[key];
          if (typeof val === 'string' && val.startsWith('data:') && val.includes(';base64,')) {
            (localData as any)[key] = '[File Data - Uploaded to Cloud]';
          }
        }
      }

      current.push(localData);
      localStorage.setItem(STORAGE_KEYS[sheetName], JSON.stringify(current));
    } catch (e) {
      if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('LocalStorage quota exceeded. Clearing non-essential data...');
        // If quota exceeded, we prioritize cloud storage and don't crash the app
      } else {
        console.error('Error saving to localStorage:', e);
      }
    }
  },

  async bulkInsert<T>(sheetName: keyof typeof STORAGE_KEYS, payloads: T[], clearFirst: boolean = false): Promise<void> {
    const timestamp = new Date().toISOString();
    const dataWithTimestamp = payloads.map(p => ({ 
      ...p, 
      T_STMP_ADD: (p as any).T_STMP_ADD || timestamp, 
      T_STMP_UPD: timestamp 
    }));

    if (APPS_SCRIPT_URL && isAppsScriptAvailable) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'bulkInsert', sheetName, payloads: dataWithTimestamp, clearFirst }),
        });
        const result = await response.text();
        if (result.startsWith('Error')) {
          console.error(`Apps Script Bulk Insert Error for ${sheetName}:`, result);
        }
      } catch (error) {
        console.error(`Network error bulk inserting into ${sheetName} via Apps Script:`, error);
      }
    }

    try {
      if (clearFirst) {
        localStorage.setItem(STORAGE_KEYS[sheetName], JSON.stringify(dataWithTimestamp));
      } else {
        const current = await sheetService.getAll<any>(sheetName, true);
        localStorage.setItem(STORAGE_KEYS[sheetName], JSON.stringify([...current, ...dataWithTimestamp]));
      }
    } catch (e) {
      console.warn('LocalStorage update failed (likely quota):', e);
    }
  },

  async update<T>(sheetName: keyof typeof STORAGE_KEYS, idColumn: string, idValue: string, payload: Partial<T>): Promise<void> {
    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { ...payload, T_STMP_UPD: timestamp };

    if (APPS_SCRIPT_URL && isAppsScriptAvailable) {
      try {
        console.log(`Updating ${sheetName} in Global Database:`, { idColumn, idValue, payload: dataWithTimestamp });
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'update', sheetName, idColumn, idValue, payload: dataWithTimestamp }),
        });
        const result = await response.text();
        console.log(`Global Database update result for ${sheetName}:`, result);
        if (result.startsWith('Error')) {
          console.error(`Apps Script Update Error for ${sheetName}:`, result);
        }
      } catch (error) {
        console.error(`Network error updating ${sheetName} via Apps Script:`, error);
      }
    }

    try {
      const current = await sheetService.getAll<any>(sheetName, true);
      const index = current.findIndex((item: any) => String(item[idColumn]) === String(idValue));
      if (index !== -1) {
        // Optimization: Strip large Base64 data for local storage
        const localData = { ...dataWithTimestamp };
        if (isAppsScriptAvailable) {
          for (const key in localData as any) {
            const val = (localData as any)[key];
            if (typeof val === 'string' && val.startsWith('data:') && val.includes(';base64,')) {
              (localData as any)[key] = '[File Data - Uploaded to Cloud]';
            }
          }
        }
        
        current[index] = { ...current[index], ...localData };
        localStorage.setItem(STORAGE_KEYS[sheetName], JSON.stringify(current));
      }
    } catch (e) {
      console.warn('LocalStorage update failed (likely quota):', e);
    }
  },

  async delete(sheetName: keyof typeof STORAGE_KEYS, idColumn: string, idValue: string): Promise<void> {
    // Update local storage immediately for responsiveness
    try {
      const current = await sheetService.getAll<any>(sheetName, true);
      const filtered = current.filter((item: any) => String(item[idColumn]) !== String(idValue));
      localStorage.setItem(STORAGE_KEYS[sheetName], JSON.stringify(filtered));
    } catch (e) {
      console.warn('LocalStorage delete failed:', e);
    }

    // Then try to update the Global Database
    if (APPS_SCRIPT_URL && isAppsScriptAvailable) {
      try {
        console.log(`Sending delete request to Apps Script for ${sheetName}, ${idColumn}=${idValue}`);
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'delete', sheetName, idColumn, idValue }),
        });
        const result = await response.text();
        console.log(`Delete response for ${sheetName}:`, result);
        if (result.startsWith('Error')) {
          console.error(`Apps Script Delete Error for ${sheetName}:`, result);
        }
      } catch (error) {
        console.error(`Error deleting from ${sheetName} via Apps Script:`, error);
      }
    }
  },

  async getNextId(sheetName: keyof typeof STORAGE_KEYS, idColumn: string): Promise<number> {
    const data = await sheetService.getAll<any>(sheetName);
    if (data.length === 0) return 1;
    
    const ids = data.map(item => {
      const val = item[idColumn];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const numericPart = val.replace(/\D/g, '');
        return numericPart ? parseInt(numericPart, 10) : 0;
      }
      return 0;
    });
    
    const maxId = Math.max(...ids, 0);
    return maxId + 1;
  },

  isCloudConnected(): boolean {
    return isAppsScriptAvailable && !!APPS_SCRIPT_URL;
  },

  retryConnection() {
    isAppsScriptAvailable = true;
  },

  async proxyImage(url: string): Promise<string> {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (!isAppsScriptAvailable || !APPS_SCRIPT_URL) return '';
    try {
      console.log('Proxying image URL:', url);
      const proxyUrl = `${APPS_SCRIPT_URL}?action=proxyImage&url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const text = await response.text();
      if (text.startsWith('data:')) {
        console.log('Proxy success, data length:', text.length);
        return text;
      }
      console.error('Proxy Image Error Response:', text);
      return '';
    } catch (error) {
      console.error('Proxy Image Fetch Error:', error);
      return '';
    }
  },

  async uploadFile(file: File): Promise<string> {
    const getDataUrl = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    };

    if (!APPS_SCRIPT_URL || !isAppsScriptAvailable) {
      console.warn('Cloud storage not available, falling back to local Data URL');
      return getDataUrl(file);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
              action: 'uploadFile',
              filename: file.name,
              mimeType: file.type,
              data: base64,
            }),
          });
          const result = await response.text();
          console.log('Upload result:', result);
          if (result.startsWith('http')) {
            resolve(result);
          } else if (result.includes('Access denied: DriveApp')) {
            console.error('DriveApp access denied in Apps Script. Check APPS_SCRIPT.md for fix.');
            // Fallback for better DX
            const dataUrl = await getDataUrl(file);
            resolve(dataUrl);
          } else if (result.startsWith('Error')) {
            reject(new Error(result));
          } else {
            // If it's HTML, it's likely an Apps Script error page or auth prompt
            if (result.includes('<html')) {
              reject(new Error('Apps Script returned an HTML page. This usually means the script is not authorized or the URL is incorrect. Please open the Apps Script editor and run the script once to authorize it.'));
            } else {
              reject(new Error('Unexpected response: ' + result.substring(0, 100)));
            }
          }
        } catch (error) {
          console.error('Upload catch error:', error);
          // Fallback on network error
          getDataUrl(file).then(resolve).catch(() => reject(error));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl || !fileUrl.startsWith('http') || !APPS_SCRIPT_URL || !isAppsScriptAvailable) {
      return;
    }

    try {
      console.log('Requesting file deletion from drive:', fileUrl);
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'deleteFile',
          fileUrl,
        }),
      });
      const result = await response.text();
      console.log('File deletion result:', result);
    } catch (error) {
      console.error('Error in sheetService.deleteFile:', error);
    }
  }
};
