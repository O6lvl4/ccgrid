import { useState, useRef, useCallback, type DragEvent } from 'react';
import { FILE_ACCEPT } from '../utils/fileUtils';

const ACCEPTED_TYPES = new Set(
  FILE_ACCEPT.split(',').map(t => t.trim()),
);

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_TYPES.has(ext);
}

export function useFileDrop(onFiles: (files: File[]) => void, disabled = false) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDragOver(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, [disabled]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(isAcceptedFile);
    if (files.length > 0) onFiles(files);
  }, [disabled, onFiles]);

  return {
    isDragOver,
    dropHandlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
