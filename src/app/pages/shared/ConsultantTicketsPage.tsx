import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/common/PageHeader';
import {
  ProjectsAPI,
  TicketsAPI,
  WricefObjectsAPI,
  TimeLogsAPI,
  UsersAPI,
} from '../../services/odataClient';
import {
  Project,
  Ticket,
  TicketEvent,
  WricefObject,
  TicketNature,
  TicketStatus,
  TimeLog,
  User,
  TICKET_NATURE_LABELS,
  TICKET_STATUS_LABELS,
  USER_ROLE_LABELS,
} from '../../types/entities';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FlaskConical,
  KanbanSquare,
  List,
  Plus,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ViewMode = 'list' | 'calendar' | 'kanban';

interface TicketForm {
  projectId: string;
  wricefId: string;
  wricefItemId: string;
  assignedTo: string;
  priority: Ticket['priority'];
  nature: TicketNature;
  title: string;
  description: string;
  dueDate: string;
}

const EMPTY_FORM: TicketForm = {
  projectId: '',
  wricefId: '',
  wricefItemId: '',
  assignedTo: '',
  priority: 'MEDIUM',
  nature: 'PROGRAMME',
  title: '',
  description: '',
  dueDate: '',
};

const STATUS_ORDER: TicketStatus[] = ['NEW', 'IN_PROGRESS', 'IN_TEST', 'BLOCKED', 'DONE', 'REJECTED'];

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

