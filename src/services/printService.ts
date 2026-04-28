import { Application, Advertisement, Post, AdditionalInfo, AddressInfo, QualificationInfo, ExperienceInfo, GeneralUser } from '../types';
import { formatDate } from '../lib/utils';
import { TFunction } from 'i18next';
import { sheetService } from './sheetService';

export const printService = {
  generatePrintableApplication: async (
    appl: Application,
    applicantProfile: GeneralUser,
    ad: Advertisement | undefined,
    post: Post | undefined,
    profile: AdditionalInfo | null,
    address: AddressInfo | null,
    quals: QualificationInfo[],
    exps: ExperienceInfo[],
    t: TFunction,
    onProgress: (msg: string, progress: number) => void = () => {}
  ) => {
    const adTitle = ad?.Title || 'N/A';
    const postName = post?.Post_Name || 'N/A';

    onProgress('Processing images...', 30);
    const photoBase64 = applicantProfile?.Photo_URL ? await sheetService.proxyImage(applicantProfile.Photo_URL) : null;
    const signBase64 = applicantProfile?.Signature_URL ? await sheetService.proxyImage(applicantProfile.Signature_URL) : null;

    onProgress('Preparing print view...', 80);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Application_${appl.Appl_ID}</title>
        <style>
          @media print {
            .no-print { display: none; }
            body { padding: 0; margin: 0; }
          }
          body {
            font-family: 'Helvetica', Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            border: 1px solid #eee;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
          .header h2 { margin: 5px 0; font-size: 18px; color: #555; }
          .header p { margin: 5px 0; font-size: 14px; font-weight: bold; }
          
          .section { margin-bottom: 25px; }
          .section-title {
            background: #f4f4f4;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 16px;
            border-left: 4px solid #333;
            margin-bottom: 15px;
            text-transform: uppercase;
          }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .field { margin-bottom: 8px; font-size: 13px; }
          .label { font-weight: bold; color: #666; display: inline-block; width: 140px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          table th, table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          table th { background: #f9f9f9; }
          
          .photo-sign-container {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
          }
          .photo-box, .sign-box {
            text-align: center;
            width: 150px;
          }
          .photo-img {
            width: 120px;
            height: 150px;
            border: 1px solid #ccc;
            object-fit: cover;
            margin-bottom: 5px;
          }
          .sign-img {
            width: 150px;
            height: 60px;
            border: 1px solid #ccc;
            object-fit: contain;
            margin-bottom: 5px;
          }
          
          .declaration {
            margin-top: 30px;
            font-size: 12px;
            font-style: italic;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
          
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .print-btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">${t('common.print_now', 'Print Now')}</button>
        
        <div class="header">
          <h1>${t('nav.system_name')}</h1>
          <h2>${adTitle}</h2>
          <p>${t('office.table.post')}: ${postName}</p>
          <div style="margin-top: 10px; font-size: 12px; color: #777;">
            ${t('dashboard.appl_id')}: ${appl.Appl_ID} | ${t('common.date')}: ${formatDate(appl.Apply_Date)}
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('office.review_modal.personal_details')}</div>
          <div style="display: flex; justify-content: space-between;">
            <div class="grid" style="flex: 1;">
              <div class="field"><span class="label">${t('signup.candidate_name')}:</span> ${applicantProfile?.Candidate_Name || 'N/A'}</div>
              <div class="field"><span class="label">${t('signup.father_name')}:</span> ${applicantProfile?.Father_Name || 'N/A'}</div>
              <div class="field"><span class="label">${t('signup.mother_name')}:</span> ${applicantProfile?.Mother_Name || 'N/A'}</div>
              <div class="field"><span class="label">${t('profile.form.dob')}:</span> ${formatDate(applicantProfile?.DOB)}</div>
              <div class="field"><span class="label">${t('profile.form.gender')}:</span> ${applicantProfile?.Gender || 'N/A'}</div>
              <div class="field"><span class="label">${t('profile.form.category')}:</span> ${profile?.Caste_Category || 'N/A'}</div>
              <div class="field"><span class="label">${t('profile.form.mobile')}:</span> ${applicantProfile?.Mobile || 'N/A'}</div>
              <div class="field"><span class="label">${t('profile.form.email')}:</span> ${applicantProfile?.Email_ID || 'N/A'}</div>
            </div>
            <div class="photo-box">
              ${photoBase64 ? `<img src="${photoBase64}" class="photo-img" />` : `<div class="photo-img" style="display: flex; align-items: center; justify-content: center;">${t('office.review_modal.photo')}</div>`}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('office.review_modal.addr_details')}</div>
          <div class="grid">
            <div class="field">
              <span class="label">${t('address.current')}:</span><br/>
              ${address?.Curr_Address || 'N/A'}, ${address?.Curr_District || ''}, ${address?.Curr_State || ''} - ${address?.Curr_Pincode || ''}
            </div>
            <div class="field">
              <span class="label">${t('address.permanent')}:</span><br/>
              ${address?.Perm_Address || 'N/A'}, ${address?.Perm_District || ''}, ${address?.Perm_State || ''} - ${address?.Perm_Pincode || ''}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${t('office.review_modal.edu_details')}</div>
          <table>
            <thead>
              <tr>
                <th>${t('qual.table.exam')}</th>
                <th>${t('qual.table.board')}</th>
                <th>${t('qual.table.year')}</th>
                <th>${t('qual.table.subject')}</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${quals.length > 0 ? quals.map(q => `
                <tr>
                  <td>${q.Course_Name}</td>
                  <td>${q.Board_Name}</td>
                  <td>${q.Pass_Year}</td>
                  <td>${q.Qualification_Type}</td>
                  <td>${q.Percentage}%</td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="text-align:center;">${t('common.no_data')}</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">${t('office.review_modal.exp_details')}</div>
          <table>
            <thead>
              <tr>
                <th>${t('exp.table.employer')}</th>
                <th>${t('exp.table.post')}</th>
                <th>${t('exp.table.start')}</th>
                <th>${t('exp.table.end')}</th>
              </tr>
            </thead>
            <tbody>
              ${exps.length > 0 ? exps.map(e => `
                <tr>
                  <td>${e.Employer_Name}</td>
                  <td>${e.Post_Held}</td>
                  <td>${formatDate(e.Start_Date)}</td>
                  <td>${e.Currently_Working === 'Yes' ? t('apply.present') : formatDate(e.End_Date)}</td>
                </tr>
              `).join('') : `<tr><td colspan="4" style="text-align:center;">${t('office.review_modal.no_exp')}</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="declaration">
          <p><strong>${t('apply.declaration_title')}:</strong></p>
          <p>${t('apply.declaration_text')}</p>
        </div>

        <div class="photo-sign-container">
          <div>
            <p style="font-size: 12px;">${t('common.date')}: ${formatDate(new Date().toISOString())}</p>
            <p style="font-size: 12px;">${t('common.place')}: __________________</p>
          </div>
          <div class="sign-box">
            ${signBase64 ? `<img src="${signBase64}" class="sign-img" />` : `<div class="sign-img" style="display: flex; align-items: center; justify-content: center;">${t('office.review_modal.sign')}</div>`}
            <p style="font-weight: bold; font-size: 12px;">${applicantProfile?.Candidate_Name || ''}</p>
          </div>
        </div>

        <script>
          // Auto-open print dialog
          window.onload = function() {
            setTimeout(function() {
              // window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      alert('Please allow popups for printing.');
    }
  }
};
