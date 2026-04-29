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

      // Add qualification docs
      quals.forEach((q) => {
        if (q.Qual_Doc) {
          certificates.push({ label: `${t('apply.sum_course')}: ${q.Course_Name} (${t('apply.uploaded_docs')})`, url: q.Qual_Doc });
        }
      });

      // Add experience docs
      exps.forEach((e) => {
        if (e.Exp_Doc) {
          certificates.push({ label: `${t('apply.sum_employer')}: ${e.Employer_Name} (${t('apply.uploaded_docs')})`, url: e.Exp_Doc });
        }
      });

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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        .pdf-content-wrapper {
          font-family: 'Noto Sans Devanagari', 'Poppins', 'Inter', 'Helvetica', Arial, sans-serif;
          line-height: 1.4;
          color: #333;
          background-color: #ffffff;
          width: 760px;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        .pdf-page {
          margin: 0;
          padding: 2rem;
          background-color: #ffffff !important;
          width: 100%;
          min-height: 1050px;
          box-sizing: border-box;
        }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        img { display: block; max-width: 100%; height: auto; }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; color: #1e3a8a; font-weight: 700; }
        .header h2 { margin: 4px 0; font-size: 15px; color: #4b5563; font-weight: 600; }
        .header p { margin: 4px 0; font-size: 12px; font-weight: bold; }
        
        .section { margin-bottom: 15px; clear: both; page-break-inside: avoid; }
        .section-title {
          background: #f1f5f9;
          padding: 6px 10px;
          font-weight: bold;
          font-size: 14px;
          border-left: 4px solid #1e3a8a;
          margin-bottom: 10px;
          text-transform: uppercase;
          color: #0f172a;
        }
        
        .field { margin-bottom: 6px; font-size: 12px; display: flex; align-items: flex-start; }
        .label { font-weight: bold; color: #475569; width: 180px; display: inline-block; flex-shrink: 0; }
        .value { color: #1e293b; word-break: break-all; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; clear: both; }
        table th, table td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
        table th { background: #f8fafc; font-weight: bold; color: #0f172a; }
        
        .photo-box {
          text-align: center;
          width: 130px;
          flex-shrink: 0;
        }
        .photo-img {
          width: 110px;
          height: 140px;
          border: 1px solid #94a3b8;
          object-fit: cover;
          margin-bottom: 4px;
          background: #f8fafc;
        }
        
        .declaration {
          margin-top: 15px;
          font-size: 11px;
          font-style: italic;
          border: 1px solid #e2e8f0;
          padding: 10px;
          background: #f8fafc;
          border-radius: 4px;
          color: #334155;
          page-break-inside: avoid;
        }

        .cert-page {
          page-break-before: always;
          padding: 2rem;
          text-align: center;
          background: white;
          width: 100%;
          min-height: 1050px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .cert-img {
          max-width: 100%;
          max-height: 850px;
          border: 1px solid #e2e8f0;
          margin-top: 15px;
          object-fit: contain;
          background: #f8fafc;
          display: block;
        }
      </style>
      <div class="pdf-content-wrapper">
        <div class="pdf-page">
          <div class="header">
            <h1>${t('nav.system_name')}</h1>
            <h2>${adTitle}</h2>
            <p>${t('office.table.post')}: ${postName}</p>
            <div style="margin-top: 8px; font-size: 11px; color: #475569; font-weight: 500;">
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
                <div class="field"><span class="label">${t('profile.form.gender')}:</span> <span class="value">${applicantProfile?.Gender ? t(`constants.${applicantProfile.Gender}`) : t('manage.na')}</span></div>
                <div class="field"><span class="label">${t('profile.form.category')}:</span> <span class="value">${additionalInfo?.Caste_Category ? t(`constants.${additionalInfo.Caste_Category}`) : t('manage.na')}</span></div>
                <div class="field">
                  <span class="label">${t('apply.domicile_cg')}:</span> 
                  <span class="value">
                    ${additionalInfo?.Is_CG === 'Yes' ? t('constants.Yes') : t('constants.No')} 
                    (${additionalInfo?.Is_CG === 'Yes' ? (additionalInfo?.Domicile_District || t('manage.na')) : (additionalInfo?.Domicile_State || t('manage.na'))})
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
                ${photoBase64 ? `<img src="${photoBase64}" class="photo-img" />` : `<div class="photo-img" style="display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8; border: 1px dashed #cbd5e1;">${t('office.review_modal.photo')}</div>`}
              </div>
            </div>
          </div>
 
          <div class="section">
            <div class="section-title">${t('office.review_modal.addr_details')}</div>
            <div style="display: flex; gap: 20px;">
              <div class="field" style="flex: 1; flex-direction: column;">
                <span class="label" style="width: 100%; border-bottom: 1px solid #e2e8f0; margin-bottom: 4px;">${t('address.current')}</span>
                <span class="value" style="margin-left: 0;">
                  ${addressInfo?.Curr_Address || t('manage.na')}, ${addressInfo?.Curr_District || ''}, ${addressInfo?.Curr_State || ''} - ${addressInfo?.Curr_Pincode || ''}
                </span>
              </div>
              <div class="field" style="flex: 1; flex-direction: column;">
                <span class="label" style="width: 100%; border-bottom: 1px solid #e2e8f0; margin-bottom: 4px;">${t('address.permanent')}</span>
                <span class="value" style="margin-left: 0;">
                  ${addressInfo?.Perm_Address || t('manage.na')}, ${addressInfo?.Perm_District || ''}, ${addressInfo?.Perm_State || ''} - ${addressInfo?.Perm_Pincode || ''}
                </span>
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
                    <td>${q.Qualification_Type ? t(`constants.${q.Qualification_Type}`) : ''}</td>
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
              <p style="margin-top: 0; font-weight: bold; color: #1e3a8a;">${t('apply.declaration_title')}:</p>
              <p style="margin-bottom: 0;">${t('apply.declaration_text')}</p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px;">
              <div>
                <p style="font-size: 11px; margin: 2px 0;">${t('common.date')}: ${formatDate(new Date())}</p>
                <p style="font-size: 11px; margin: 2px 0;">${t('common.place')}: __________________</p>
              </div>
              <div style="text-align: center; min-width: 150px;">
                ${signBase64 ? `<img src="${signBase64}" style="width: 120px; height: 40px; object-fit: contain; margin: 0 auto 5px;" />` : `<div style="height: 40px; border-bottom: 1px dashed #94a3b8; width: 120px; margin: 0 auto 5px;"></div>`}
                <p style="font-weight: bold; font-size: 12px;">(${applicantProfile?.Candidate_Name})</p>
                <p style="font-size: 10px; color: #64748b;">${t('signup.applicant_signature')}</p>
              </div>
            </div>
          </div>
        </div>

        ${certificateImages.length > 0 ? certificateImages.map(cert => `
          <div class="cert-page">
            <div class="section-title" style="width: 100%; text-align: left;">${cert.label}</div>
            <img src="${cert.base64}" class="cert-img" />
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

