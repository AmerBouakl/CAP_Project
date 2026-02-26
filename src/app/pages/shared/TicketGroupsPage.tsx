import React, { useEffect, useState } from 'react';
import { FileText, Link as LinkIcon, ListChecks, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { TicketGroupsAPI, TicketsAPI, ProjectsAPI } from '../../services/odataClient';
import { TicketGroup, TicketGroupDocument, Ticket, Project, TicketNature, TICKET_NATURE_LABELS, TICKET_STATUS_LABELS } from '../../types/entities';

const NATURE_OPTIONS: TicketNature[] = ['WORKFLOW', 'FORMULAIRE', 'PROGRAMME', 'ENHANCEMENT', 'MODULE', 'REPORT'];

const TicketGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<TicketGroup[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNature, setFormNature] = useState<TicketNature>('PROGRAMME');
  const [formProjectId, setFormProjectId] = useState('');

  // Document management state
  const [docDialogGroupId, setDocDialogGroupId] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docContent, setDocContent] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [g, t, p] = await Promise.all([
          TicketGroupsAPI.getAll(),
          TicketsAPI.getAll(),
          ProjectsAPI.getAll(),
        ]);
        setGroups(g);
        setTickets(t);
        setProjects(p);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleCreate = async () => {
    if (!formLabel.trim() || !formProjectId) {
      toast.error('Label and project are required');
      return;
    }

    const newGroup = await TicketGroupsAPI.create({
      projectId: formProjectId,
      nature: formNature,
      label: formLabel,
      description: formDescription,
    });

    setGroups((prev) => [...prev, newGroup]);
    setFormLabel('');
    setFormDescription('');
    setDialogOpen(false);
    toast.success('Ticket group created');
  };

  const handleDelete = async (id: string) => {
    try {
      const linkedTickets = tickets.filter((ticket) => ticket.groupId === id);
      await Promise.all([
        TicketGroupsAPI.delete(id),
        ...linkedTickets.map((ticket) => TicketsAPI.update(ticket.id, { groupId: undefined })),
      ]);

      setGroups((prev) => prev.filter((g) => g.id !== id));
      setTickets((prev) =>
        prev.map((ticket) => (ticket.groupId === id ? { ...ticket, groupId: undefined } : ticket))
      );
      toast.success('Ticket group deleted');
    } catch {
      toast.error('Failed to delete ticket group');
    }
  };

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const getGroupTickets = (groupId: string) => tickets.filter((t) => t.groupId === groupId);

  const addDocument = async (groupId: string) => {
    if (!docName.trim()) {
      toast.error('Document name is required');
      return;
    }
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const newDoc: TicketGroupDocument = {
      id: `doc${Date.now()}`,
      name: docName.trim(),
      url: docUrl.trim() || undefined,
      content: docContent.trim() || undefined,
      addedAt: new Date().toISOString(),
    };
    const updatedDocs = [...(group.documents || []), newDoc];
    try {
      const updated = await TicketGroupsAPI.update(groupId, { documents: updatedDocs });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
      setDocName('');
      setDocUrl('');
      setDocContent('');
      setDocDialogGroupId(null);
      toast.success('Document added');
    } catch {
      toast.error('Failed to add document');
    }
  };

  const removeDocument = async (groupId: string, docId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const updatedDocs = (group.documents || []).filter((d) => d.id !== docId);
    try {
      const updated = await TicketGroupsAPI.update(groupId, { documents: updatedDocs });
      setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
      toast.success('Document removed');
    } catch {
      toast.error('Failed to remove document');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Ticket Groups"
          subtitle="Organize tickets by nature and project"
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Ticket Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Project</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nature</Label>
                <Select value={formNature} onValueChange={(v) => setFormNature(v as TicketNature)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NATURE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={n}>{TICKET_NATURE_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label</Label>
                <Input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="Group label..." />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description..." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups list */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card className="border-border/80 bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ListChecks className="mb-2 h-10 w-10" />
              <p>No ticket groups yet</p>
              <p className="text-xs">Create a group to organize tickets by nature</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => {
            const groupTickets = getGroupTickets(group.id);
            return (
              <Card key={group.id} className="border-border/80 bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {getProjectName(group.projectId)} • {TICKET_NATURE_LABELS[group.nature]} • {groupTickets.length} ticket(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{TICKET_NATURE_LABELS[group.nature]}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(group.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {groupTickets.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      {groupTickets.map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between rounded border p-2 text-sm">
                          <span>{ticket.title}</span>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                            <Badge variant="outline" className="text-xs">{ticket.priority}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                {group.description && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </CardContent>
                )}

                {/* Documents section */}
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Documents ({(group.documents || []).length})
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => {
                        setDocName('');
                        setDocUrl('');
                        setDocContent('');
                        setDocDialogGroupId(group.id);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Doc
                    </Button>
                  </div>
                  {(group.documents || []).length > 0 ? (
                    <div className="space-y-1">
                      {(group.documents || []).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded border p-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-xs truncate">{doc.name}</div>
                              {doc.url && (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                                >
                                  <LinkIcon className="h-2.5 w-2.5" /> {doc.url}
                                </a>
                              )}
                              {doc.content && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{doc.content}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground">{new Date(doc.addedAt).toLocaleDateString()}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => void removeDocument(group.id, doc.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">No documents attached yet</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Document Dialog */}
      <Dialog open={!!docDialogGroupId} onOpenChange={(open) => { if (!open) setDocDialogGroupId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Add Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Document Name *</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Architecture Overview.pdf" />
            </div>
            <div>
              <Label>URL (optional)</Label>
              <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Notes / Content (optional)</Label>
              <Textarea value={docContent} onChange={(e) => setDocContent(e.target.value)} rows={3} placeholder="Summary or notes about this document..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogGroupId(null)}>Cancel</Button>
            <Button onClick={() => { if (docDialogGroupId) void addDocument(docDialogGroupId); }}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketGroupsPage;
