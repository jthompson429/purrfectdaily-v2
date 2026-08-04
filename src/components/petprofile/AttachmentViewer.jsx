import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Image as ImageIcon, ExternalLink } from "lucide-react";

export default function AttachmentViewer({ attachment, onOpenChange }) {
  const open = !!attachment;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl border-border bg-background max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-foreground font-bold text-base truncate font-heading">{attachment?.name || "Attachment"}</DialogTitle>
          {attachment?.file_url && (
            <a href={attachment.file_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          )}
        </DialogHeader>
        <div className="overflow-auto max-h-[74vh] rounded-xl bg-muted">
          {attachment?.type === "image" ? (
            <img src={attachment.file_url} alt={attachment.name} className="w-full object-contain" />
          ) : (
            <iframe src={attachment.file_url} title={attachment.name} className="w-full h-[74vh]" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}