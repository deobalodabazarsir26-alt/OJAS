import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date | string) => {
  if (!date) return '';
  
  let d: Date;
  if (typeof date === 'string') {
    // Handle YYYY-MM-DD strings directly to avoid any timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    d = new Date(date);
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return String(date);
  
  // The "One Day Less" fix:
  // Date-only values from Google Sheets often arrive as ISO strings shifted by timezone (e.g., 18:30 UTC for IST midnight).
  // Adding 12 hours "snaps" the date to the intended day regardless of most timezone shifts.
  const snapped = new Date(d.getTime() + (12 * 60 * 60 * 1000));
  
  const day = String(snapped.getUTCDate()).padStart(2, '0');
  const month = String(snapped.getUTCMonth() + 1).padStart(2, '0');
  const year = snapped.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formats a date for HTML input type="date" (YYYY-MM-DD)
 * Ensures no timezone shift occurs by snapping to the nearest day.
 */
export const formatDateForInput = (date: Date | string) => {
  if (!date) return '';
  
  let d: Date;
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    d = new Date(date);
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return '';
  
  // Snap to nearest day by adding 12 hours
  const snapped = new Date(d.getTime() + (12 * 60 * 60 * 1000));
  
  const year = snapped.getUTCFullYear();
  const month = String(snapped.getUTCMonth() + 1).padStart(2, '0');
  const day = String(snapped.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export function getEmbedUrl(url: string | undefined) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  // Handle Google Drive links
  if (url.includes('drive.google.com')) {
    const id = url.match(/[-\w]{25,}/);
    if (id) {
      // The thumbnail endpoint is often more reliable for embedding previews
      // sz=w1000 ensures a high-quality version
      return `https://drive.google.com/thumbnail?id=${id[0]}&sz=w1000`;
    }
  }
  
  return url;
}

export function getDocPreviewUrl(url: string | undefined) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  if (url.includes('drive.google.com')) {
    const id = url.match(/[-\w]{25,}/);
    if (id) {
      return `https://drive.google.com/file/d/${id[0]}/preview`;
    }
  }
  
  return url;
}

export async function imageToBase64(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  const embedUrl = getEmbedUrl(url);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => {
      // If cross-origin fails, we might just return an empty string or the original URL
      // but jsPDF needs base64 for reliable rendering in some environments
      resolve(''); 
    };
    img.src = embedUrl;
  });
}

/**
 * Translates a global constant value using i18next.
 * Falls back to the original value if no translation exists.
 */
export function translateConstant(t: any, value: string | undefined): string {
  if (!value) return '';
  const key = `constants.${value}`;
  const translated = t(key);
  // i18next returns the key if translation is missing
  return translated === key ? value : translated;
}
