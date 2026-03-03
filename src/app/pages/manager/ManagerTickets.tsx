import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/common/PageHeader';
import {
  NotificationsAPI,
  ProjectsAPI,
  TicketsAPI,
  WricefObjectsAPI,
  UsersAPI,
} from '../../services/odataClient';
import { Project, Ticket, TicketEvent, TicketStatus, TicketNature, WricefObject, User, TICKET_STATUS_LABELS, TICKET_NATURE_LABELS, USER_ROLE_LABELS, SAPModule, SAP_MODULE_LABELS, TicketComplexity, TICKET_COMPLEXITY_LABELS } from '../../types/entities';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, KanbanSquare, List, Plus, Filter } from 'lucide-react';
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
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'list' | 'calendar' | 'kanban';

interface TicketForm {
  projectId: string;
  assignedTo: string;
  priority: Ticket['priority'];
  nature: TicketNature;
  title: string;
  description: string;
  dueDate: string;
  wricefId: string;
  wricefItemId: string;
  module: SAPModule;
  estimationHours: number;
  complexity: TicketComplexity;
}

const EMPTY_FORM: TicketForm = {
  projectId: '',
  assignedTo: '',
  priority: 'MEDIUM',
  nature: 'PROGRAMME',
  title: '',
  description: '',
  dueDate: '',
  wricefId: '',
  wricefItemId: '',
  module: 'OTHER',
  estimationHours: 0,
  complexity: 'SIMPLE',
};

const STATUS_ORDER: TicketStatus[] = ['PENDING', 'NEW', 'IN_PROGRESS', 'IN_TEST', 'BLOCKED', 'DONE', 'REJECTED'];

