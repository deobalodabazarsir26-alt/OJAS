import { Application, Advertisement, Post, AdditionalInfo, AddressInfo, QualificationInfo, ExperienceInfo, GeneralUser } from '../types';
import { formatDate } from '../lib/utils';
import { sheetService } from './sheetService';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const pdfService = {
  generateApplicationPDF: async (
    appl: Application,
    applicantProfile: GeneralUser,
    additionalInfo: AdditionalInfo | null,
    addressInfo: AddressInfo | null,
    quals: QualificationInfo[],
    exps: ExperienceInfo[],
    adTitle: string,
    postName: string,
    t: any,
    options: { includeCertificates?: boolean; onProgress?: (msg: string, progress: number) => void } = {}
  ) => {
    const { includeCertificates = false, onProgress = () => {} } = options;

    onProgress('Processing images...', 20);
    const photoBase64 = applicantProfile?.Photo_URL ? await sheetService.proxyImage(applicantProfile.Photo_URL) : null;
    const signBase64 = applicantProfile?.Signature_URL ? await sheetService.proxyImage(applicantProfile.Signature_URL) : null;

    let certificateImages: { label: string; base64: string }[] = [];
    if (includeCertificates) {
      onProgress('Processing certificates...', 40);
      const certificates = [
        { label: t('signup.id_proof'), url: applicantProfile?.ID_Doc },
        { label: t('signup.dob_proof'), url: applicantProfile?.DOB_Doc },
        { label: t('profile.form.domicile_cert'), url: additionalInfo?.Domicile_Certificate_URL },
        { label: t('profile.form.caste_cert'), url: additionalInfo?.Caste_Certificate_URL },
        { label: t('profile.form.pwd_cert'), url: additionalInfo?.PwD_Certificate_URL },
      ].filter(c => c.url);

      for (const cert of certificates) {
        if (cert.url) {
          try {
            const base64 = await sheetService.proxyImage(cert.url);
            if (base64 && base64.startsWith('data:image/')) {
              certificateImages.push({ label: cert.label, base64 });
            }
          } catch (e) {
            console.error(`Error loading certificate ${cert.label}:`, e);
          }
        }
      }
    }

    onProgress('Preparing document...', 70);
    
    // Ensure Noto Sans Devanagari is loaded
    try {
      await document.fonts.load('12px "Noto Sans Devanagari"');
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading failed, continuing with fallback:', e);
    }

    const container = document.createElement('div');
    container.id = 'pdf-generation-container';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '10000px'; 
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.zIndex = '-999999';
    container.style.pointerEvents = 'none';
    container.style.display = 'block';
    
    const htmlContent = `
      <style>
        .pdf-content-wrapper {
          font-family: 'Noto Sans Devanagari', 'Poppins', 'Inter', 'Helvetica', Arial, sans-serif;
          line-height: 1.5;
          color: #333;
          background-color: #ffffff;
          width: 720px;
          margin: 0;
          padding: 0;
        }
        .pdf-page {
          margin: 0;
          padding: 2.5rem;
          background-color: #ffffff !important;
          position: relative;
          width: 100%;
        }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        img { display: block; max-width: 100%; height: auto; page-break-inside: avoid; }
        .header {
          text-align: center;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; color: #1e3a8a; font-weight: 700; }
        .header h2 { margin: 5px 0; font-size: 16px; color: #4b5563; font-weight: 600; }
        .header p { margin: 5px 0; font-size: 13px; font-weight: bold; }
        
        .section { margin-bottom: 20px; clear: both; page-break-inside: avoid; }
        .section-title {
          background: #f1f5f9;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 15px;
          border-left: 5px solid #1e3a8a;
          margin-bottom: 12px;
          text-transform: uppercase;
          color: #0f172a;
        }
        
        .field { margin-bottom: 8px; font-size: 13px; clear: both; }
        .label { font-weight: bold; color: #475569; display: inline-block; width: 150px; float: left; }
        .value { display: block; margin-left: 160px; word-break: break-word; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; clear: both; page-break-inside: auto; }
        table tr { page-break-inside: avoid; page-break-after: auto; }
        table th, table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        table th { background: #f8fafc; font-weight: bold; color: #0f172a; }
        
        .footer-section {
          page-break-inside: avoid;
        }
        .photo-sign-container {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          gap: 20px;
        }
        .photo-box, .sign-box {
          text-align: center;
          width: 140px;
          page-break-inside: avoid;
        }
        .photo-img {
          width: 120px;
          height: 150px;
          border: 1px solid #94a3b8;
          object-fit: cover;
          margin-bottom: 5px;
          background: #f8fafc;
        }
        .sign-img {
          width: 140px;
          height: 45px;
          border: 1px solid #94a3b8;
          object-fit: contain;
          margin-bottom: 5px;
          background: #f8fafc;
        }
        
        .declaration {
          margin-top: 25px;
          font-size: 12px;
          font-style: italic;
          border: 1px solid #e2e8f0;
          padding: 12px;
          background: #f8fafc;
          border-radius: 4px;
          color: #334155;
          page-break-inside: avoid;
        }

        .cert-page {
          page-break-before: always;
          margin: 0;
          padding: 2rem;
          text-align: center;
          background: white;
        }
        .cert-img {
          max-width: 100%;
          max-height: 900px;
          border: 1px dashed #94a3b8;
          margin-top: 20px;
          object-fit: contain;
          background: #f8fafc;
        }
      </style>
      <div class="pdf-content-wrapper">
        <div class="pdf-page">
          <div class="header">
            <h1>${t('nav.system_name')}</h1>
            <h2>${adTitle}</h2>
            <p>${t('office.table.post')}: ${postName}</p>
            <div style="margin-top: 10px; font-size: 12px; color: #475569; font-weight: 500;">
              ${t('dashboard.appl_id')}: ${appl.Appl_ID} | ${t('common.date')}: ${formatDate(appl.Apply_Date)}
            </div>
          </div>

          <div class="section">
            <div class="section-title">${t('office.review_modal.personal_details')}</div>
            <div style="display: flex; gap: 20px;">
              <div style="flex: 1;">
                <div class="field"><span class="label">${t('signup.candidate_name')}:</span> <span class="value">${applicantProfile?.Candidate_Name || t('manage.na')}</span></div>
                <div class="field"><span class="label">${t('signup.father_name')}:</span> <span class="value">${applicantProfile?.Father_Name || t('manage.na')}</span></div>
                <div class="field"><span class="label">${t('signup.mother_name')}:</span> <span class="value">${applicantProfile?.Mother_Name || t('manage.na')}</span></div>
                <div class="field"><span class="label">${t('profile.form.dob')}:</span> <span class="value">${formatDate(applicantProfile?.DOB)}</span></div>
                <div class="field"><span class="label">${t('profile.form.gender')}:</span> <span class="value">${applicantProfile?.Gender || t('manage.na')}</span></div>
                <div class="field"><span class="label">${t('profile.form.category')}:</span> <span class="value">${additionalInfo?.Caste_Category || t('manage.na')}</span></div>
                <div class="field">
                  <span class="label">${t('apply.domicile_cg')}:</span> 
                  <span class="value">
                    ${additionalInfo?.Is_CG === 'Yes' ? t('constants.Yes') : t('constants.No')} 
                    (${additionalInfo?.Is_CG === 'Yes' ? additionalInfo?.Domicile_District : additionalInfo?.Domicile_State || t('manage.na')})
                  </span>
                </div>
                <div class="field">
                  <span class="label">${t('apply.is_pwd')}:</span> 
                  <span class="value">
                    ${additionalInfo?.Is_PWD === 'Yes' ? t('constants.Yes') : t('constants.No')} 
                    ${additionalInfo?.Is_PWD === 'Yes' ? `(${additionalInfo?.PwD_Percentage || '0'}%)` : ''}
                  </span>
                </div>
                <div class="field"><span class="label">${t('profile.form.mobile')}:</span> <span class="value">${applicantProfile?.Mobile || t('manage.na')}</span></div>
                <div class="field"><span class="label">${t('profile.form.email')}:</span> <span class="value">${applicantProfile?.Email_ID || t('manage.na')}</span></div>
              </div>
              <div class="photo-box">
                ${photoBase64 ? `<img src="${photoBase64}" class="photo-img" />` : `<div class="photo-img" style="display: flex; align-items: center; justify-content: center; font-size: 12px; color: #94a3b8;">${t('office.review_modal.photo')}</div>`}
              </div>
            </div>
          </div>
 
          <div class="section">
            <div class="section-title">${t('office.review_modal.addr_details')}</div>
            <div style="display: flex; gap: 20px;">
              <div class="field" style="flex: 1;">
                <span class="label">${t('address.current')}:</span>
                <div class="value">
                  ${addressInfo?.Curr_Address || t('manage.na')}, ${addressInfo?.Curr_District || ''}, ${addressInfo?.Curr_State || ''} - ${addressInfo?.Curr_Pincode || ''}
                </div>
              </div>
              <div class="field" style="flex: 1;">
                <span class="label">${t('address.permanent')}:</span>
                <div class="value">
                  ${addressInfo?.Perm_Address || t('manage.na')}, ${addressInfo?.Perm_District || ''}, ${addressInfo?.Perm_State || ''} - ${addressInfo?.Perm_Pincode || ''}
                </div>
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

          <div class="footer-section">
            <div class="declaration">
              <p style="margin-top: 0;"><strong>${t('apply.declaration_title')}:</strong></p>
              <p style="margin-bottom: 0;">${t('apply.declaration_text')}</p>
            </div>

            <div class="photo-sign-container">
              <div>
                <p style="font-size: 13px; margin: 4px 0;">${t('common.date')}: ${formatDate(appl.Apply_Date)}</p>
                <p style="font-size: 13px; margin: 4px 0;">${t('common.place')}: __________________</p>
              </div>
              <div class="sign-box">
                ${signBase64 ? `<img src="${signBase64}" class="sign-img" />` : `<div class="sign-img" style="display: flex; align-items: center; justify-content: center; font-size: 12px; color: #94a3b8;">${t('office.review_modal.sign')}</div>`}
                <p style="font-weight: bold; font-size: 14px; margin-top: 8px;">${applicantProfile?.Candidate_Name || ''}</p>
              </div>
            </div>
          </div>
        </div>

        ${includeCertificates && certificateImages.length > 0 ? certificateImages.map(cert => `
          <div class="cert-page">
            <div class="section-title">${cert.label}</div>
            <div style="display: flex; align-items: center; justify-content: center; margin-top: 1rem;">
              <img src="${cert.base64}" class="cert-img" />
            </div>
          </div>
        `).join('') : ''}
      </div>
    `;

    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
      onProgress('Preparing document...', 90);
      
      const opt = {
        margin: 0,
        filename: `Application_${appl.Appl_ID}${includeCertificates ? '_Complete' : ''}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true, 
          logging: false,
          letterRendering: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          width: 720
        },
        jsPDF: { 
          unit: 'px' as const, 
          format: [720, 1018] as any, // Standard A4 pixel ratio for better control
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      // Pass HTML content directly to html2pdf instead of DOM element
      // This often works better for off-screen rendering
      await html2pdf().set(opt).from(htmlContent).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      throw err;
    } finally {
      // Cleanup the container if it was created
      const element = document.getElementById('pdf-generation-container');
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      onProgress('Download complete!', 100);
    }
  }
};

