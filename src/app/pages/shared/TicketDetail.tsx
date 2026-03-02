import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  TicketsAPI,
  TicketCommentsAPI,
  WricefObjectsAPI,
  ProjectsAPI,
  UsersAPI,
} from '../../services/odataClient';
import {
  Ticket,
  TicketComment,
  TicketStatus,
  WricefObject,
  Project,
  User,
  TICKET_STATUS_LABELS,
  TICKET_NATURE_LABELS,
  TICKET_COMPLEXITY_LABELS,
  SAP_MODULE_LABELS,
  USER_ROLE_LABELS,
  UserRole,
  TicketNature,
  TicketComplexity,
  Priority,
  SAPModule,
} from '../../types/entities';
import { toast } from 'sonner';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  Send,
  Clock,
  UserIcon,
  MessageSquare,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  TestTube,
  CircleDot,
  ArrowRight,
  CalendarDays,
  Loader2,
  Pencil,
  Eye,
  Save,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColor: Record<TicketStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  IN_TEST: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  DONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
};

const priorityColor: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_ORDER: TicketStatus[] = ['NEW', 'IN_PROGRESS', 'IN_TEST', 'BLOCKED', 'DONE', 'REJECTED'];

const eventIcon: Record<string, React.ReactNode> = {
  CREATED: <CircleDot className="h-3.5 w-3.5 text-blue-500" />,
  STATUS_CHANGE: <Activity className="h-3.5 w-3.5 text-amber-500" />,
  ASSIGNED: <UserIcon className="h-3.5 w-3.5 text-indigo-500" />,
  COMMENT: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
  PRIORITY_CHANGE: <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />,
  EFFORT_CHANGE: <Clock className="h-3.5 w-3.5 text-cyan-500" />,
  SENT_TO_TEST: <TestTube className="h-3.5 w-3.5 text-purple-500" />,
};

const statusIcon: Record<string, React.ReactNode> = {
  NEW: <CircleDot className="h-4 w-4" />,
  IN_PROGRESS: <PlayCircle className="h-4 w-4" />,
  IN_TEST: <TestTube className="h-4 w-4" />,
  BLOCKED: <PauseCircle className="h-4 w-4" />,
  DONE: <CheckCircle2 className="h-4 w-4" />,
  REJECTED: <XCircle className="h-4 w-4" />,
};

// Chat bubble role colors
const roleBubbleColor: Record<string, { bg: string; name: string; align: string }> = {
  CONSULTANT_TECHNIQUE: {
    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    name: 'text-blue-700 dark:text-blue-300',
    align: 'justify-start',
  },
  CONSULTANT_FONCTIONNEL: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    name: 'text-emerald-700 dark:text-emerald-300',
    align: 'justify-end',
  },
  MANAGER: {
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    name: 'text-purple-700 dark:text-purple-300',
    align: 'justify-start',
  },
};
const defaultBubble = { bg: 'bg-muted/50 border-border', name: 'text-foreground', align: 'justify-start' };