const statusColor: Record<TicketStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ManagerTickets: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isViewOnly = currentUser?.role === 'PROJECT_MANAGER';
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState<TicketForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Ticket['status'] | 'ALL'>('ALL');
  const [moduleFilter, setModuleFilter] = useState<SAPModule | 'ALL'>('ALL');
  const [complexityFilter, setComplexityFilter] = useState<TicketComplexity | 'ALL'>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [wricefFilter, setWricefFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // WRICEF objects (loaded for object selection in ticket forms)
  const [wricefObjects, setWricefObjects] = useState<WricefObject[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectData, userData, ticketData] = await Promise.all([
        ProjectsAPI.getAll(),
        UsersAPI.getAll(),
        TicketsAPI.getAll(),
      ]);
      const wricefData = await WricefObjectsAPI.getAll();
      setProjects(projectData);
      setUsers(userData);
      setTickets(ticketData.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setWricefObjects(wricefData);
    } finally {
      setLoading(false);
    }
  };

  const userName = (id?: string) => users.find((u) => u.id === id)?.name ?? '-';
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
      if (moduleFilter !== 'ALL' && t.module !== moduleFilter) return false;
      if (complexityFilter !== 'ALL' && t.complexity !== complexityFilter) return false;
      if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false;
      if (assigneeFilter !== 'ALL' && t.assignedTo !== assigneeFilter) return false;
      if (wricefFilter && !wricefItemName(t.wricefItemId).toLowerCase().includes(wricefFilter.toLowerCase())) return false;
      if (dateFrom && t.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && t.createdAt.slice(0, 10) > dateTo) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.ticketCode.toLowerCase().includes(q) ||
          wricefItemName(t.wricefItemId).toLowerCase().includes(q) ||
          projectName(t.projectId).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, statusFilter, moduleFilter, complexityFilter, projectFilter, assigneeFilter, wricefFilter, dateFrom, dateTo, searchQuery, projects]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.projectId || !form.title.trim()) {
      toast.error('Project and title are required');
      return;
    }
    if (!form.wricefItemId) {
      toast.error('Please select an Object');
      return;
    }
    try {
      setIsSubmitting(true);
      const assignedUser = form.assignedTo ? users.find((u) => u.id === form.assignedTo) : undefined;
      const selectedWO = wricefObjects.find((o) => o.id === form.wricefId);
      const created = await TicketsAPI.create({
        projectId: form.projectId,
        createdBy: currentUser.id,
        assignedTo: form.assignedTo || undefined,
        assignedToRole: assignedUser?.role,
        priority: form.priority,
        nature: form.nature,
        status: currentUser.role === 'MANAGER' ? 'PENDING' : 'NEW',
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate || undefined,
        effortHours: 0,
        wricefItemId: form.wricefItemId,
        module: form.module,
        estimationHours: form.estimationHours,
        complexity: form.complexity,
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
      toast.success(`Status → ${newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ---------------------------------------------------------------------------
  // Calendar helpers
  // ---------------------------------------------------------------------------

  const calendarDays = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
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
        title="Tickets Management"
        subtitle="View, create, and manage all tickets across projects"
        breadcrumbs={[
          { label: 'Home', path: '/manager/dashboard' },
          { label: 'Tickets' },
        ]}
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search tickets, WRICEF, code..."
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

          <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as typeof moduleFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Modules</SelectItem>
              {(Object.keys(SAP_MODULE_LABELS) as SAPModule[]).map((m) => (
                <SelectItem key={m} value={m}>{SAP_MODULE_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={complexityFilter} onValueChange={(v) => setComplexityFilter(v as typeof complexityFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Complexity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Complexity</SelectItem>
              {(Object.keys(TICKET_COMPLEXITY_LABELS) as TicketComplexity[]).map((c) => (
                <SelectItem key={c} value={c}>{TICKET_COMPLEXITY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Assigned</SelectItem>
              {users.filter((u) => u.role !== 'ADMIN').map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Filter className="h-4 w-4 mr-1" /> {showAdvancedFilters ? 'Hide' : 'More'}
          </Button>

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
          {!isViewOnly && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" /> New Ticket
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Object ID..."
              value={wricefFilter}
              onChange={(e) => setWricefFilter(e.target.value)}
              className="w-36"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">From</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
              <span className="text-xs text-muted-foreground">To</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setProjectFilter('ALL'); setAssigneeFilter('ALL'); setWricefFilter(''); setDateFrom(''); setDateTo(''); setModuleFilter('ALL'); setComplexityFilter('ALL'); setStatusFilter('ALL'); }}>
              Clear All
            </Button>
          </div>
        )}

        {/* Views */}
        {loading ? (
          <p className="text-muted-foreground">Loading tickets...</p>
        ) : viewMode === 'list' ? (
          /* ---- LIST VIEW ---- */
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Title</TableHead>
                  <TableHead className="px-4">Object</TableHead>
                  <TableHead className="px-4">Module</TableHead>
                  <TableHead className="px-4">Complexity</TableHead>
                  <TableHead className="px-4">Nature</TableHead>
                  <TableHead className="px-4">Project</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4">Priority</TableHead>
                  <TableHead className="px-4">Est.</TableHead>
                  <TableHead className="px-4">Actual</TableHead>
                  <TableHead className="px-4">Due</TableHead>
                  <TableHead className="px-4">Assigned</TableHead>
                  <TableHead className="px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-accent/40" onClick={() => navigate(ticket.id)}>
                    <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">{ticket.ticketCode}</TableCell>
                    <TableCell className="px-4 py-3 font-medium max-w-[200px] truncate">{ticket.title}</TableCell>
                    <TableCell className="px-4 py-3 text-xs font-mono">{wricefItemName(ticket.wricefItemId)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{ticket.module}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] ${ticket.complexity === 'TRES_COMPLEXE' ? 'border-red-300 text-red-700 dark:text-red-400' : ticket.complexity === 'COMPLEXE' ? 'border-orange-300 text-orange-700 dark:text-orange-400' : ''}`}>
                        {TICKET_COMPLEXITY_LABELS[ticket.complexity]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline">{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{projectName(ticket.projectId)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={statusColor[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={priorityColor[ticket.priority]}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">{ticket.estimationHours}h</TableCell>
                    <TableCell className="px-4 py-3 text-sm">{ticket.effortHours}h</TableCell>
                    <TableCell className="px-4 py-3 text-sm">{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <div>{userName(ticket.assignedTo)}</div>
                      {ticket.assignedToRole && (
                        <span className="text-xs text-muted-foreground">{USER_ROLE_LABELS[ticket.assignedToRole]}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {!isViewOnly && ticket.status !== 'DONE' && ticket.status !== 'REJECTED' && (
                        <Button size="sm" variant="outline" onClick={() => void changeStatus(ticket, 'DONE')}>Done</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">No tickets found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : viewMode === 'calendar' ? (
          /* ---- CALENDAR VIEW ---- */
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <Button size="sm" variant="outline" onClick={prevMonth}>← Prev</Button>
              <h3 className="text-lg font-semibold">{calendarMonth}</h3>
              <Button size="sm" variant="outline" onClick={nextMonth}>Next →</Button>
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
                          toast.success(`Due date → ${cell.date}`);
                        });
                      }
                    }}
                    className={`min-h-[80px] bg-card p-1.5 ${!cell.isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-1">{cell.day}</div>
                    {dayTickets.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        draggable={!isViewOnly}
                        onDragStart={(e) => !isViewOnly && onDragStart(e, t.id)}
                        onClick={() => navigate(t.id)}
                        className={`mb-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 ${isViewOnly ? 'cursor-pointer' : 'cursor-grab'}`}
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
          /* ---- KANBAN VIEW ---- */
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STATUS_ORDER.map((status) => {
              const col = filteredTickets.filter((t) => t.status === status);
              return (
                <div
                  key={status}
                  className="min-w-[240px] flex-1 rounded-lg border bg-muted/30 p-3"
                  onDragOver={isViewOnly ? undefined : onDragOver}
                  onDrop={isViewOnly ? undefined : (e) => onDrop(e, status)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge className={statusColor[status]}>{status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">{col.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.map((ticket) => (
                      <div
                        key={ticket.id}
                        draggable={!isViewOnly}
                        onDragStart={(e) => !isViewOnly && onDragStart(e, ticket.id)}
                        onClick={() => navigate(ticket.id)}
                        className={`rounded-lg border bg-card p-3 shadow-sm hover:shadow transition ${isViewOnly ? 'cursor-pointer' : 'cursor-grab'}`}
                      >
                        <p className="text-sm font-medium text-foreground">{ticket.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge className={priorityColor[ticket.priority] + ' text-[10px]'}>{ticket.priority}</Badge>
                          <span className="text-[10px] text-muted-foreground">{userName(ticket.assignedTo)}</span>
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

      {/* ---- Create Ticket Dialog ---- */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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
              <Label>Assign To</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.role !== 'ADMIN').map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
                    .filter((o) => !form.projectId || o.projectId === form.projectId)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.wricefId} – {o.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module *</Label>
              <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v as SAPModule })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SAP_MODULE_LABELS) as SAPModule[]).map((m) => (
                    <SelectItem key={m} value={m}>{SAP_MODULE_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nature *</Label>
              <Select value={form.nature} onValueChange={(v) => setForm({ ...form, nature: v as TicketNature })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['WORKFLOW', 'FORMULAIRE', 'PROGRAMME', 'ENHANCEMENT', 'MODULE', 'REPORT'] as TicketNature[]).map((n) => (
                    <SelectItem key={n} value={n}>{TICKET_NATURE_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Complexity *</Label>
              <Select value={form.complexity} onValueChange={(v) => setForm({ ...form, complexity: v as TicketComplexity })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TICKET_COMPLEXITY_LABELS) as TicketComplexity[]).map((c) => (
                    <SelectItem key={c} value={c}>{TICKET_COMPLEXITY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimation (hours)</Label>
              <Input type="number" min={0} step={0.5} value={form.estimationHours} onChange={(e) => setForm({ ...form, estimationHours: Number(e.target.value) })} />
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>


    </div>
  );
};
