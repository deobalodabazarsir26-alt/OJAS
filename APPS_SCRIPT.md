# Global Database Script for OJAS

Deploy this script as a Web App in your Google Apps Script editor to power your application's backend.

### Setup Instructions:
1. **Create a Folder in Cloud Database** where you want to store uploaded files.
2. Open that folder and **copy its ID from the URL** (it's the long string of letters and numbers after `/folders/`).
3. Open your Cloud Database.
4. Go to **Extensions > Apps Script**.
5. Delete any existing code and paste the code below.
6. **CRITICAL:** Update `ROOT_FOLDER_ID` with the folder ID you copied in step 2.
7. **Run the `initDatabase` function once** (select it from the dropdown in the toolbar and click "Run").
   - This will ask for permissions. **You MUST allow access to both Spreadsheet and Drive.**
   - It will create all required sheets and a "Logs" sheet for debugging.

   **FIXING THE "UrlFetchApp" PERMISSION ERROR**:
   - If you get a "permission to call UrlFetchApp" error:
   - Click the **Gear Icon** (Project Settings) on the left.
   - Check **"Show 'appsscript.json' manifest file in editor"**.
   - Go back to the **Editor** (< > icon).
   - Click on the new **`appsscript.json`** file.
   - **Delete everything** and paste this exact code:
   ```json
   {
     "timeZone": "Asia/Kolkata",
     "dependencies": {},
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets",
       "https://www.googleapis.com/auth/drive",
       "https://www.googleapis.com/auth/script.external_request"
     ]
   }
   ```
   - Save (Ctrl+S) and try running `AUTHORIZE_DRIVE_ACCESS` again.

   **FIXING "Access denied: DriveApp" ERROR during upload**:
   - This error means the script was deployed without proper Drive permissions or has not been authorized.
   - Follow the `appsscript.json` steps above (Step 18-36) to manually set the `oauthScopes`.
   - Ensure `https://www.googleapis.com/auth/drive` is included.
   - **IMPORTANT:** After updating `appsscript.json`, you **MUST** re-deploy: 
     - Go to **Deploy > Manage Deployments**.
     - Click the **Pencil icon** (Edit) on your Active deployment.
     - Select **New Version** from the version dropdown.
     - Click **Deploy**.

8. Click **Deploy > New Deployment**.
9. Select **Web App**.
10. Set "Execute as" to **Me**.
11. Set "Who has access" to **Anyone**.
12. Click **Deploy** and copy the **Web App URL**.
13. Paste the URL into your app's `src/services/sheetService.ts` file.

```javascript
/**
 * CONFIGURATION
 */
const ROOT_FOLDER_ID = '1yRKbW_KIQ6L15giJc16lgEz7iImUaWf8'; // <--- CHANGE THIS!

/**
 * Helper to get the Spreadsheet instance
 */
function getSs() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Helper to log errors to a sheet
 */
function logToSheet(message, data) {
  try {
    const ss = getSs();
    let logSheet = ss.getSheetByName('Logs');
    if (!logSheet) {
      logSheet = ss.insertSheet('Logs');
      logSheet.appendRow(['Timestamp', 'Message', 'Data']);
    }
    logSheet.appendRow([new Date(), message, JSON.stringify(data)]);
  } catch (e) {
    console.error("Logging failed: " + e.toString());
  }
}

/**
 * AUTHORIZATION & INITIALIZATION
 * Run AUTHORIZE_DRIVE_ACCESS first to trigger the Google permission popup.
 * Then run initDatabase to setup your sheets.
 * 
 * Required Scopes (Google will auto-detect these, but listed here for clarity):
 * - https://www.googleapis.com/auth/spreadsheets
 * - https://www.googleapis.com/auth/drive
 * - https://www.googleapis.com/auth/script.external_request
 */
function AUTHORIZE_DRIVE_ACCESS() {
  try {
    // 1. Test Drive Access
    const testFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    
    // 2. Test External Request Access (UrlFetchApp)
    // This dummy call triggers the "permission to connect to an external service" prompt
    UrlFetchApp.fetch("https://www.google.com", { muteHttpExceptions: true });
    
    Logger.log('SUCCESS: All permissions granted for account: ' + Session.getActiveUser().getEmail());
    Logger.log('Target Folder Name: ' + testFolder.getName());
    return "Authorization Success: Drive and External Requests Verified";
  } catch (e) {
    Logger.log('FAILURE: ' + e.toString());
    throw new Error("Authorization Failed. Ensure you are logged into ONLY ONE Google account. Error: " + e.toString());
  }
}

/**
 * Run this to test if the script can actually write to your folder
 */
function DIAGNOSE_DRIVE() {
  try {
    const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const testFile = folder.createFile('Test_Connection.txt', 'Apps Script connection is working at ' + new Date());
    Logger.log('SUCCESS: Created test file: ' + testFile.getUrl());
    testFile.setTrashed(true); // Clean up
    return "Diagnosis Success: Script can write to Drive.";
  } catch (e) {
    Logger.log('DIAGNOSIS FAILURE: ' + e.toString());
    return "Diagnosis Failed: " + e.toString();
  }
}

function getDatabaseSchema() {
  return {
    'User': ['User_ID', 'User_Name', 'Password', 'User_Type', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Department': ['Dept_ID', 'Dept_Name', 'Dept_Type', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Office': ['Office_ID', 'Office_Name', 'Address', 'State', 'District', 'Pincode', 'Dept_ID', 'T_STMP_ADD', 'T_STMP_UPD'],
    'General_User': ['User_ID', 'Candidate_Name', 'Candidate_Name_HI', 'Gender', 'DOB', 'DOB_Certificate_Type', 'DOB_Doc', 'Father_Name', 'Father_Name_HI', 'Mother_Name', 'Mother_Name_HI', 'Photo_URL', 'Signature_URL', 'ID_Proof', 'ID_Number', 'ID_Doc', 'Email_ID', 'Mobile', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Office_User': ['Dept_ID', 'Office_ID', 'User_ID', 'Officer_Name', 'Designation', 'Email_ID', 'Mobile', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Advertisement': ['Adv_ID', 'Dept_ID', 'Office_ID', 'Letter_No', 'Title', 'Instructions', 'Terms_Conditions', 'Adv_Doc', 'Start_Date', 'End_Date', 'Clm_Strt_Dt', 'Clm_End_Dt', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Post': ['Post_ID', 'Post_Name', 'Post_Type', 'Service_Type', 'Class', 'Payscale', 'Qualification', 'Experience', 'Adv_ID', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Application': ['Appl_ID', 'Adv_ID', 'Post_ID', 'User_ID', 'Apply_Date', 'Status', 'Remark', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Additional_Info': ['Appl_ID', 'User_ID', 'Candidate_Name', 'Is_CG', 'Domicile_State', 'Domicile_District', 'Locality', 'Domicile_Certificate_URL', 'Caste_Category', 'Caste_State', 'Caste_District', 'Caste_Certificate_URL', 'Is_PWD', 'PwD_State', 'PwD_District', 'PwD_Percentage', 'PwD_Certificate_URL', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Address_Info': ['Appl_ID', 'User_ID', 'Candidate_Name', 'Perm_Address', 'Perm_Landmark', 'Perm_State', 'Perm_District', 'Perm_Pincode', 'Is_Same', 'Curr_Address', 'Curr_Landmark', 'Curr_State', 'Curr_District', 'Curr_Pincode', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Qualification_Info': ['Appl_ID', 'User_ID', 'Candidate_Name', 'Qualification_Type', 'Course_Name', 'Board_Name', 'Institute_Name', 'Pass_Year', 'Result_Status', 'Marks_Type', 'Max_Marks', 'Marks_Obtained', 'Percentage', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Experience_Info': ['Appl_ID', 'User_ID', 'Candidate_Name', 'Currently_Working', 'Employer_Type', 'Employment_Type', 'Employer_Name', 'Employer_Address', 'Post_Held', 'Start_Date', 'End_Date', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Claim': ['Claim_ID', 'Appl_ID', 'User_ID', 'Description', 'Proof_Doc_URL', 'Status', 'Officer_Remark', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Global_Constants': ['Constant_ID', 'Category', 'Value', 'T_STMP_ADD', 'T_STMP_UPD'],
    'Logs': ['Timestamp', 'Message', 'Data']
  };
}

function initDatabase() {
  const ss = getSs();
  
  // Test Drive Access
  try {
    AUTHORIZE_DRIVE_ACCESS();
  } catch (e) {
    throw new Error('Drive access failed. Please run AUTHORIZE_DRIVE_ACCESS function first. Error: ' + e.toString());
  }

  const sheets = getDatabaseSchema();

  for (const name in sheets) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold').setBackground('#f3f3f3');
    } else {
      // Ensure headers are correct even if sheet exists
      const headers = sheets[name];
      const range = sheet.getRange(1, 1, 1, headers.length);
      range.setValues([headers]);
      range.setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
  Logger.log('Database initialized successfully.');
}

/**
 * Run this if you have missing columns in your sheets.
 * It will force the headers to match the application's required format.
 */
function FORCE_REPAIR_HEADERS() {
  initDatabase();
  return "Headers repaired. Please check your sheets.";
}

/**
 * DANGER: This will delete all data in the specified sheet and recreate it with correct headers.
 * Use this only if a sheet is completely corrupted or missing columns that repair can't fix.
 */
function RECREATE_SHEET(sheetName) {
  const ss = getSs();
  const sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  initDatabase();
  return "Sheet '" + sheetName + "' has been recreated.";
}

/**
 * GET Request Handler
 */
function doGet(e) {
  // Log incoming request for debugging
  try {
    logToSheet("GET Request", { 
      parameter: e.parameter, 
      queryString: e.queryString,
      contextPath: e.contextPath
    });
  } catch (logErr) {}

  try {
    const params = e.parameter || {};
    const action = params.action ? String(params.action).trim() : '';
    
    // Image Proxy to bypass CORS
    if (action === 'proxyImage') {
      const url = params.url;
      if (!url) return ContentService.createTextOutput("Error: Missing URL");
      
      try {
        let blob;
        let contentType;
        
        // Check if it's a Cloud Database URL
        let fileId = null;
        const driveMatch = url.match(/[-\w]{25,}/);
        if (driveMatch) {
          // Ensure it's not just a random string by checking context
          if (url.indexOf('drive.google.com') !== -1 || url.indexOf('docs.google.com') !== -1 || url.indexOf('id=') !== -1) {
            fileId = driveMatch[0];
          }
        }
        
        if (fileId) {
          try {
            logToSheet("Proxy Attempt (Drive)", { fileId: fileId });
            const file = DriveApp.getFileById(fileId);
            blob = file.getBlob();
            contentType = blob.getContentType();
            logToSheet("Proxy Success (Drive)", { fileId: fileId, contentType: contentType });
          } catch (driveErr) {
            logToSheet("Proxy Drive Error", { fileId: fileId, error: driveErr.toString() });
          }
        }
        
        // Fallback to UrlFetchApp if not a Drive file or Drive fetch failed
        if (!blob) {
          const response = UrlFetchApp.fetch(url, {
            muteHttpExceptions: true,
            followRedirects: true
          });
          
          if (response.getResponseCode() !== 200) {
            return ContentService.createTextOutput("Error: Fetch failed with code " + response.getResponseCode());
          }
          
          blob = response.getBlob();
          contentType = blob.getContentType();
        }
        
        const base64 = Utilities.base64Encode(blob.getBytes());
        return ContentService.createTextOutput("data:" + contentType + ";base64," + base64);
      } catch (err) {
        logToSheet("Proxy Error", err.toString());
        return ContentService.createTextOutput("Error: " + err.toString());
      }
    }

    const sheetName = params.sheetName;
    if (!sheetName) {
      return createJsonResponse({ 
        status: 'error', 
        message: 'Missing sheetName',
        receivedParams: params
      });
    }

    const ss = getSs();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createJsonResponse([]);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJsonResponse([]);

    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = row[i]; });
      return obj;
    });

    return createJsonResponse(rows);
  } catch (error) {
    logToSheet("GET Error", error.toString());
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * POST Request Handler
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    // 0. HANDLE FILE UPLOAD (No sheet required)
    if (action === 'uploadFile') {
      try {
        const folderId = String(ROOT_FOLDER_ID || "").trim();
        let folder;
        try {
          folder = (folderId && folderId.length > 5) ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
        } catch (e) {
          folder = DriveApp.getRootFolder();
        }
        
        const contentType = requestData.mimeType;
        const decodedData = Utilities.base64Decode(requestData.data);
        const blob = Utilities.newBlob(decodedData, contentType, requestData.filename);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return ContentService.createTextOutput(file.getUrl()).setMimeType(ContentService.MimeType.TEXT);
      } catch (err) {
        return ContentService.createTextOutput("Error: Upload failed. " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
      }
    }

    // 0.1 HANDLE FILE DELETION (No sheet required)
    if (action === 'deleteFile') {
      try {
        const fileUrl = requestData.fileUrl;
        if (!fileUrl) return ContentService.createTextOutput("Error: Missing fileUrl").setMimeType(ContentService.MimeType.TEXT);
        deleteFileByUrl(fileUrl);
        return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
      } catch (err) {
        return ContentService.createTextOutput("Error: Delete failed. " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
      }
    }

    const sheetName = requestData.sheetName;
    let payload = requestData.payload;

    const ss = getSs();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return ContentService.createTextOutput("Error: Sheet not found").setMimeType(ContentService.MimeType.TEXT);

    // 1. HANDLE INSERT
    if (action === 'insert') {
      try {
        logToSheet("Insert Started", { sheet: sheetName });
        payload = handleFileUploads(payload, sheetName);
      } catch (uploadError) {
        logToSheet("Insert Aborted - Upload Failed", uploadError.message);
        return ContentService.createTextOutput("Error: File upload failed. " + uploadError.message).setMimeType(ContentService.MimeType.TEXT);
      }
      
      // Use predefined headers if available, otherwise fallback to sheet headers
      const schema = getDatabaseSchema();
      const predefinedHeaders = schema[sheetName];
      const sheetHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(h => String(h).trim());
      const headers = predefinedHeaders || sheetHeaders;
      
      const newRow = headers.map(header => {
        const val = payload[header];
        return (val === undefined || val === null) ? "" : val;
      });
      
      logToSheet("Appending Row to " + sheetName, { 
        headers: headers, 
        payloadKeys: Object.keys(payload),
        rowCount: newRow.length 
      });
      sheet.appendRow(newRow);
      return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    }

    // 1.5 HANDLE BULK INSERT
    if (action === 'bulkInsert') {
      const clearFirst = requestData.clearFirst === true;
      const payloads = requestData.payloads; // Array of objects
      
      if (!Array.isArray(payloads)) return ContentService.createTextOutput("Error: payloads must be an array").setMimeType(ContentService.MimeType.TEXT);
      
      const schema = getDatabaseSchema();
      const predefinedHeaders = schema[sheetName];
      const sheetHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(h => String(h).trim());
      const headers = predefinedHeaders || sheetHeaders;
      
      if (clearFirst) {
        if (sheet.getLastRow() > 1) {
          sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
        }
      }
      
      const rows = payloads.map(p => {
        return headers.map(header => {
          const val = p[header];
          return (val === undefined || val === null) ? "" : val;
        });
      });
      
      if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
      }
      
      return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    }

    // 2. HANDLE UPDATE
    if (action === 'update') {
      payload = handleFileUploads(payload, sheetName);
      const idColumn = requestData.idColumn;
      const idValue = requestData.idValue;
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf(idColumn);

      if (idIndex === -1) return ContentService.createTextOutput("Error: ID Column not found").setMimeType(ContentService.MimeType.TEXT);

      let updated = false;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]).trim() === String(idValue).trim()) {
          for (const key in payload) {
            const colIndex = headers.indexOf(key);
            if (colIndex !== -1) {
              sheet.getRange(i + 1, colIndex + 1).setValue(payload[key]);
            }
          }
          updated = true;
          break;
        }
      }
      return ContentService.createTextOutput(updated ? "Updated" : "Error: Record not found").setMimeType(ContentService.MimeType.TEXT);
    }

    // 3. HANDLE DELETE
    if (action === 'delete') {
      const idColumn = requestData.idColumn;
      const idValue = requestData.idValue;

      // SPECIAL CASE: Cascading delete for User
      if (sheetName === 'User' && idColumn === 'User_ID') {
        return handleCascadingUserDelete(idValue);
      }

      // SPECIAL CASE: Cascading delete for Advertisement
      if (sheetName === 'Advertisement' && idColumn === 'Adv_ID') {
        return handleCascadingAdvertisementDelete(idValue);
      }

      let deleted = false;
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf(idColumn);

      if (idIndex === -1) return ContentService.createTextOutput("Error: ID Column not found").setMimeType(ContentService.MimeType.TEXT);

      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][idIndex]).trim() === String(idValue).trim()) {
          sheet.deleteRow(i + 1);
          deleted = true;
        }
      }
      return ContentService.createTextOutput(deleted ? "Deleted" : "Error: Record not found").setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService.createTextOutput("Error: Invalid Action").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    logToSheet("POST Error", error.toString());
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Helper to create JSON response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper to handle Base64 file uploads to Cloud Database
 */
function handleFileUploads(payload, sheetName) {
  try {
    const folderId = String(ROOT_FOLDER_ID || "").trim();
    
    if (!folderId || folderId === 'REPLACE_WITH_YOUR_DRIVE_FOLDER_ID' || folderId.length < 5) {
      logToSheet("Upload Warning", "ROOT_FOLDER_ID not set or invalid. Skipping file conversion. Current ID: '" + folderId + "'");
      return payload;
    }

    let rootFolder;
    try {
      rootFolder = DriveApp.getFolderById(folderId);
      
      // Check if we actually have edit access using the account running the script
      const me = Session.getEffectiveUser();
      const access = rootFolder.getAccess(me);
      
      logToSheet("Checking Folder Access", { 
        folderId: folderId, 
        folderName: rootFolder.getName(),
        account: me.getEmail(),
        access: access.toString()
      });

      if (access === DriveApp.Permission.VIEW || access === DriveApp.Permission.NONE) {
        logToSheet("Access Warning", "The script account (" + me.getEmail() + ") only has VIEW access to folder " + folderId + ". Falling back to My Drive root.");
        rootFolder = DriveApp.getRootFolder();
      }
    } catch (err) {
      logToSheet("Drive Access Error", "Could not access folder ID: " + folderId + ". Falling back to My Drive root. Error: " + err.toString());
      rootFolder = DriveApp.getRootFolder();
    }
    
    // Create or find subfolder for the user
    // Prefer User_ID for consistent naming to allow cascading delete
    const subfolderName = payload.User_ID ? "User_" + payload.User_ID : (payload._userName || "General_Uploads");
    let folder;
    try {
      const folders = rootFolder.getFoldersByName(subfolderName);
      folder = folders.hasNext() ? folders.next() : rootFolder.createFolder(subfolderName);
    } catch (err) {
      logToSheet("Folder Creation Error", "Could not create/find subfolder: " + subfolderName + ". Error: " + err.toString());
      folder = rootFolder; // Fallback to root
    }
    
    // Clean up temporary field
    delete payload._userName;
    
    const keys = Object.keys(payload);
    logToSheet("Processing Payload Keys", { count: keys.length, keys: keys });
    
    for (const key in payload) {
      const value = payload[key];
      const isString = typeof value === 'string';
      const length = isString ? value.length : 0;
      
      // Log every key for debugging (but not the full value if it's huge)
      logToSheet("Checking Key", { 
        key: key, 
        type: typeof value, 
        length: length,
        isBase64: isString && value.indexOf('data:') === 0 && value.indexOf(';base64,') !== -1
      });
      
      // Check for Base64 data (starts with data: and contains ;base64,)
      if (isString && value.indexOf('data:') === 0 && value.indexOf(';base64,') !== -1) {
        logToSheet("Attempting Upload", { key: key, mimePart: value.substring(0, 50) + "..." });
        try {
          const parts = value.split(',');
          const mimePart = parts[0]; // e.g. "data:image/jpeg;base64"
          const base64Data = parts[1];
          
          // Extract mime type
          const mimeMatch = mimePart.match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
          
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType);
          
          let extension = mimeType.split('/')[1] || "bin";
          extension = extension.split('+')[0]; // handle things like image/svg+xml
          if (extension === 'jpeg') extension = 'jpg';
          
          const fileName = key + "_" + new Date().getTime() + "." + extension;
          blob.setName(fileName);
          
          const file = folder.createFile(blob);
          
          // Try to set sharing, but don't fail if the account/org restricts it
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (shareErr) {
            logToSheet("Sharing Warning", "Could not set public sharing for " + key + ". The file is still saved. Error: " + shareErr.toString());
          }
          
          const fileUrl = file.getUrl();
          payload[key] = fileUrl; // Replace Base64 with the Drive URL
          
          logToSheet("File Uploaded Successfully", { key: key, url: fileUrl, folder: folder.getName() });
          
          // Small delay to prevent rate limiting
          Utilities.sleep(300);
        } catch (fileErr) {
          logToSheet("Individual File Error", { key: key, error: fileErr.toString() });
          throw new Error("Could not save " + key + " to Drive. " + fileErr.toString());
        }
      }
    }
  } catch (e) {
    logToSheet("Global Upload Error", e.toString());
    throw e; // Rethrow to abort insert
  }
  return payload;
}

/**
 * Cascading delete for a User and all related records
 */
function handleCascadingUserDelete(userId) {
  const ss = getSs();
  const userIdStr = String(userId).trim();
  const activeUser = Session.getActiveUser().getEmail();
  
  logToSheet("Cascading Delete Started", { 
    userId: userIdStr, 
    activeUser: activeUser,
    rootFolderId: ROOT_FOLDER_ID 
  });

  // 1. Delete from User
  deleteRowsByColumn(ss.getSheetByName('User'), 'User_ID', userIdStr);
  
  // 2. Delete from General_User
  deleteRowsByColumn(ss.getSheetByName('General_User'), 'User_ID', userIdStr);
  
  // 3. Delete from Office_User
  deleteRowsByColumn(ss.getSheetByName('Office_User'), 'User_ID', userIdStr);
  
  // 4. Find and delete Applications and their sub-info
  const appSheet = ss.getSheetByName('Application');
  if (appSheet) {
    const appData = appSheet.getDataRange().getValues();
    const appHeaders = appData[0];
    const appUserIdIndex = appHeaders.indexOf('User_ID');
    const applIdIndex = appHeaders.indexOf('Appl_ID');
    
    if (appUserIdIndex !== -1 && applIdIndex !== -1) {
      const applIdsToDelete = [];
      for (let i = 1; i < appData.length; i++) {
        if (String(appData[i][appUserIdIndex]).trim() === userIdStr) {
          applIdsToDelete.push(String(appData[i][applIdIndex]).trim());
        }
      }
      
      // Delete sub-info for each application
      const subInfoSheets = ['Additional_Info', 'Address_Info', 'Qualification_Info', 'Experience_Info'];
      applIdsToDelete.forEach(applId => {
        subInfoSheets.forEach(sheetName => {
          deleteRowsByColumn(ss.getSheetByName(sheetName), 'Appl_ID', applId);
        });
      });
      
      // Delete the applications themselves
      deleteRowsByColumn(appSheet, 'User_ID', userIdStr);
    }
  }
  
  // 5. Delete Cloud Database Folder
  try {
    const folderNames = ["User_" + userIdStr, userIdStr];
    logToSheet("Searching for Drive Folders to Delete", { folderNames: folderNames });
    
    let foldersFound = 0;
    
    folderNames.forEach(folderName => {
      // First try searching in the specific root folder if valid
      if (ROOT_FOLDER_ID && ROOT_FOLDER_ID !== 'REPLACE_WITH_YOUR_DRIVE_FOLDER_ID' && ROOT_FOLDER_ID.length > 5) {
        try {
          const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
          const folders = rootFolder.getFoldersByName(folderName);
          while (folders.hasNext()) {
            const folder = folders.next();
            folder.setTrashed(true);
            foldersFound++;
            logToSheet("Drive Folder Deleted (from Root Folder)", { folderName: folderName, id: folder.getId() });
          }
        } catch (e) {
          logToSheet("Root Folder Search Failed for " + folderName, e.toString());
        }
      }
      
      // Also search the entire Drive to be sure (handles cases where folder was created in root)
      try {
        const folders = DriveApp.getFoldersByName(folderName);
        while (folders.hasNext()) {
          const folder = folders.next();
          // Avoid deleting the root folder itself if it somehow matched the name
          if (folder.getId() !== ROOT_FOLDER_ID) {
            folder.setTrashed(true);
            foldersFound++;
            logToSheet("Drive Folder Deleted (from Global Search)", { folderName: folderName, id: folder.getId() });
          }
        }
      } catch (e) {
        logToSheet("Global Search Failed for " + folderName, e.toString());
      }
    });
    
    if (foldersFound === 0) {
      logToSheet("No Drive Folders Found to Delete", { userId: userIdStr });
    }
  } catch (driveErr) {
    logToSheet("Drive Deletion Error", driveErr.toString());
  }

  return ContentService.createTextOutput("Cascading Delete Successful").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Cascading delete for an Advertisement and all related records
 */
function handleCascadingAdvertisementDelete(advId) {
  const ss = getSs();
  const advIdStr = String(advId).trim();
  
  logToSheet("Cascading Advertisement Delete Started", { advId: advIdStr });

  // 1. Delete associated Posts
  deleteRowsByColumn(ss.getSheetByName('Post'), 'Adv_ID', advIdStr);

  // 2. Find and delete Applications and their sub-info
  const appSheet = ss.getSheetByName('Application');
  if (appSheet) {
    const appData = appSheet.getDataRange().getValues();
    const appHeaders = appData[0];
    const appAdvIdIndex = appHeaders.indexOf('Adv_ID');
    const applIdIndex = appHeaders.indexOf('Appl_ID');
    
    if (appAdvIdIndex !== -1 && applIdIndex !== -1) {
      const applIdsToDelete = [];
      const fileUrlsToDelete = [];
      
      // Collect Appl_IDs and File URLs
      for (let i = 1; i < appData.length; i++) {
        if (String(appData[i][appAdvIdIndex]).trim() === advIdStr) {
          const applId = String(appData[i][applIdIndex]).trim();
          applIdsToDelete.push(applId);
          
          // Collect all potential file URLs from application row
          appHeaders.forEach((header, colIdx) => {
            const val = appData[i][colIdx];
            if (typeof val === 'string' && val.includes('drive.google.com')) {
              fileUrlsToDelete.push(val);
            }
          });
        }
      }
      
      // Delete sub-info for each application
      const subInfoSheets = ['Additional_Info', 'Address_Info', 'Qualification_Info', 'Experience_Info'];
      applIdsToDelete.forEach(applId => {
        subInfoSheets.forEach(sheetName => {
          const subSheet = ss.getSheetByName(sheetName);
          if (subSheet) {
            // Also collect file URLs from sub-info sheets before deleting
            const subData = subSheet.getDataRange().getValues();
            const subHeaders = subData[0];
            const subApplIdIndex = subHeaders.indexOf('Appl_ID');
            if (subApplIdIndex !== -1) {
              for (let j = 1; j < subData.length; j++) {
                if (String(subData[j][subApplIdIndex]).trim() === applId) {
                  subHeaders.forEach((h, cIdx) => {
                    const v = subData[j][cIdx];
                    if (typeof v === 'string' && v.includes('drive.google.com')) {
                      fileUrlsToDelete.push(v);
                    }
                  });
                }
              }
            }
            deleteRowsByColumn(subSheet, 'Appl_ID', applId);
          }
        });
      });
      
      // Delete the applications themselves
      deleteRowsByColumn(appSheet, 'Adv_ID', advIdStr);
      
      // Delete collected files from Drive
      fileUrlsToDelete.forEach(url => deleteFileByUrl(url));
    }
  }

  // 3. Delete the Advertisement itself and its document
  const adSheet = ss.getSheetByName('Advertisement');
  if (adSheet) {
    const adData = adSheet.getDataRange().getValues();
    const adHeaders = adData[0];
    const adIdIndex = adHeaders.indexOf('Adv_ID');
    const adDocIndex = adHeaders.indexOf('Adv_Doc');
    
    if (adIdIndex !== -1) {
      for (let i = 1; i < adData.length; i++) {
        if (String(adData[i][adIdIndex]).trim() === advIdStr) {
          if (adDocIndex !== -1) {
            deleteFileByUrl(adData[i][adDocIndex]);
          }
          adSheet.deleteRow(i + 1);
          break;
        }
      }
    }
  }
  
  return ContentService.createTextOutput("Cascading Advertisement Delete Successful").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Helper to delete a file from Drive by its URL
 */
function deleteFileByUrl(url) {
  if (!url || typeof url !== 'string' || !url.includes('drive.google.com')) return;
  
  let fileId = '';
  // Robust ID extraction using regex for various Drive URL formats
  const idMatch = url.match(/[-\w]{25,}/);
  if (idMatch) {
    fileId = idMatch[0];
  }
  
  if (fileId) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
      logToSheet("File Trashed", { url: url, id: fileId, name: file.getName() });
    } catch (e) {
      logToSheet("File Trashing Failed", { url: url, error: e.toString() });
    }
  }
}

/**
 * Helper to delete all rows matching a column value
 */
function deleteRowsByColumn(sheet, columnName, value) {
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.indexOf(columnName);
  if (colIndex === -1) return;
  
  const valueStr = String(value).trim();
  
  // Iterate backwards to safely delete rows
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex]).trim() === valueStr) {
      sheet.deleteRow(i + 1);
    }
  }
}
```
```
