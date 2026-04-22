import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Props {
  url: string | null;
  onClose: () => void;
}

export const ImageLightbox = ({ url, onClose }: Props) => {
  if (!url) return null;
  return (
    <Dialog open={!!url} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl bg-background/95 p-2">
        <img src={url} alt="" className="w-full h-auto max-h-[85vh] object-contain rounded" />
      </DialogContent>
    </Dialog>
  );
};