// ---------------------------------------------------------------------------
// Edit form type
// ---------------------------------------------------------------------------
interface EditForm {
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  nature: TicketNature;
  complexity: TicketComplexity;
  module: SAPModule;
  dueDate: string;
  estimationHours: number;
  effortHours: number;
  effortComment: string;
  techConsultantId: string;
  functionalConsultantId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // View / Edit toggle
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [techConsultants, setTechConsultants] = useState<User[]>([]);
  const [funcConsultants, setFuncConsultants] = useState<User[]>([]);
  const [wricefObjects, setWricefObjects] = useState<WricefObject[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!ticketId) return;
    void loadData();
  }, [ticketId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTickets, projectData, userData, wricefData] = await Promise.all([
        TicketsAPI.getAll(),
        ProjectsAPI.getAll(),
        UsersAPI.getAll(),
        WricefObjectsAPI.getAll(),
      ]);

      const found = allTickets.find((t) => t.id === ticketId);
      if (found) {
        setTicket(found);
        const chatMessages = await TicketCommentsAPI.getByTicket(found.id);
        setComments(chatMessages);
      }

      setProjects(projectData);
      setAllUsers(userData);
      setTechConsultants(userData.filter((u) => u.role === 'CONSULTANT_TECHNIQUE'));
      setFuncConsultants(userData.filter((u) => u.role === 'CONSULTANT_FONCTIONNEL'));
      setWricefObjects(wricefData);
    } catch (err) {
      console.error('Failed to load ticket', err);
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const userName = useCallback(
    (id?: string) => allUsers.find((u) => u.id === id)?.name ?? id ?? '—',
    [allUsers]
  );
  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? id,
    [projects]
  );
  const findWricefObjectForItem = useCallback(
    (itemId?: string) => {
      if (!itemId) return undefined;
      return wricefObjects.find((wo) => wo.items?.some((i) => i.id === itemId));
    },
    [wricefObjects]
  );

  // -----------------------------------------------------------------------
  // Edit mode
  // -----------------------------------------------------------------------
  const startEditing = () => {
    if (!ticket) return;
    setEditForm({
      title: ticket.title,
      description: ticket.description ?? '',
      status: ticket.status,
      priority: ticket.priority,
      nature: ticket.nature,
      complexity: ticket.complexity,
      module: ticket.module,
      dueDate: ticket.dueDate ?? '',
      estimationHours: ticket.estimationHours,
      effortHours: ticket.effortHours,
      effortComment: ticket.effortComment ?? '',
      techConsultantId: ticket.techConsultantId ?? '',
      functionalConsultantId: ticket.functionalConsultantId ?? '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const saveChanges = async () => {
    if (!ticket || !editForm || !currentUser) return;
    setSaving(true);
    try {
      const updated = await TicketsAPI.update(ticket.id, {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        nature: editForm.nature,
        complexity: editForm.complexity,
        module: editForm.module,
        dueDate: editForm.dueDate || undefined,
        estimationHours: editForm.estimationHours,
        effortHours: editForm.effortHours,
        effortComment: editForm.effortComment,
        techConsultantId: editForm.techConsultantId || undefined,
        functionalConsultantId: editForm.functionalConsultantId || undefined,
        assignedTo: editForm.techConsultantId || undefined,
        assignedToRole: editForm.techConsultantId ? 'CONSULTANT_TECHNIQUE' : undefined,
      });
      setTicket(updated);
      setIsEditing(false);
      setEditForm(null);
      toast.success('Ticket updated successfully');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------
  const sendMessage = async () => {
    if (!newMessage.trim() || !ticket || !currentUser) return;
    setSending(true);
    try {
      const created = await TicketCommentsAPI.create({
        ticketId: ticket.id,
        userId: currentUser.id,
        userRole: currentUser.role,
        message: newMessage.trim(),
      });
      setComments((prev) => [...prev, created]);
      setNewMessage('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------
  const parentWricef = useMemo(
    () => findWricefObjectForItem(ticket?.wricefItemId),
    [ticket, findWricefObjectForItem]
  );

  const sortedHistory = useMemo(() => {
    if (!ticket?.history) return [];
    return [...ticket.history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [ticket?.history]);

  // -----------------------------------------------------------------------
  // Render – Loading / Not found
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">Ticket not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render – Main
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-4 pb-10">

      {/* ── Header bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {ticket.ticketCode}
            </Badge>
            <h1 className="text-xl font-bold text-foreground truncate">
              {isEditing && editForm ? editForm.title : ticket.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projectName(ticket.projectId)}
            {parentWricef && <> · Object: {parentWricef.wricefId} – {parentWricef.title}</>}
          </p>
        </div>

        {/* View / Edit toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={() => void saveChanges()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status badges row */}
      {!isEditing && (
        <div className="flex flex-wrap gap-2">
          <Badge className={statusColor[ticket.status]}>
            <span className="mr-1">{statusIcon[ticket.status]}</span>
            {TICKET_STATUS_LABELS[ticket.status]}
          </Badge>
          <Badge className={priorityColor[ticket.priority]}>{ticket.priority}</Badge>
          <Badge variant="outline">{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
          <Badge variant="outline">{SAP_MODULE_LABELS[ticket.module]}</Badge>
          <Badge variant="outline">{TICKET_COMPLEXITY_LABELS[ticket.complexity]}</Badge>
        </div>
      )}

      {/* Quick status change row (view mode only) */}
      {!isEditing && ticket.status !== 'DONE' && ticket.status !== 'REJECTED' && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-muted-foreground">Change status:</span>
          {STATUS_ORDER.filter((s) => s !== ticket.status).map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const updated = await TicketsAPI.update(ticket.id, { status: s });
                  setTicket(updated);
                  toast.success(`Status → ${TICKET_STATUS_LABELS[s]}`);
                } catch {
                  toast.error('Failed to change status');
                }
              }}
            >
              {statusIcon[s]}
              <span className="ml-1">{TICKET_STATUS_LABELS[s]}</span>
            </Button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          THREE-COLUMN LAYOUT
          Left  (col-span-1): Ticket Details
          Middle(col-span-1): Chat / Messages
          Right (col-span-1): Activity Feed
         ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ══ LEFT – Ticket Details ══ */}
        <Card className="xl:col-span-1 h-fit">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {isEditing ? <Pencil className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-primary" />}
              {isEditing ? 'Edit Details' : 'Ticket Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 space-y-4">

            {isEditing && editForm ? (
              /* ── EDIT MODE ── */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => p ? { ...p, title: e.target.value } : p)}
                    placeholder="Ticket title"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => p ? { ...p, description: e.target.value } : p)}
                    rows={3}
                    placeholder="Description…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => p ? { ...p, status: v as TicketStatus } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={editForm.priority} onValueChange={(v) => setEditForm((p) => p ? { ...p, priority: v as Priority } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nature</Label>
                    <Select value={editForm.nature} onValueChange={(v) => setEditForm((p) => p ? { ...p, nature: v as TicketNature } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_NATURE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Complexity</Label>
                    <Select value={editForm.complexity} onValueChange={(v) => setEditForm((p) => p ? { ...p, complexity: v as TicketComplexity } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['SIMPLE', 'MOYEN', 'COMPLEXE', 'TRES_COMPLEXE'].map((v) => (
                          <SelectItem key={v} value={v}>{TICKET_COMPLEXITY_LABELS[v as TicketComplexity]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>SAP Module</Label>
                    <Select value={editForm.module} onValueChange={(v) => setEditForm((p) => p ? { ...p, module: v as SAPModule } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SAP_MODULE_LABELS) as SAPModule[]).map((m) => (
                          <SelectItem key={m} value={m}>{SAP_MODULE_LABELS[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estimation (Days)</Label>
                    <Select value={String(editForm.estimationHours)}
                      onValueChange={(v) => setEditForm((p) => p ? { ...p, estimationHours: Number(v) } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[
                          { label: '0.5 day', hours: 4 },
                          { label: '1 day', hours: 8 },
                          { label: '1.5 days', hours: 12 },
                          { label: '2 days', hours: 16 },
                          { label: '3 days', hours: 24 },
                          { label: '4 days', hours: 32 },
                          { label: '5 days', hours: 40 },
                          { label: '7 days', hours: 56 },
                          { label: '10 days', hours: 80 },
                          { label: '15 days', hours: 120 },
                          { label: '20 days', hours: 160 },
                          { label: '30 days', hours: 240 },
                        ].map(({ label, hours }) => (
                          <SelectItem key={hours} value={String(hours)}>{label} ({hours}h)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Effort Logged (Days)</Label>
                    <Select value={String(editForm.effortHours)}
                      onValueChange={(v) => setEditForm((p) => p ? { ...p, effortHours: Number(v) } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[
                          { label: '0 days', hours: 0 },
                          { label: '0.5 day', hours: 4 },
                          { label: '1 day', hours: 8 },
                          { label: '1.5 days', hours: 12 },
                          { label: '2 days', hours: 16 },
                          { label: '3 days', hours: 24 },
                          { label: '4 days', hours: 32 },
                          { label: '5 days', hours: 40 },
                          { label: '7 days', hours: 56 },
                          { label: '10 days', hours: 80 },
                          { label: '15 days', hours: 120 },
                          { label: '20 days', hours: 160 },
                          { label: '30 days', hours: 240 },
                        ].map(({ label, hours }) => (
                          <SelectItem key={hours} value={String(hours)}>{label} ({hours}h)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={editForm.dueDate}
                      onChange={(e) => setEditForm((p) => p ? { ...p, dueDate: e.target.value } : p)} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Technical Consultant</Label>
                    <Select value={editForm.techConsultantId || '__none'}
                      onValueChange={(v) => setEditForm((p) => p ? { ...p, techConsultantId: v === '__none' ? '' : v } : p)}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Not assigned —</SelectItem>
                        {techConsultants.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Functional Consultant</Label>
                    <Select value={editForm.functionalConsultantId || '__none'}
                      onValueChange={(v) => setEditForm((p) => p ? { ...p, functionalConsultantId: v === '__none' ? '' : v } : p)}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Not assigned —</SelectItem>
                        {funcConsultants.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Effort Comment</Label>
                    <Textarea value={editForm.effortComment}
                      onChange={(e) => setEditForm((p) => p ? { ...p, effortComment: e.target.value } : p)}
                      rows={2} placeholder="Comment on effort…" />
                  </div>
                </div>
              </div>
            ) : (
              /* ── VIEW MODE ── */
              <div className="space-y-4">
                {ticket.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Description</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                  <Row label="Project" value={projectName(ticket.projectId)} />
                  <Row label="Object" value={parentWricef ? `${parentWricef.wricefId} – ${parentWricef.title}` : '—'} />
                  <Row label="Status">
                    <Badge className={statusColor[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                  </Row>
                  <Row label="Priority">
                    <Badge className={priorityColor[ticket.priority]}>{ticket.priority}</Badge>
                  </Row>
                  <Row label="Nature" value={TICKET_NATURE_LABELS[ticket.nature]} />
                  <Row label="Complexity" value={TICKET_COMPLEXITY_LABELS[ticket.complexity]} />
                  <Row label="Module" value={SAP_MODULE_LABELS[ticket.module]} />
                  <Row label="Due Date">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '—'}
                    </span>
                  </Row>
                  <Row label="Estimation" value={`${ticket.estimationHours / 8} day${ticket.estimationHours / 8 !== 1 ? 's' : ''} (${ticket.estimationHours}h)`} />
                  <Row label="Effort Logged" value={`${ticket.effortHours / 8} day${ticket.effortHours / 8 !== 1 ? 's' : ''} (${ticket.effortHours}h)`} />
                  {ticket.effortHours > 0 && ticket.estimationHours > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Est. vs Actual</p>
                      <p className={`text-sm font-semibold ${ticket.effortHours > ticket.estimationHours ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {((ticket.effortHours / ticket.estimationHours) * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                  <Separator className="col-span-2" />
                  <Row label="Tech Consultant" value={userName(ticket.techConsultantId)} />
                  <Row label="Func. Consultant" value={userName(ticket.functionalConsultantId)} />
                  <Row label="Created by" value={userName(ticket.createdBy)} />
                  <Row label="Created" value={new Date(ticket.createdAt).toLocaleDateString()} />
                  {ticket.effortComment && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Effort Comment</p>
                      <p className="text-sm text-foreground">{ticket.effortComment}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ MIDDLE – Chat / Messages ══ */}
        <Card className="xl:col-span-1 flex flex-col" style={{ minHeight: '520px' }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Discussion ({comments.length})
              <span className="ml-auto flex gap-2 text-[10px] font-normal text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Tech
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Func
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 pb-4 pt-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3 max-h-[380px]">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-10">
                  No messages yet. Start the conversation.
                </p>
              )}
              {comments.map((c) => {
                const role = c.userRole || '';
                const bubble = roleBubbleColor[role] || defaultBubble;
                const roleLabel = USER_ROLE_LABELS[role as UserRole] || role;
                const isMe = c.userId === currentUser?.id;
                return (
                  <div key={c.id} className={`flex ${isMe ? 'justify-end' : bubble.align}`}>
                    <div className={`rounded-xl px-4 py-2.5 max-w-[85%] border ${bubble.bg} space-y-0.5`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[11px] font-semibold ${bubble.name}`}>
                          {userName(c.userId)}
                          {roleLabel && <span className="ml-1 font-normal opacity-70">({roleLabel})</span>}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <Separator className="mb-3" />

            {/* Input */}
            <div className="flex gap-2 items-end">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                className="min-h-[60px] resize-none flex-1"
                rows={2}
              />
              <Button
                size="sm"
                className="h-10 px-4"
                disabled={!newMessage.trim() || sending}
                onClick={() => void sendMessage()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ══ RIGHT – Activity Feed ══ */}
        <Card className="xl:col-span-1 h-fit sticky top-4">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="max-h-[520px] overflow-y-auto pr-1 space-y-0">
              {sortedHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No activity yet.</p>
              ) : (
                sortedHistory.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative pl-6 pb-5 last:pb-0">
                    {/* Timeline line */}
                    {idx < sortedHistory.length - 1 && (
                      <div className="absolute left-[9px] top-5 w-px h-full bg-border" />
                    )}
                    {/* Icon dot */}
                    <div className="absolute left-0 top-0.5 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-background border border-border">
                      {eventIcon[evt.action] || <Activity className="h-3 w-3" />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(evt.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">{userName(evt.userId)}</span>
                        {evt.action === 'CREATED' && <span> created this ticket</span>}
                        {evt.action === 'STATUS_CHANGE' && (
                          <span>
                            {' '}changed status{' '}
                            <Badge variant="outline" className="text-[9px] mx-0.5 py-0">
                              {TICKET_STATUS_LABELS[evt.fromValue as TicketStatus] ?? evt.fromValue}
                            </Badge>
                            <ArrowRight className="inline h-3 w-3 mx-0.5 text-muted-foreground" />
                            <Badge variant="outline" className="text-[9px] mx-0.5 py-0">
                              {TICKET_STATUS_LABELS[evt.toValue as TicketStatus] ?? evt.toValue}
                            </Badge>
                          </span>
                        )}
                        {evt.action === 'ASSIGNED' && (
                          <span> assigned to <span className="font-medium">{userName(evt.toValue)}</span></span>
                        )}
                        {evt.action === 'PRIORITY_CHANGE' && (
                          <span>
                            {' '}changed priority{' '}
                            <Badge variant="outline" className="text-[9px] mx-0.5 py-0">{evt.fromValue}</Badge>
                            <ArrowRight className="inline h-3 w-3 mx-0.5 text-muted-foreground" />
                            <Badge variant="outline" className="text-[9px] mx-0.5 py-0">{evt.toValue}</Badge>
                          </span>
                        )}
                        {evt.action === 'EFFORT_CHANGE' && (
                          <span> logged effort: {evt.fromValue}h → {evt.toValue}h</span>
                        )}
                        {evt.action === 'SENT_TO_TEST' && <span> sent to test</span>}
                        {evt.action === 'COMMENT' && evt.comment && <span>: {evt.comment}</span>}
                      </div>
                      {evt.comment && evt.action !== 'COMMENT' && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{evt.comment}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Small helper: label+value row
// ---------------------------------------------------------------------------
function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {children ?? <p className="text-sm font-medium text-foreground">{value ?? '—'}</p>}
    </div>
  );
}