const natureColor: Record<TicketNature, string> = {
  WORKFLOW: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  FORMULAIRE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PROGRAMME: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  ENHANCEMENT: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  MODULE: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  REPORT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConsultantTicketsPageProps {
  /** Page title */
  title: string;
  /** Page subtitle */
  subtitle: string;
  /** Home breadcrumb path */
  homePath: string;
  /** Filter tickets to only those belonging to the current user */
  filterFn: (tickets: Ticket[], userId: string) => Ticket[];
}

// ---------------------------------------------------------------------------
// Shared Component
// ---------------------------------------------------------------------------

export const ConsultantTicketsPage: React.FC<ConsultantTicketsPageProps> = ({
  title,
  subtitle,
  homePath,
  filterFn,
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState<TicketForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Ticket['status'] | 'ALL'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // StraTIME imputation modal state
  const [showImputation, setShowImputation] = useState(false);
  const [imputationTicket, setImputationTicket] = useState<Ticket | null>(null);
  const [imputationDesc, setImputationDesc] = useState('');
  const [imputationDuration, setImputationDuration] = useState('');
  const [imputationDate, setImputationDate] = useState('');
  const [isSendingStraTIME, setIsSendingStraTIME] = useState(false);
  const [ticketTimeLogs, setTicketTimeLogs] = useState<TimeLog[]>([]);

  // Effort editing state for detail dialog
  const [editingEffort, setEditingEffort] = useState(false);
  const [effortValue, setEffortValue] = useState('');
  const [effortComment, setEffortComment] = useState('');

  // Time logs for badges - keyed by ticketId
  const [timeLogsMap, setTimeLogsMap] = useState<Record<string, TimeLog[]>>({});

  // WRICEF objects (loaded for object selection in ticket forms)
  const [wricefObjects, setWricefObjects] = useState<WricefObject[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    void loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectData, userData, ticketData, timeLogData] = await Promise.all([
        ProjectsAPI.getAll(),
        UsersAPI.getAll(),
        TicketsAPI.getAll(),
        TimeLogsAPI.getAll(),
      ]);
      const wricefData = await WricefObjectsAPI.getAll();
      setProjects(projectData);
      setUsers(userData);
      const filtered = filterFn(ticketData, currentUser!.id);
      setTickets(filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setWricefObjects(wricefData);

      // Build time-logs map per ticket
      const logsMap: Record<string, TimeLog[]> = {};
      timeLogData.forEach((tl) => {
        if (!logsMap[tl.ticketId]) logsMap[tl.ticketId] = [];
        logsMap[tl.ticketId].push(tl);
      });
      setTimeLogsMap(logsMap);
    } finally {
      setLoading(false);
    }
  };

  const userName = (id?: string) => users.find((u) => u.id === id)?.name ?? '-';
  const userRole = (id?: string) => {
    const u = users.find((u) => u.id === id);
    return u ? USER_ROLE_LABELS[u.role] : '-';
  };
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const wricefObjectName = (woId?: string) => {
    const wo = wricefObjects.find((o) => o.id === woId);
    return wo ? `${wo.wricefId} – ${wo.title}` : '';
  };
  const wricefItemName = (itemId?: string) => {
    for (const wo of wricefObjects) {
      const item = (wo.items || []).find((i) => i.id === itemId);
      if (item) return `${item.objectId} – ${item.title}`;
    }
    return '';
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          projectName(t.projectId).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, statusFilter, searchQuery, projects]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.projectId || !form.title.trim() || !form.wricefItemId) {
      toast.error('Project, Object, and title are required');
      return;
    }
    const selectedWO = wricefObjects.find((o) => o.id === form.wricefId);
    try {
      setIsSubmitting(true);
      const created = await TicketsAPI.create({
        projectId: form.projectId,
        wricefItemId: form.wricefItemId,
        createdBy: currentUser.id,
        assignedTo: form.assignedTo || undefined,
        priority: form.priority,
        nature: form.nature,
        status: 'NEW',
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate || undefined,
        assignedToRole: form.assignedTo
          ? users.find((u) => u.id === form.assignedTo)?.role
          : undefined,
        effortHours: 0,
        module: 'OTHER',
        complexity: 'SIMPLE',
        estimationHours: 0,
        history: [
          {
            id: `te${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            action: 'CREATED',
            comment: 'Ticket created',
          },
        ],
      });
      setTickets((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setShowCreate(false);
      toast.success('Ticket created successfully');
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeStatus = async (ticket: Ticket, newStatus: TicketStatus) => {
    if (!currentUser) return;
    const event: TicketEvent = {
      id: `te${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      action: 'STATUS_CHANGE',
      fromValue: ticket.status,
      toValue: newStatus,
    };

    try {
      const updated = await TicketsAPI.update(ticket.id, {
        status: newStatus,
        history: [...(ticket.history || []), event],
      });
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updated : t)));
      toast.success(`Status changed to ${TICKET_STATUS_LABELS[newStatus]}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const sendToTest = async (ticket: Ticket) => {
    if (!currentUser) return;
    const event: TicketEvent = {
      id: `te${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      action: 'SENT_TO_TEST',
      fromValue: ticket.status,
      toValue: 'IN_TEST',
      comment: `Effort: ${ticket.effortHours ?? 0}h transferred to functional testing`,
    };
    try {
      const updated = await TicketsAPI.update(ticket.id, {
        status: 'IN_TEST',
        history: [...(ticket.history || []), event],
      });
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updated : t)));
      toast.success('Ticket sent to functional testing');
    } catch {
      toast.error('Failed to send to test');
    }
  };

  const updateEffort = async (ticket: Ticket, hours: number, comment: string) => {
    if (!currentUser) return;
    const event: TicketEvent = {
      id: `te${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      action: 'EFFORT_CHANGE',
      fromValue: String(ticket.effortHours ?? 0),
      toValue: String(hours),
      comment: comment || undefined,
    };
    try {
      const updated = await TicketsAPI.update(ticket.id, {
        effortHours: hours,
        effortComment: comment || ticket.effortComment,
        history: [...(ticket.history || []), event],
      });
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updated : t)));
      setEditingEffort(false);
      toast.success('Effort hours updated');
    } catch {
      toast.error('Failed to update effort');
    }
  };

  // ---------------------------------------------------------------------------
  // StraTIME Imputation
  // ---------------------------------------------------------------------------

  const openImputation = useCallback(async (ticket: Ticket) => {
    const mins = Math.max(1, Math.round((ticket.effortHours ?? 0) * 60));
    setImputationTicket(ticket);
    setImputationDuration(String(mins));
    setImputationDate(new Date().toISOString().slice(0, 10));
    setImputationDesc(`Travail sur: ${ticket.title}`);
    setShowImputation(true);

    // Load ticket-specific time logs for the modal
    try {
      const logs = await TimeLogsAPI.getByTicket(ticket.id);
      setTicketTimeLogs(logs);
    } catch {
      setTicketTimeLogs([]);
    }
  }, []);

  const submitImputation = async () => {
    if (!imputationTicket || !currentUser) return;
    const duration = parseInt(imputationDuration, 10);
    if (!duration || duration <= 0) {
      toast.error('Duration must be positive');
      return;
    }
    try {
      setIsSendingStraTIME(true);
      const newLog = await TimeLogsAPI.create({
        consultantId: currentUser.id,
        ticketId: imputationTicket.id,
        projectId: imputationTicket.projectId,
        date: imputationDate,
        durationMinutes: duration,
        description: imputationDesc.trim(),
        sentToStraTIME: false,
      });
      // Immediately send to StraTIME (simulated)
      const sent = await TimeLogsAPI.sendToStraTIME(newLog.id);
      // Update local maps
      setTimeLogsMap((prev) => ({
        ...prev,
        [imputationTicket.id]: [...(prev[imputationTicket.id] || []), sent],
      }));
      setTicketTimeLogs((prev) => [...prev, sent]);
      toast.success('Imputation sent to StraTIME');
      setShowImputation(false);
    } catch {
      toast.error('Failed to send to StraTIME');
    } finally {
      setIsSendingStraTIME(false);
    }
  };

  // Check if ticket has all time logs sent to StraTIME
  const isFullyImputed = (ticketId: string): boolean => {
    const logs = timeLogsMap[ticketId];
    return !!logs && logs.length > 0 && logs.every((l) => l.sentToStraTIME);
  };

  const formatDurationShort = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    return `${m}min`;
  };

  // ---------------------------------------------------------------------------
  // Calendar helpers
  // ---------------------------------------------------------------------------

  const calendarDays = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = -startOffset; i <= lastDay.getDate() + (6 - ((lastDay.getDay() + 6) % 7)); i++) {
      const d = new Date(y, m - 1, i + 1);
      days.push({
        date: d.toISOString().slice(0, 10),
        day: d.getDate(),
        isCurrentMonth: d.getMonth() === m - 1,
      });
    }
    return days;
  }, [calendarMonth]);

  const ticketsByDate = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    filteredTickets.forEach((t) => {
      const dateKey = t.dueDate || t.createdAt.slice(0, 10);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(t);
    });
    return map;
  }, [filteredTickets]);

  const prevMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // ---------------------------------------------------------------------------
  // Kanban drag/drop (native HTML5)
  // ---------------------------------------------------------------------------

  const onDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const onDrop = (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket && ticket.status !== targetStatus) {
      void changeStatus(ticket, targetStatus);
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[
          { label: 'Home', path: homePath },
          { label: 'Tickets' },
        ]}
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-60"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {([['list', List], ['calendar', CalendarDays], ['kanban', KanbanSquare]] as const).map(
              ([mode, Icon]) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  onClick={() => setViewMode(mode as ViewMode)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            )}
          </div>

          <div className="flex-1" />
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4" /> New Ticket
          </Button>
        </div>

        {/* Views */}
        {loading ? (
          <p className="text-muted-foreground">Loading tickets...</p>
        ) : viewMode === 'list' ? (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-4">Title</TableHead>
                  <TableHead className="px-4">Project</TableHead>
                  <TableHead className="px-4">Object</TableHead>
                  <TableHead className="px-4">Nature</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4">Priority</TableHead>
                  <TableHead className="px-4">Effort</TableHead>
                  <TableHead className="px-4">Due</TableHead>
                  <TableHead className="px-4">Assigned</TableHead>
                  <TableHead className="px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-accent/40" onClick={() => navigate(ticket.id)}>
                    <TableCell className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {ticket.title}
                        {isFullyImputed(ticket.id) && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Impute</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{projectName(ticket.projectId)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {ticket.wricefItemId && wricefItemName(ticket.wricefItemId) ? (
                        <Badge variant="outline" className="text-xs">{wricefItemName(ticket.wricefItemId)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={natureColor[ticket.nature]}>{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={statusColor[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={priorityColor[ticket.priority]}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {(ticket.effortHours ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {ticket.effortHours}h
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <div>{userName(ticket.assignedTo)}</div>
                      {ticket.assignedToRole && (
                        <div className="text-[10px] text-muted-foreground">{USER_ROLE_LABELS[ticket.assignedToRole]}</div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {ticket.status === 'IN_PROGRESS' && (
                          <Button size="sm" variant="outline" className="text-purple-600 border-purple-300" onClick={() => void sendToTest(ticket)}>
                            <FlaskConical className="h-3 w-3 mr-1" /> Test
                          </Button>
                        )}
                        {ticket.status !== 'DONE' && ticket.status !== 'REJECTED' && (
                          <Button size="sm" variant="outline" onClick={() => void changeStatus(ticket, 'DONE')}>Done</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No tickets found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <Button size="sm" variant="outline" onClick={prevMonth}>Prev</Button>
              <h3 className="text-lg font-semibold">{calendarMonth}</h3>
              <Button size="sm" variant="outline" onClick={nextMonth}>Next</Button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
              {calendarDays.map((cell) => {
                const dayTickets = ticketsByDate[cell.date] || [];
                return (
                  <div
                    key={cell.date}
                    onDragOver={onDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      const ticketId = e.dataTransfer.getData('text/plain');
                      const ticket = tickets.find((t) => t.id === ticketId);
                      if (ticket) {
                        void TicketsAPI.update(ticket.id, { dueDate: cell.date }).then((upd) => {
                          setTickets((prev) => prev.map((t) => (t.id === upd.id ? upd : t)));
                          toast.success(`Due date set to ${cell.date}`);
                        });
                      }
                    }}
                    className={`min-h-[80px] bg-card p-1.5 ${!cell.isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-1">{cell.day}</div>
                    {dayTickets.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, t.id)}
                        onClick={() => navigate(t.id)}
                        className="mb-0.5 cursor-grab truncate rounded px-1 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTickets.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayTickets.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STATUS_ORDER.map((status) => {
              const col = filteredTickets.filter((t) => t.status === status);
              return (
                <div
                  key={status}
                  className="min-w-[240px] flex-1 rounded-lg border bg-muted/30 p-3"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, status)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge className={statusColor[status]}>{TICKET_STATUS_LABELS[status]}</Badge>
                    <span className="text-xs text-muted-foreground">{col.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.map((ticket) => (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, ticket.id)}
                        onClick={() => navigate(ticket.id)}
                        className="cursor-grab rounded-lg border bg-card p-3 shadow-sm hover:shadow transition"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-medium text-foreground">{ticket.title}</p>
                          {isFullyImputed(ticket.id) && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex gap-1">
                            <Badge className={priorityColor[ticket.priority] + ' text-[10px]'}>{ticket.priority}</Badge>
                            <Badge className={natureColor[ticket.nature] + ' text-[10px]'}>{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {(ticket.effortHours ?? 0) > 0 && (
                              <span className="text-[10px] font-mono flex items-center gap-0.5 text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                {ticket.effortHours}h
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{userName(ticket.assignedTo)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void submitTicket(e)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v, wricefId: '', wricefItemId: '' })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Object *</Label>
              <Select value={form.wricefId} onValueChange={(v) => {
                const firstItem = wricefObjects.find((w) => w.id === v)?.items?.[0];
                setForm({ ...form, wricefId: v, wricefItemId: firstItem?.id ?? '' });
              }} disabled={!form.projectId}>
                <SelectTrigger><SelectValue placeholder={form.projectId ? 'Select Object' : 'Select project first'} /></SelectTrigger>
                <SelectContent>
                  {wricefObjects
                    .filter((o) => o.projectId === form.projectId)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.wricefId} – {o.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.role !== 'ADMIN' && u.role !== 'MANAGER').map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({USER_ROLE_LABELS[u.role]})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nature *</Label>
              <Select value={form.nature} onValueChange={(v) => setForm({ ...form, nature: v as TicketNature })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TICKET_NATURE_LABELS) as [TicketNature, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Ticket['priority'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* StraTIME Imputation Modal */}
      <Dialog open={showImputation} onOpenChange={setShowImputation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" /> Imputation StraTIME
            </DialogTitle>
          </DialogHeader>
          {imputationTicket && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Ticket:</span> {imputationTicket.title}</div>
                <div><span className="text-muted-foreground">Projet:</span> {projectName(imputationTicket.projectId)}</div>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={imputationDate} onChange={(e) => setImputationDate(e.target.value)} />
              </div>
              <div>
                <Label>Duree (minutes)</Label>
                <Input type="number" min={1} value={imputationDuration} onChange={(e) => setImputationDuration(e.target.value)} />
                {imputationDuration && (
                  <p className="text-xs text-muted-foreground mt-1">
                    = {formatDurationShort(parseInt(imputationDuration, 10) * 60)}
                  </p>
                )}
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={imputationDesc} onChange={(e) => setImputationDesc(e.target.value)} rows={2} />
              </div>

              {/* Previous logs for this ticket */}
              {ticketTimeLogs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Imputations precedentes</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {ticketTimeLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                        <span>{log.date} - {log.durationMinutes}min</span>
                        {log.sentToStraTIME ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[9px]">Sent</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px]">Draft</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowImputation(false)}>Cancel</Button>
                <Button
                  onClick={() => void submitImputation()}
                  disabled={isSendingStraTIME}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSendingStraTIME ? (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 animate-spin" /> Sending...</span>
                  ) : (
                    <span className="flex items-center gap-1"><Send className="h-3 w-3" /> Send to StraTIME</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
};
