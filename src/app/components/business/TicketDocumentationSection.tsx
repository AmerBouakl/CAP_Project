import React, { useCallback, useEffect, useState } from 'react';
import { BookOpenText, ExternalLink, Paperclip, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { DocumentationObjectModal } from './DocumentationObjectModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DocumentationAPI } from '../../services/odataClient';
import {
  DocumentationObject,
  DOCUMENTATION_OBJECT_TYPE_LABELS,
  Ticket,
} from '../../types/entities';

interface TicketDocumentationSectionProps {
  ticket: Ticket;
  /** The parent WricefObject ID (docs live at WRICEF level). When omitted the component tries ticket.wricefItemId but that won't match docs. */
  wricefObjectId?: string;
  currentUserId?: string;
  canEdit: boolean;
  resolveUserName?: (userId: string) => string;
  onDocumentationChanged?: (ticketId: string, documentationIds: string[]) => void;
}

const byRecentUpdate = (a: DocumentationObject, b: DocumentationObject) =>
  (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);

const formatDate = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

export const TicketDocumentationSection: React.FC<TicketDocumentationSectionProps> = ({
  ticket,
  wricefObjectId,
  currentUserId,
  canEdit,
  resolveUserName,
  onDocumentationChanged,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [relatedDocs, setRelatedDocs] = useState<DocumentationObject[]>([]);

  const loadDocumentation = useCallback(async () => {
    const woId = wricefObjectId;
    if (!woId) {
      setRelatedDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const docs = await DocumentationAPI.getByWricefObject(woId);
      const sorted = [...docs].sort(byRecentUpdate);
      setRelatedDocs(sorted);
      onDocumentationChanged?.(ticket.id, sorted.map((doc) => doc.id));
    } catch {
      toast.error('Failed to load related documentation');
    } finally {
      setLoading(false);
    }
  }, [ticket.id, wricefObjectId, onDocumentationChanged]);

  useEffect(() => {
    void loadDocumentation();
  }, [loadDocumentation]);

  return (
    <>
      <div className="space-y-3 rounded-lg border border-border/70 bg-muted/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Related Documentation</h4>
            <Badge variant="outline">{relatedDocs.length}</Badge>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} disabled={!currentUserId}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Create New Documentation
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading documentation...</p>
        ) : relatedDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documentation is linked to this ticket yet.
          </p>
        ) : (
          <div className="space-y-2">
            {relatedDocs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-md border border-border/70 bg-card px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{doc.title}</p>
                      <Badge variant="outline">
                        {DOCUMENTATION_OBJECT_TYPE_LABELS[doc.type]}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.description}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>
                        Author: {resolveUserName ? resolveUserName(doc.authorId) : doc.authorId}
                      </span>
                      <span>Updated: {formatDate(doc.updatedAt ?? doc.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        {doc.attachments.length} file{doc.attachments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/shared/documentation/${doc.id}`)}
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DocumentationObjectModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        ticket={ticket}
        wricefObjectId={wricefObjectId}
        currentUserId={currentUserId}
        onCreated={async () => {
          await loadDocumentation();
        }}
      />
    </>
  );
};
