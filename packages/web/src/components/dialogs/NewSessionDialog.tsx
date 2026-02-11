import { useApi } from '../../hooks/useApi';
import { SessionConfig } from '../SessionConfig';
import { DialogOverlay } from './DialogOverlay';

export function NewSessionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const api = useApi();

  return (
    <DialogOverlay open={open} onClose={onClose} title="New Session">
      <SessionConfig api={api} onCreated={onClose} />
    </DialogOverlay>
  );
}
