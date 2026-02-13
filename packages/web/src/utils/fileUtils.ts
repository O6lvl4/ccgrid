import type { FileAttachment } from '@ccgrid/shared';

export function readFileAsAttachment(file: File): Promise<FileAttachment> {
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
