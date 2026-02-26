import React, { useEffect, useState } from 'react';
import { FilePlus2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { DocumentationAPI } from '../../services/odataClient';
import {
  DocumentationAttachment,
  DocumentationObject,
  DocumentationObjectType,
  DOCUMENTATION_OBJECT_TYPE_LABELS,
  Ticket,
} from '../../types/entities';

interface DocumentationObjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  wricefObjectId?: string;
  currentUserId?: string;
  onCreated?: (documentation: DocumentationObject) => void | Promise<void>;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const initialContentFromTicket = (ticket: Ticket) =>
  `# ${ticket.title}\n\n## Context\n${ticket.description}\n\n## Functional Details\n- \n\n## Technical Notes\n- \n`;

export const DocumentationObjectModal: React.FC<DocumentationObjectModalProps> = ({
  open,
  onOpenChange,
  ticket,
  wricefObjectId,
  currentUserId,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DocumentationObjectType>('SFD');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<DocumentationAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(`SFD - ${ticket.title}`);
    setDescription(`Detailed documentation created from ticket ${ticket.ticketCode}.`);
    setType('SFD');
    setContent(initialContentFromTicket(ticket));
    setAttachments([]);
  }, [open, ticket]);

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const additions: DocumentationAttachment[] = Array.from(fileList).map((file) => ({
      filename: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    setAttachments((prev) => [...prev, ...additions]);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUserId) {
      toast.error('Missing author context');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await DocumentationAPI.create({
        title: title.trim(),
        description: description.trim(),
        type,
        content: content.trim(),
        attachments,
        wricefObjectId: wricefObjectId ?? '',
        projectId: ticket.projectId,
        authorId: currentUserId,
      });

      if (onCreated) {
        await onCreated(created);
      }
      toast.success('Documentation created');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create documentation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-primary" />
            Create Documentation Object
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Ticket:</span> {ticket.ticketCode} - {ticket.title}
            </p>
            <p>
              <span className="text-muted-foreground">Project:</span> {ticket.projectId}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This documentation will be initialized and linked to the current ticket.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="doc-title">Title *</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Documentation title"
              />
            </div>
            <div>
              <Label htmlFor="doc-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as DocumentationObjectType)}>
                <SelectTrigger id="doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOCUMENTATION_OBJECT_TYPE_LABELS) as DocumentationObjectType[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {DOCUMENTATION_OBJECT_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="doc-description">Overview</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="General overview of this documentation object"
            />
          </div>

          <div>
            <Label htmlFor="doc-content">Content *</Label>
            <Textarea
              id="doc-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={14}
              className="font-mono text-sm"
              placeholder="Write markdown or rich text content..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-files">Attach Files</Label>
            <Input
              id="doc-files"
              type="file"
              multiple
              onChange={addFiles}
            />
            {attachments.length > 0 && (
              <div className="space-y-2 rounded-md border border-border/70 bg-surface-2 p-3">
                {attachments.map((file, index) => (
                  <div key={`${file.filename}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="truncate font-medium text-foreground">{file.filename}</p>
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {formatBytes(file.size)}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Documentation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
