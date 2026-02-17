import type { FileAttachment } from '@ccgrid/shared';

const MAX_BASE64_BYTES = 4.5 * 1024 * 1024; // 4.5MB (leave margin for 5MB API limit)
const MAX_DIMENSION = 2048;

function resizeImage(file: File): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      // Scale down if exceeds max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under size limit
      let quality = 0.85;
      let base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];

      while (base64.length > MAX_BASE64_BYTES && quality > 0.2) {
        quality -= 0.15;
        base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      }

      resolve({
        name: file.name.replace(/\.\w+$/, '.jpg'),
        mimeType: 'image/jpeg',
        base64Data: base64,
      });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export async function readFileAsAttachment(file: File): Promise<FileAttachment> {
  // Resize images that might exceed the API limit
  if (file.type.startsWith('image/') && file.type !== 'image/gif') {
    // Rough estimate: base64 is ~1.37x the file size
    if (file.size * 1.37 > MAX_BASE64_BYTES) {
      return resizeImage(file);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data: base64,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function readFilesAsAttachments(files: File[]): Promise<FileAttachment[]> {
  return Promise.all(files.map(readFileAsAttachment));
}

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,.txt,.md,.csv,.json,.ts,.js,.py,.html,.css';

export { ACCEPT as FILE_ACCEPT };

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
