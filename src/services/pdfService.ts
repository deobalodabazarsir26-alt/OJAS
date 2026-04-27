import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Application, Advertisement, Post, AdditionalInfo, AddressInfo, QualificationInfo, ExperienceInfo, GeneralUser } from '../types';
import { formatDate } from '../lib/utils';
import { sheetService } from './sheetService';

export const pdfService = {
  generateApplicationPDF: async (
    appl: Application,
    applicantProfile: GeneralUser,
    additionalInfo: AdditionalInfo | null,
    addressInfo: AddressInfo | null,
    qualifications: QualificationInfo[],
    experiences: ExperienceInfo[],
    adTitle: string,
    postName: string,
    t: any,
    options: { includeCertificates?: boolean; onProgress?: (msg: string, progress: number) => void } = {}
  ) => {
    const { includeCertificates = false, onProgress = () => {} } = options;

    const tc = (val: string | undefined) => {
      if (!val) return '';
      // We force English for constants in PDF to ensure PDF logic is consistent
      return val;
    };

    onProgress('Processing images...', 40);
    const photoBase64 = applicantProfile?.Photo_URL ? await sheetService.proxyImage(applicantProfile.Photo_URL) : '';
    const signBase64 = applicantProfile?.Signature_URL ? await sheetService.proxyImage(applicantProfile.Signature_URL) : '';
    

    onProgress('Generating PDF document...', 70);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Professional Colors
    const primaryColor: [number, number, number] = [30, 64, 175]; // Royal Blue
    const secondaryColor: [number, number, number] = [248, 250, 252]; // Light Slate
    const accentColor: [number, number, number] = [59, 130, 246]; // Bright Blue
    const borderColor: [number, number, number] = [30, 64, 175];

    const drawPageLayout = (d: typeof doc, currentPage: number, totalPages: number) => {
      const pW = d.internal.pageSize.getWidth();
      const pH = d.internal.pageSize.getHeight();
      
      // Page Border
      d.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      d.setLineWidth(0.5);
      d.rect(8, 8, pW - 16, pH - 16);
      d.setLineWidth(0.2);
      d.rect(9.5, 9.5, pW - 19, pH - 19);
      
      // Footer
      d.setFontSize(8);
      d.setTextColor(100);
      d.setFont('helvetica', 'italic');
      d.text('OJAS - Online Job Application System | Generated on ' + new Date().toLocaleDateString(), 20, pH - 12);
      d.setFont('helvetica', 'normal');
      d.text(`Page ${currentPage} of ${totalPages}`, pW - 30, pH - 12);
    };

    const drawHeader = (d: typeof doc, y: number) => {
      // Header Banner
      d.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      d.rect(11, 11, pageWidth - 22, 40, 'F');

      // Header Title
      d.setFontSize(20);
      d.setFont('helvetica', 'bold');
      d.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      d.text('OJAS - JOB APPLICATION FORM', pageWidth / 2, y + 5, { align: 'center' });
      
      // Advertisement & Post Info
      d.setFontSize(11);
      d.setTextColor(70);
      d.text(String(adTitle), pageWidth / 2, y + 15, { align: 'center' });
      
      d.setFontSize(13);
      d.setFont('helvetica', 'bold');
      d.setTextColor(0);
      d.text(`Post: ${postName}`, pageWidth / 2, y + 23, { align: 'center' });

      d.setFontSize(9);
      d.setFont('helvetica', 'normal');
      d.setTextColor(100);
      d.text(`Application ID: ${appl.Appl_ID} | Date: ${formatDate(appl.Apply_Date)}`, pageWidth / 2, y + 30, { align: 'center' });
    };

    let yPos = 20;
    drawHeader(doc, yPos);
    yPos += 45;

    // Photo
    const photoY = yPos;
    if (photoBase64 && photoBase64.startsWith('data:image/')) {
      try {
        const mimeType = photoBase64.split(';')[0].split(':')[1];
        const format = mimeType.split('/')[1].toUpperCase();
        doc.addImage(photoBase64, format === 'PNG' ? 'PNG' : 'JPEG', 20, photoY, 35, 45);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.rect(20, photoY, 35, 45);
      } catch (e) {
        console.error('Error adding photo to PDF:', e);
        doc.rect(20, photoY, 35, 45);
        doc.text('Photo', 37.5, photoY + 22.5, { align: 'center' });
      }
    } else {
      doc.setDrawColor(200);
      doc.rect(20, photoY, 35, 45);
      doc.text('Photo', 37.5, photoY + 22.5, { align: 'center' });
    }

    // Basic Info
    doc.setFontSize(11);
    doc.setTextColor(0);
    const infoX = 65;
    let infoY = photoY + 5;
    
    const drawInfoLine = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(label, infoX, infoY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(String(value), infoX + 45, infoY);
      infoY += 8;
    };

    drawInfoLine('Candidate Name:', String(applicantProfile?.Candidate_Name || ''));
    drawInfoLine('Father\'s Name:', String(applicantProfile?.Father_Name || ''));
    drawInfoLine('Mother\'s Name:', String(applicantProfile?.Mother_Name || ''));
    drawInfoLine('Gender:', tc(applicantProfile?.Gender));
    drawInfoLine('Date of Birth:', String(formatDate(applicantProfile?.DOB || '')));
    
    yPos = Math.max(photoY + 55, infoY + 5);

    const drawSectionHeader = (title: string, y: number) => {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(title, 20, y);
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.8);
      doc.line(20, y + 2, pageWidth - 20, y + 2);
      return y + 10;
    };

    // Personal Details
    yPos = drawSectionHeader('Personal Details', yPos);

    const personalData = [
      ["Father's Name", String(applicantProfile?.Father_Name || ''), "Mother's Name", String(applicantProfile?.Mother_Name || '')],
      ['Email', String(applicantProfile?.Email_ID || ''), 'Mobile', String(applicantProfile?.Mobile || '')],
      ['Caste Category', tc(additionalInfo?.Caste_Category), 'Is CG Domicile', tc(additionalInfo?.Is_CG)],
      ['Locality', tc(additionalInfo?.Locality), 'Is PwD', tc(additionalInfo?.Is_PWD)],
    ];

    autoTable(doc, {
      startY: yPos,
      body: personalData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35, textColor: primaryColor },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', cellWidth: 35, textColor: primaryColor },
        3: { cellWidth: 55 },
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Address Details
    if (yPos > pageHeight - 60) { doc.addPage(); yPos = 25; }
    yPos = drawSectionHeader('Address Details', yPos);

    const addressData = [
      ['Permanent Address', `${addressInfo?.Perm_Address || ''}\n${addressInfo?.Perm_Landmark || ''}\n${tc(addressInfo?.Perm_District)}, ${tc(addressInfo?.Perm_State)} - ${addressInfo?.Perm_Pincode || ''}`],
      ['Current Address', `${addressInfo?.Curr_Address || ''}\n${addressInfo?.Curr_Landmark || ''}\n${tc(addressInfo?.Curr_District)}, ${tc(addressInfo?.Curr_State)} - ${addressInfo?.Curr_Pincode || ''}`],
    ];

    autoTable(doc, {
      startY: yPos,
      body: addressData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40, textColor: primaryColor },
        1: { cellWidth: 140 },
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Qualifications
    if (qualifications && qualifications.length > 0) {
      if (yPos > pageHeight - 60) { doc.addPage(); yPos = 25; }
      yPos = drawSectionHeader('Educational Qualifications', yPos);

      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Course', 'Board/University', 'Year', 'Result', '%/CGPA']],
        body: qualifications.map(q => [
          tc(q.Qualification_Type),
          String(q.Course_Name || ''),
          String(q.Board_Name || ''),
          String(q.Pass_Year || ''),
          tc(q.Result_Status),
          String(q.Percentage || '')
        ]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        styles: { fontSize: 9 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Experience
    if (experiences && experiences.length > 0) {
      if (yPos > pageHeight - 60) { doc.addPage(); yPos = 25; }
      yPos = drawSectionHeader('Work Experience', yPos);

      autoTable(doc, {
        startY: yPos,
        head: [['Employer', 'Post Held', 'From', 'To', 'Type']],
        body: experiences.map(e => [
          String(e.Employer_Name || ''),
          String(e.Post_Held || ''),
          String(formatDate(e.Start_Date)),
          String(e.Currently_Working === 'Yes' ? 'Present' : formatDate(e.End_Date)),
          tc(e.Employment_Type)
        ]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        styles: { fontSize: 9 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Signature and Declaration
    if (yPos > pageHeight - 80) { doc.addPage(); yPos = 25; }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Declaration:', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(50);
    doc.text('I hereby declare that all the information provided in this application is true, complete and correct to the best of my knowledge and belief. I understand that in the event of any information being found false or incorrect at any stage, my candidacy/appointment is liable to be cancelled/terminated.', 20, yPos, { maxWidth: pageWidth - 40 });
    yPos += 25;

    // Signature
    const signX = pageWidth - 60;
    if (signBase64 && signBase64.startsWith('data:image/')) {
      try {
        const mimeType = signBase64.split(';')[0].split(':')[1];
        const format = mimeType.split('/')[1].toUpperCase();
        doc.addImage(signBase64, format === 'PNG' ? 'PNG' : 'JPEG', signX, yPos, 40, 15);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.rect(signX, yPos, 40, 15);
      } catch (e) {
        console.error('Error adding signature to PDF:', e);
        doc.rect(signX, yPos, 40, 15);
      }
    } else {
      doc.setDrawColor(200);
      doc.rect(signX, yPos, 40, 15);
    }
    yPos += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(String(applicantProfile?.Candidate_Name || ''), signX + 20, yPos, { align: 'center' });
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Date: ${String(formatDate(appl.Apply_Date))}`, signX + 20, yPos, { align: 'center' });

    // Include Certificates if requested
    if (includeCertificates) {
      const certificates = [
        { label: 'ID Proof', url: applicantProfile?.ID_Doc },
        { label: 'DOB Proof', url: applicantProfile?.DOB_Doc },
        { label: 'Domicile Certificate', url: additionalInfo?.Domicile_Certificate_URL },
        { label: 'Caste Certificate', url: additionalInfo?.Caste_Certificate_URL },
        { label: 'PwD Certificate', url: additionalInfo?.PwD_Certificate_URL },
      ].filter(c => c.url);

      for (const cert of certificates) {
        onProgress(`Processing ${cert.label}...`, 80);
        if (cert.url) {
          try {
            const certBase64 = await sheetService.proxyImage(cert.url);
            if (certBase64 && certBase64.startsWith('data:image/')) {
              doc.addPage();
              const mimeType = certBase64.split(';')[0].split(':')[1];
              const format = mimeType.split('/')[1].toUpperCase();
              
              const imgW = pageWidth - 40;
              const imgH = pageHeight - 60;
              
              doc.setFontSize(16);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              doc.text(cert.label, pageWidth / 2, 30, { align: 'center' });
              
              doc.addImage(certBase64, format === 'PNG' ? 'PNG' : 'JPEG', 20, 40, imgW, imgH, undefined, 'FAST');
            } else if (certBase64 && certBase64.startsWith('data:application/pdf')) {
              // Handle Base64 PDF
              doc.addPage();
              doc.setFontSize(16);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              doc.text(cert.label, pageWidth / 2, 50, { align: 'center' });
              
              doc.setFontSize(12);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0);
              doc.text('This document is a PDF and could not be directly embedded in this file.', pageWidth / 2, 70, { align: 'center' });
              doc.setTextColor(30, 64, 175);
              doc.text('Click here to view original document', pageWidth / 2, 85, { align: 'center' });
              doc.link(pageWidth / 2 - 50, 80, 100, 10, { url: cert.url });
            } else if (cert.url.toLowerCase().endsWith('.pdf')) {
              // If it's a PDF, we can't easily merge with jsPDF without extra libs, 
              // so we add a page with a link
              doc.addPage();
              doc.setFontSize(16);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
              doc.text(cert.label, pageWidth / 2, 50, { align: 'center' });
              
              doc.setFontSize(12);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0);
              doc.text('This document is a PDF and could not be directly embedded in this file.', pageWidth / 2, 70, { align: 'center' });
              doc.setTextColor(30, 64, 175);
              doc.text('Click here to view original document', pageWidth / 2, 85, { align: 'center' });
              doc.link(pageWidth / 2 - 50, 80, 100, 10, { url: cert.url });
            }
          } catch (err) {
            console.error(`Error adding certificate ${cert.label}:`, err);
          }
        }
      }
    }

    // Final layout check
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPageLayout(doc, i, totalPages);
    }
    
    onProgress('Download complete!', 100);
    doc.save(`Application_${appl.Appl_ID}${includeCertificates ? '_Complete' : ''}.pdf`);
  }
};
