import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../components/common/PageHeader';
import { AbaqueEstimatorCard } from '../../components/business/AbaqueEstimatorCard';
import {
  AllocationsAPI,
  AbaquesAPI,
  DeliverablesAPI,
  ProjectsAPI,
  TasksAPI,
  TicketsAPI,
  UsersAPI,
  WricefObjectsAPI,
  WricefItemsAPI,
  BackendUsersAPI,
} from '../../services/odataClient';
import {
  ABAQUE_TASK_NATURE_LABELS,
  Abaque,
  AbaqueComplexity,
  Allocation,
  Deliverable,
  Project,
  ProjectAbaqueCriteria,
  AbaqueEstimateResult,
  Task,
  Ticket,
  TicketNature,
  User,
  TICKET_NATURE_LABELS,
  WricefObject,
  WricefItem,
  WricefType,
  WRICEF_TYPE_LABELS,
  WRICEF_TYPE_COLORS,
  SAP_MODULE_LABELS,
  DocumentationObject,
} from '../../types/entities';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Calculator,
  Scale,
  Upload,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Package,
  FileText,
  Ticket as TicketIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
  Eye,
} from 'lucide-react';

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

interface ProjectTicketForm {
  title: string;
  description: string;
  nature: TicketNature;
  priority: Ticket['priority'];
  complexity: AbaqueComplexity;
  effortHours: number;
  estimationHours: number;
  dueDate: string;
  wricefId: string;
  wricefItemId: string;
  /** ID of the technical consultant to assign */
  techConsultantId: string;
  /** ID of the functional consultant to assign */
  functionalConsultantId: string;
}

const EMPTY_TICKET_FORM: ProjectTicketForm = {
  title: '',
  description: '',
  nature: 'PROGRAMME',
  priority: 'MEDIUM',
  complexity: 'MEDIUM',
  effortHours: 8,
  estimationHours: 8,
  dueDate: '',
  wricefId: '',
  wricefItemId: '',
  techConsultantId: '',
  functionalConsultantId: '',
};

const TICKET_COMPLEXITY_BY_ABAQUE: Record<AbaqueComplexity, Ticket['complexity']> = {
  LOW: 'SIMPLE',
  MEDIUM: 'MOYEN',
  HIGH: 'COMPLEXE',
};

type TabKey = 'overview' | 'wricef' | 'tasks' | 'team' | 'kpi' | 'docs' | 'abaque';
const PROJECT_TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'wricef', label: 'Objects' },
  { key: 'tasks', label: 'Tickets' },
  { key: 'team', label: 'Team & Allocation' },
  { key: 'kpi', label: 'KPI Report' },
  { key: 'docs', label: 'Documentation' },
  { key: 'abaque', label: 'Abaques' },
];

const COMPLEXITY_COLORS: Record<string, string> = {
  SIMPLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  MOYEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLEXE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  TRES_COMPLEXE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  NEW: { icon: AlertCircle, color: 'text-blue-500', label: 'New' },
  IN_PROGRESS: { icon: Loader2, color: 'text-amber-500', label: 'In Progress' },
  RESOLVED: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Resolved' },
  DONE: { icon: CheckCircle2, color: 'text-emerald-600', label: 'Done' },
  REJECTED: { icon: AlertCircle, color: 'text-red-500', label: 'Rejected' },
  BLOCKED: { icon: AlertCircle, color: 'text-orange-500', label: 'Blocked' },
};

export const ProjectDetails: React.FC = () => {
  const { currentUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [abaques, setAbaques] = useState<Abaque[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [docText, setDocText] = useState('');
  const [docSaving, setDocSaving] = useState(false);
  const [abaqueSaving, setAbaqueSaving] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState<ProjectTicketForm>(EMPTY_TICKET_FORM);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isEstimatedByAbaque, setIsEstimatedByAbaque] = useState(false);
  const [projectEstimateSaving, setProjectEstimateSaving] = useState(false);
  const [forceEstimatorVisible, setForceEstimatorVisible] = useState(false);

  // WRICEF state
  const [wricefObjects, setWricefObjects] = useState<WricefObject[]>([]);
  const [expandedWricef, setExpandedWricef] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [showAddWricefRow, setShowAddWricefRow] = useState(false);
  const [newWricef, setNewWricef] = useState({ wricefId: '', title: '', description: '', complexity: 'MOYEN', type: '' as string, module: 'OTHER' });
  const [addingWricef, setAddingWricef] = useState(false);
  const [addingItemForWricef, setAddingItemForWricef] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ objectId: '', title: '', description: '' });
  const [savingItem, setSavingItem] = useState(false);
  // Inline ticket creation from within expanded WRICEF row – now opens full modal
  const [showInlineTicketForWricef, setShowInlineTicketForWricef] = useState<string | null>(null);
  const [inlineTicketForm, setInlineTicketForm] = useState({
    title: '',
    nature: 'PROGRAMME' as TicketNature,
    complexity: 'MOYEN' as Ticket['complexity'],
    priority: 'MEDIUM' as Ticket['priority'],
    description: '',
    effortHours: 0,
    estimationHours: 0,
    dueDate: '',
    techConsultantId: '',
    functionalConsultantId: '',
  });
  const [creatingInlineTicket, setCreatingInlineTicket] = useState(false);
  // Consultant lists fetched from the backend
  const [techConsultants, setTechConsultants] = useState<User[]>([]);
  const [funcConsultants, setFuncConsultants] = useState<User[]>([]);
  // "Create New Object" mini-dialog (triggered from ticket creation form)
  const [showCreateObjectInTicket, setShowCreateObjectInTicket] = useState(false);
  const [newObjectInTicketForm, setNewObjectInTicketForm] = useState({
    wricefId: '',
    title: '',
    description: '',
    complexity: 'MOYEN',
    type: '' as string,
    module: 'OTHER',
  });
  const [creatingObjectInTicket, setCreatingObjectInTicket] = useState(false);

  const roleBasePath = currentUser?.role === 'PROJECT_MANAGER' ? '/project-manager' : '/manager';

  useEffect(() => {
    if (!id) return;
    void loadProjectData(id);
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    try {
      const [p, taskData, allocationData, userData, deliverableData, ticketData, abaqueData, wricefData, techList, funcList] =
        await Promise.all([
          ProjectsAPI.getById(projectId),
          TasksAPI.getByProject(projectId),
          AllocationsAPI.getAll(),
          UsersAPI.getAll(),
          DeliverablesAPI.getAll(),
          TicketsAPI.getAll(),
          AbaquesAPI.getAll(),
          WricefObjectsAPI.getByProject(projectId),
          BackendUsersAPI.getTechConsultants().catch(() => [] as User[]),
          BackendUsersAPI.getFunctionalConsultants().catch(() => [] as User[]),
        ]);

      if (!p) {
        toast.error('Project not found');
        navigate(`${roleBasePath}/projects`, { replace: true });
        return;
      }

      setProject(p);
      setDocText(p.documentation || '');
      setTasks(taskData);
      setAllocations(allocationData.filter((a) => a.projectId === projectId));
      setUsers(userData);
      setDeliverables(deliverableData.filter((d) => d.projectId === projectId));
      setTickets(ticketData.filter((t) => t.projectId === projectId));
      setAbaques(abaqueData);
      setWricefObjects(wricefData);
      setTechConsultants(techList);
      setFuncConsultants(funcList);
      setForceEstimatorVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const manager = useMemo(() => {
    if (!project) return null;
    return users.find((u) => u.id === project.managerId) ?? null;
  }, [project, users]);

  const kpis = useMemo(() => {
    if (!tasks.length) {
      return {
        onTrack: 0,
        late: 0,
        blocked: 0,
        completed: 0,
        critical: 0,
        productivity: 0,
      };
    }

    const late = tasks.filter(
      (task) => task.status !== 'DONE' && new Date(task.plannedEnd) < new Date()
    ).length;
    const blocked = tasks.filter((task) => task.status === 'BLOCKED').length;
    const completed = tasks.filter((task) => task.status === 'DONE').length;
    const critical = tasks.filter((task) => task.isCritical).length;
    const onTrack = tasks.length - late - blocked;
    const productivity =
      tasks.reduce((sum, task) => sum + task.progressPercent, 0) / tasks.length;

    return { onTrack, late, blocked, completed, critical, productivity };
  }, [tasks]);

  const totalActualHours = useMemo(
    () => tasks.reduce((sum, task) => sum + task.actualHours, 0),
    [tasks]
  );
  const totalEstimatedHours = useMemo(
    () => tasks.reduce((sum, task) => sum + task.estimatedHours, 0),
    [tasks]
  );
  const totalActualDays = useMemo(() => totalActualHours / 8, [totalActualHours]);
  const hasAbaqueEstimate = Boolean(project?.abaqueEstimate);
  const estimatedDays = project?.abaqueEstimate?.result.estimatedConsultingDays ?? 0;
  const estimateConsumptionPercent = estimatedDays
    ? Math.round((totalActualDays / estimatedDays) * 100)
    : 0;
  const estimateDeltaDays = estimatedDays - totalActualDays;
  const riskBadgeClass =
    project?.abaqueEstimate?.result.riskLevel === 'HIGH'
      ? 'bg-destructive text-white border-transparent'
      : project?.abaqueEstimate?.result.riskLevel === 'MEDIUM'
        ? 'bg-amber-500 text-white border-transparent'
        : 'bg-emerald-600 text-white border-transparent';
  const usageBarClass =
    estimateConsumptionPercent > 100
      ? 'bg-destructive'
      : estimateConsumptionPercent > 80
        ? 'bg-amber-500'
        : 'bg-emerald-600';

  const applyProjectEstimate = async (
    criteria: ProjectAbaqueCriteria,
    result: AbaqueEstimateResult
  ) => {
    if (!project || !currentUser) return;
    try {
      setProjectEstimateSaving(true);
      const updated = await ProjectsAPI.update(project.id, {
        complexity: result.complexity,
        abaqueEstimate: {
          criteria,
          result,
          estimatedAt: new Date().toISOString(),
          estimatedBy: currentUser.id,
        },
      });
      setProject(updated);
      setForceEstimatorVisible(false);
      toast.success('Abaque estimate applied to project');
    } catch {
      toast.error('Failed to apply project estimate');
    } finally {
      setProjectEstimateSaving(false);
    }
  };

  const selectedAbaque = useMemo(
    () => abaques.find((abaque) => abaque.id === project?.linkedAbaqueId) ?? null,
    [abaques, project?.linkedAbaqueId]
  );

  const abaqueTaskNatures = useMemo(() => {
    if (!selectedAbaque) return [];
    return [...new Set(selectedAbaque.entries.map((entry) => entry.taskNature))];
  }, [selectedAbaque]);

  const getAbaqueEstimate = (
    abaque: Abaque,
    taskNature: TicketNature,
    complexity: AbaqueComplexity
  ): number | null => {
    const direct = abaque.entries.find(
      (entry) => entry.taskNature === taskNature && entry.complexity === complexity
    );
    if (direct) return direct.standardHours;

    const fallbackByNature: Record<TicketNature, 'FEATURE' | 'DOCUMENTATION' | 'SUPPORT'> = {
      PROGRAMME: 'FEATURE',
      MODULE: 'FEATURE',
      ENHANCEMENT: 'FEATURE',
      FORMULAIRE: 'DOCUMENTATION',
      REPORT: 'DOCUMENTATION',
      WORKFLOW: 'SUPPORT',
    };
    const fallback = fallbackByNature[taskNature];
    return (
      abaque.entries.find(
        (entry) => entry.taskNature === fallback && entry.complexity === complexity
      )?.standardHours ?? null
    );
  };

  const applyAbaqueEstimate = () => {
    if (!selectedAbaque) {
      toast.error('No abaque linked to this project');
      return;
    }
    const estimate = getAbaqueEstimate(
      selectedAbaque,
      ticketForm.nature,
      ticketForm.complexity
    );
    if (estimate === null) {
      toast.error('No matching abaque entry for selected nature and complexity');
      return;
    }
    setTicketForm((prev) => ({ ...prev, effortHours: estimate }));
    setIsEstimatedByAbaque(true);
    toast.success('Effort pre-filled from project abaque');
  };

  const updateProjectAbaque = async (linkedAbaqueId: string) => {
    if (!project) return;
    try {
      setAbaqueSaving(true);
      const normalized = linkedAbaqueId === '__none' ? undefined : linkedAbaqueId;
      const updated = await ProjectsAPI.update(project.id, {
        linkedAbaqueId: normalized,
      });
      setProject(updated);
      toast.success('Project abaque configuration updated');
    } catch {
      toast.error('Failed to update project configuration');
    } finally {
      setAbaqueSaving(false);
    }
  };

  const createProjectTicket = async () => {
    if (!project || !currentUser) return;
    if (!ticketForm.title.trim()) {
      toast.error('Ticket title is required');
      return;
    }
    if (ticketForm.effortHours <= 0) {
      toast.error('Effort hours must be greater than 0');
      return;
    }

    try {
      setIsCreatingTicket(true);
      const created = await TicketsAPI.create({
        projectId: project.id,
        createdBy: currentUser.id,
        assignedTo: ticketForm.techConsultantId || undefined,
        assignedToRole: ticketForm.techConsultantId ? 'CONSULTANT_TECHNIQUE' : undefined,
        techConsultantId: ticketForm.techConsultantId || undefined,
        functionalConsultantId: ticketForm.functionalConsultantId || undefined,
        priority: ticketForm.priority,
        nature: ticketForm.nature,
        status: 'NEW',
        title: ticketForm.title.trim(),
        description: ticketForm.description.trim(),
        dueDate: ticketForm.dueDate || undefined,
        effortHours: ticketForm.effortHours,
        wricefItemId: ticketForm.wricefItemId || '',
        module: 'OTHER',
        estimationHours: ticketForm.estimationHours,
        complexity: TICKET_COMPLEXITY_BY_ABAQUE[ticketForm.complexity],
        estimatedViaAbaque: isEstimatedByAbaque,
        history: [
          {
            id: `te${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            action: 'CREATED',
            comment: isEstimatedByAbaque
              ? 'Ticket created with abaque-based estimation'
              : 'Ticket created with manual estimation',
          },
        ],
      });
      setTickets((prev) => [created, ...prev]);
      setTicketForm(EMPTY_TICKET_FORM);
      setIsEstimatedByAbaque(false);
      setShowCreateTicket(false);
      toast.success('Ticket created');
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    try {
      const updated = await TasksAPI.update(taskId, patch);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tabKey: TabKey) => {
    const currentIndex = PROJECT_TABS.findIndex((tab) => tab.key === tabKey);
    if (currentIndex === -1) return;

    const moveFocusTo = (nextIndex: number) => {
      const nextTab = PROJECT_TABS[nextIndex];
      setActiveTab(nextTab.key);
      queueMicrotask(() => {
        const target = document.getElementById(`project-tab-${nextTab.key}`);
        target?.focus();
      });
    };

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocusTo((currentIndex + 1) % PROJECT_TABS.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocusTo((currentIndex - 1 + PROJECT_TABS.length) % PROJECT_TABS.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveFocusTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveFocusTo(PROJECT_TABS.length - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-8 text-muted-foreground">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={project.name}
        subtitle="Project cockpit with overview, tasks, team and documentation"
        breadcrumbs={[
          { label: 'Home', path: `${roleBasePath}/dashboard` },
          { label: 'Projects', path: `${roleBasePath}/projects` },
          { label: project.name },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="overflow-x-auto">
          <div role="tablist" aria-label="Project detail sections" className="flex min-w-max gap-2">
            {PROJECT_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`project-tab-${tab.key}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`project-panel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded border px-4 py-2 text-sm whitespace-nowrap ${isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-accent'
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <section
              id="project-panel-overview"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby="project-tab-overview"
              className="grid grid-cols-1 gap-6 lg:grid-cols-3"
            >
              <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Project Snapshot</h3>
                <p className="text-sm text-muted-foreground">{project.description}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="p-3 rounded border border-border">
                    <div className="text-xs text-muted-foreground">Manager</div>
                    <div className="font-medium text-foreground">{manager?.name ?? 'Unknown'}</div>
                  </div>
                  <div className="p-3 rounded border border-border">
                    <div className="text-xs text-muted-foreground">Budget</div>
                    <div className="font-medium text-foreground">
                      ${project.budget?.toLocaleString() ?? 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 rounded border border-border">
                    <div className="text-xs text-muted-foreground">Start Date</div>
                    <div className="font-medium text-foreground">
                      {new Date(project.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="p-3 rounded border border-border">
                    <div className="text-xs text-muted-foreground">End Date</div>
                    <div className="font-medium text-foreground">
                      {new Date(project.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Global Progress</span>
                    <span className="font-medium text-foreground">{project.progress ?? 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{ width: `${project.progress ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Live Metrics</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks</span>
                  <span className="font-medium text-foreground">{tasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deliverables</span>
                  <span className="font-medium text-foreground">{deliverables.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open Tickets</span>
                  <span className="font-medium text-foreground">
                    {tickets.filter((ticket) => ticket.status !== 'DONE' && ticket.status !== 'REJECTED').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Critical Tasks</span>
                  <span className="font-medium text-destructive">{kpis.critical}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Blocked</span>
                  <span className="font-medium text-accent-foreground">{kpis.blocked}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'abaque' && (
          <section
            id="project-panel-abaque"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="project-tab-abaque"
            className="space-y-6"
          >
            {/* Abaque Configuration */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-5 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Configuration</h3>
                  </div>
                  <Badge variant="outline">Abaques de Chiffrage</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-abaque-select">Linked Abaque</Label>
                  <Select
                    value={project.linkedAbaqueId ?? '__none'}
                    onValueChange={(value) => void updateProjectAbaque(value)}
                    disabled={abaqueSaving}
                  >
                    <SelectTrigger id="project-abaque-select" className="max-w-lg">
                      <SelectValue placeholder="Select an estimation abaque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No linked abaque</SelectItem>
                      {abaques.map((abaque) => (
                        <SelectItem key={abaque.id} value={abaque.id}>
                          {abaque.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This matrix will be used as the default standard for ticket estimation in this project.
                  </p>
                </div>

                {!selectedAbaque ? (
                  <p className="text-sm text-muted-foreground">No abaque selected for this project.</p>
                ) : (
                  <div className="rounded-lg border border-border/70 bg-surface-2 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/55">
                        <TableRow>
                          <TableHead className="px-4">Task Nature</TableHead>
                          <TableHead className="px-4">Low</TableHead>
                          <TableHead className="px-4">Medium</TableHead>
                          <TableHead className="px-4">High</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abaqueTaskNatures.map((taskNature) => {
                          const low = selectedAbaque.entries.find(
                            (entry) =>
                              entry.taskNature === taskNature && entry.complexity === 'LOW'
                          )?.standardHours;
                          const medium = selectedAbaque.entries.find(
                            (entry) =>
                              entry.taskNature === taskNature && entry.complexity === 'MEDIUM'
                          )?.standardHours;
                          const high = selectedAbaque.entries.find(
                            (entry) =>
                              entry.taskNature === taskNature && entry.complexity === 'HIGH'
                          )?.standardHours;
                          return (
                            <TableRow key={taskNature}>
                              <TableCell className="px-4 py-3">
                                <Badge variant="secondary">
                                  {ABAQUE_TASK_NATURE_LABELS[taskNature]}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-sm font-semibold">{low ?? '-'}</TableCell>
                              <TableCell className="px-4 py-3 text-sm font-semibold">{medium ?? '-'}</TableCell>
                              <TableCell className="px-4 py-3 text-sm font-semibold">{high ?? '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Smart Ticket Estimation</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create project tickets with standardized effort using the linked abaque matrix.
                </p>
                <div className="rounded border border-border p-3 text-sm space-y-1">
                  <div className="text-muted-foreground">Current Abaque</div>
                  <div className="font-medium text-foreground">
                    {selectedAbaque?.name ?? 'No linked abaque'}
                  </div>
                </div>
                <Button onClick={() => setShowCreateTicket(true)} className="w-full">
                  <Calculator className="h-4 w-4 mr-1" />
                  Create Ticket
                </Button>
              </div>
            </div>

            {/* Abaque Estimator */}
            {!hasAbaqueEstimate || forceEstimatorVisible ? (
              <AbaqueEstimatorCard
                initialCriteria={project.abaqueEstimate?.criteria}
                applying={projectEstimateSaving}
                onApply={applyProjectEstimate}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Estimated Consulting Days</div>
                    <div className="mt-1 text-3xl font-semibold text-foreground">
                      {estimatedDays}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Actual Tracked Days</div>
                    <div className="mt-1 text-3xl font-semibold text-foreground">
                      {totalActualDays.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({totalActualHours.toFixed(1)}h logged)
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Budget Bracket</div>
                    <div className="mt-1 text-xl font-semibold text-foreground">
                      {project.abaqueEstimate?.result.budgetBracket}
                    </div>
                    <Badge className={`mt-2 ${riskBadgeClass}`}>
                      {project.abaqueEstimate?.result.riskLevel} risk
                    </Badge>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Recommended Team</div>
                    <div className="mt-1 text-3xl font-semibold text-foreground">
                      {project.abaqueEstimate?.result.recommendedTeamSize}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Complexity {project.abaqueEstimate?.result.complexity}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Initial Estimate vs Current Execution
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Compare real tracked effort with the initial abaque baseline.
                      </p>
                    </div>
                    <Badge variant="outline">
                      Estimated on{' '}
                      {project.abaqueEstimate?.estimatedAt
                        ? new Date(project.abaqueEstimate.estimatedAt).toLocaleDateString()
                        : '-'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Consumption of estimated days</span>
                      <span className="font-semibold text-foreground">
                        {estimateConsumptionPercent}% used
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${usageBarClass}`}
                        style={{ width: `${Math.min(estimateConsumptionPercent, 100)}%` }}
                      />
                    </div>
                    <p
                      className={`text-sm font-medium ${estimateDeltaDays < 0 ? 'text-destructive' : 'text-emerald-600'
                        }`}
                    >
                      {estimateDeltaDays >= 0 ? '+' : ''}
                      {estimateDeltaDays.toFixed(1)} days vs baseline remaining
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Modules in Scope</div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {project.abaqueEstimate?.criteria.modulesInvolved.join(', ') || '-'}
                      </div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Countries</div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {project.abaqueEstimate?.criteria.numberOfCountries}
                      </div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Customization</div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {project.abaqueEstimate?.criteria.customizationLevel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setForceEstimatorVisible(true)}>
                    Re-run Estimation
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'wricef' && (
          <section
            id="project-panel-wricef"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="project-tab-wricef"
            className="space-y-6"
          >
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Objects</div>
                <div className="text-2xl font-bold text-foreground">{wricefObjects.length}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Tickets</div>
                <div className="text-2xl font-bold text-foreground">
                  {wricefObjects.reduce((sum, wo) => sum + (wo.items?.reduce((s, it) => s + (it.tickets?.length ?? 0), 0) ?? 0), 0)}
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Documents</div>
                <div className="text-2xl font-bold text-foreground">
                  {wricefObjects.reduce((sum, wo) => sum + (wo.documents?.length ?? 0), 0)}
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Objects ({wricefObjects.length})
                </h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAddWricefRow(true); setNewWricef({ wricefId: '', title: '', description: '', complexity: 'MOYEN', type: '', module: 'OTHER' }); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Object
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowExcelUpload(true)}>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload WRICEF
                </Button>
              </div>
            </div>

            {/* WRICEF Table */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="px-4 w-10"></TableHead>
                    <TableHead className="px-4">Object ID</TableHead>
                    <TableHead className="px-4">Type</TableHead>
                    <TableHead className="px-4">Title</TableHead>
                    <TableHead className="px-4">Complexity</TableHead>
                    <TableHead className="px-4">Module</TableHead>
                    <TableHead className="px-4">Tickets</TableHead>
                    <TableHead className="px-4">Documents</TableHead>
                    <TableHead className="px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Inline add row */}
                  {showAddWricefRow && (
                    <TableRow className="bg-primary/5">
                      <TableCell className="px-4 py-2"></TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          value={newWricef.wricefId}
                          onChange={(e) => setNewWricef((prev) => ({ ...prev, wricefId: e.target.value }))}
                          placeholder="W-001"
                          className="h-8 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Select
                          value={newWricef.type}
                          onValueChange={(val) => setNewWricef((prev) => ({ ...prev, type: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-[100px]">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {(['W', 'R', 'I', 'C', 'E', 'F'] as WricefType[]).map((t) => (
                              <SelectItem key={t} value={t}>{t} – {WRICEF_TYPE_LABELS[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="space-y-1">
                          <Input
                            value={newWricef.title}
                            onChange={(e) => setNewWricef((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Object title"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={newWricef.description}
                            onChange={(e) => setNewWricef((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Description (optional)"
                            className="h-8 text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Select
                          value={newWricef.complexity}
                          onValueChange={(val) => setNewWricef((prev) => ({ ...prev, complexity: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SIMPLE">Simple</SelectItem>
                            <SelectItem value="MOYEN">Moyen</SelectItem>
                            <SelectItem value="COMPLEXE">Complexe</SelectItem>
                            <SelectItem value="TRES_COMPLEXE">Très Complexe</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Select
                          value={newWricef.module}
                          onValueChange={(val) => setNewWricef((prev) => ({ ...prev, module: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(SAP_MODULE_LABELS) as Array<keyof typeof SAP_MODULE_LABELS>).map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="px-4 py-2 text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={addingWricef || !newWricef.wricefId.trim() || !newWricef.title.trim()}
                            onClick={async () => {
                              if (!project) return;
                              setAddingWricef(true);
                              try {
                                const created = await WricefObjectsAPI.create({
                                  projectId: project.id,
                                  wricefId: newWricef.wricefId.trim(),
                                  title: newWricef.title.trim(),
                                  description: newWricef.description.trim(),
                                  complexity: newWricef.complexity as WricefObject['complexity'],
                                  type: (newWricef.type || undefined) as WricefObject['type'],
                                  module: (newWricef.module || 'OTHER') as WricefObject['module'],
                                });
                                setWricefObjects((prev) => [...prev, created]);
                                setShowAddWricefRow(false);
                                setNewWricef({ wricefId: '', title: '', description: '', complexity: 'MOYEN', type: '', module: 'OTHER' });
                                toast.success('Object added');
                              } catch {
                                toast.error('Failed to add object');
                              } finally {
                                setAddingWricef(false);
                              }
                            }}
                          >
                            {addingWricef ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setShowAddWricefRow(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {wricefObjects.length === 0 && !showAddWricefRow ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Package className="h-8 w-8 opacity-40" />
                          <p className="text-sm">No objects yet.</p>
                          <p className="text-xs">Upload an Excel file to initialize objects for this project.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    wricefObjects.map((wo) => {
                      const isExpanded = expandedWricef.has(wo.id);
                      const itemCount = wo.items?.length ?? 0;
                      const docCount = wo.documents?.length ?? 0;

                      return (
                        <React.Fragment key={wo.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => {
                              setExpandedWricef((prev) => {
                                const next = new Set(prev);
                                if (next.has(wo.id)) next.delete(wo.id);
                                else next.add(wo.id);
                                return next;
                              });
                            }}
                          >
                            <TableCell className="px-4 py-3">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge variant="outline" className="font-mono text-xs">
                                {wo.wricefId}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              {wo.type ? (
                                <Badge className={WRICEF_TYPE_COLORS[wo.type] + ' text-xs'}>
                                  {wo.type} – {WRICEF_TYPE_LABELS[wo.type]}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="font-medium text-sm">{wo.title}</div>
                              {wo.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {wo.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge className={COMPLEXITY_COLORS[wo.complexity] || 'bg-muted text-muted-foreground'}>
                                {wo.complexity}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <span className="text-xs">{wo.module ? SAP_MODULE_LABELS[wo.module] ?? wo.module : '—'}</span>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-sm">
                                <TicketIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{wo.items?.reduce((s, it) => s + (it.tickets?.length ?? 0), 0) ?? 0}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-sm">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{docCount}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await WricefObjectsAPI.delete(wo.id);
                                    setWricefObjects((prev) => prev.filter((o) => o.id !== wo.id));
                                    toast.success('Object deleted');
                                  } catch {
                                    toast.error('Failed to delete');
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded detail: Tickets & Documentation */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={9} className="p-0">
                                <div className="bg-muted/20 border-t border-border px-6 py-5">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Tickets (aggregated from all items) */}
                                    <div>
                                      {(() => {
                                        const allTickets = (wo.items || []).flatMap((it) => it.tickets || []);
                                        const ticketCount = allTickets.length;
                                        return (
                                          <>
                                            <div className="flex items-center justify-between mb-3">
                                              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <TicketIcon className="h-4 w-4 text-primary" />
                                                Tickets ({ticketCount})
                                              </h4>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowInlineTicketForWricef(wo.id);
                                                  setInlineTicketForm({ title: '', nature: 'PROGRAMME', complexity: 'MOYEN', priority: 'MEDIUM', description: '', effortHours: 0, estimationHours: 0, dueDate: '', techConsultantId: '', functionalConsultantId: '' });
                                                }}
                                              >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add Ticket
                                              </Button>
                                            </div>

                                            {/* Ticket creation handled via full modal dialog below */}

                                            {ticketCount === 0 && showInlineTicketForWricef !== wo.id ? (
                                              <p className="text-xs text-muted-foreground italic">No tickets yet.</p>
                                            ) : (
                                              <div className="space-y-2">
                                                {allTickets.map((ticket) => {
                                                  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.NEW;
                                                  const StatusIcon = statusCfg.icon;
                                                  const assignee = users.find((u) => u.id === ticket.assignedTo);
                                                  return (
                                                    <div key={ticket.id} className="rounded border border-border bg-card p-2.5 space-y-1">
                                                      <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                          <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                                                            {ticket.ticketCode}
                                                          </Badge>
                                                          <span className="text-xs font-medium truncate">{ticket.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                          <StatusIcon className={`h-3 w-3 ${statusCfg.color}`} />
                                                          <span className={`text-[10px] font-medium ${statusCfg.color}`}>
                                                            {statusCfg.label}
                                                          </span>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-5 w-5 p-0 ml-1 text-destructive hover:text-destructive"
                                                            onClick={async (e) => {
                                                              e.stopPropagation();
                                                              try {
                                                                await TicketsAPI.delete(ticket.id);
                                                                // Remove from wricefObjects state
                                                                setWricefObjects((prev) => prev.map((o) => {
                                                                  if (o.id !== wo.id) return o;
                                                                  const items = (o.items || []).map((it) => ({
                                                                    ...it,
                                                                    tickets: (it.tickets || []).filter((t) => t.id !== ticket.id),
                                                                  }));
                                                                  return { ...o, items };
                                                                }));
                                                                setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
                                                                toast.success('Ticket deleted');
                                                              } catch {
                                                                toast.error('Failed to delete ticket');
                                                              }
                                                            }}
                                                          >
                                                            <Trash2 className="h-3 w-3" />
                                                          </Button>
                                                        </div>
                                                      </div>
                                                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                                        <Badge variant="secondary" className="text-[9px]">{ticket.complexity}</Badge>
                                                        <Badge variant="secondary" className="text-[9px]">{ticket.nature}</Badge>
                                                        {assignee && <span>→ {assignee.name}</span>}
                                                        {ticket.dueDate && (
                                                          <span className="flex items-center gap-0.5">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            {new Date(ticket.dueDate).toLocaleDateString()}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>

                                    {/* Documentation */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Documentation ({docCount})
                                      </h4>
                                      {docCount === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">No documentation linked.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {wo.documents!.map((doc) => (
                                            <div
                                              key={doc.id}
                                              className="rounded-lg border border-border bg-card p-3 space-y-1"
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-medium truncate">{doc.title}</span>
                                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                                  {doc.type}
                                                </Badge>
                                              </div>
                                              {doc.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                  {doc.description}
                                                </p>
                                              )}
                                              {doc.attachments && doc.attachments.length > 0 && (
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                  <FileSpreadsheet className="h-3 w-3" />
                                                  {doc.attachments.length} attachment{doc.attachments.length > 1 ? 's' : ''}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Excel Upload Dialog */}
            <Dialog open={showExcelUpload} onOpenChange={setShowExcelUpload}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Upload WRICEF Excel
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload an Excel file (.xlsx) containing objects. Each row will create one object with its associated items, tickets, and documentation structure.
                  </p>
                  <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
                    <p className="text-xs font-medium text-foreground">Expected columns:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['ID', 'Title', 'Description', 'Complexity'].map((col) => (
                        <Badge key={col} variant="secondary" className="text-[10px]">
                          {col}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Complexity values: Simple, Medium/Moyen, Complex/Complexe, Very Complex/Tres Complexe
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    disabled={uploadingExcel}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !project) return;

                      setUploadingExcel(true);
                      try {
                        const arrayBuffer = await file.arrayBuffer();
                        const base64 = btoa(
                          new Uint8Array(arrayBuffer).reduce(
                            (data, byte) => data + String.fromCharCode(byte),
                            ''
                          )
                        );
                        const created = await WricefObjectsAPI.uploadExcel(project.id, base64);
                        setWricefObjects(created);
                        setShowExcelUpload(false);
                        toast.success(`${created.length} objects imported successfully`);
                      } catch (err) {
                        toast.error('Failed to upload Excel file');
                        console.error(err);
                      } finally {
                        setUploadingExcel(false);
                      }
                    }}
                  />
                  {uploadingExcel && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Excel file...
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowExcelUpload(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
        )}

        {activeTab === 'tasks' && (
          <section
            id="project-panel-tasks"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="project-tab-tasks"
            className="space-y-4"
          >
            {/* Ticket stats bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {tickets.filter((t) => t.status === 'NEW').length} New
              </Badge>
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {tickets.filter((t) => t.status === 'IN_PROGRESS').length} In Progress
              </Badge>
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                {tickets.filter((t) => t.status === 'DONE' || t.status === 'RESOLVED').length} Done
              </Badge>
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {tickets.filter((t) => t.status === 'BLOCKED').length} Blocked
              </Badge>
              <div className="ml-auto">
                <Button size="sm" onClick={() => setShowCreateTicket(true)}>
                  <Calculator className="h-4 w-4 mr-1" />
                  Create Ticket
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="px-4">Code</TableHead>
                    <TableHead className="px-4">Title</TableHead>
                    <TableHead className="px-4">Status</TableHead>
                    <TableHead className="px-4">Priority</TableHead>
                    <TableHead className="px-4">Nature</TableHead>
                    <TableHead className="px-4">Complexity</TableHead>
                    <TableHead className="px-4">Assignee</TableHead>
                    <TableHead className="px-4">Due Date</TableHead>
                    <TableHead className="px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => {
                    const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.NEW;
                    const StatusIcon = statusCfg.icon;
                    const assignee = users.find((u) => u.id === ticket.assignedTo);
                    const priorityColors: Record<string, string> = {
                      LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                      HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                      CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    };
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => navigate(`${roleBasePath}/tickets/${ticket.id}`)}
                      >
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {ticket.ticketCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="font-medium text-sm">{ticket.title}</div>
                          {ticket.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {ticket.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 ${statusCfg.color}`} />
                            <span className={`text-xs font-medium ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className={priorityColors[ticket.priority] || ''}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {ticket.nature}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className={COMPLEXITY_COLORS[ticket.complexity] || 'bg-muted text-muted-foreground'}>
                            {ticket.complexity}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          {assignee?.name ?? <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          {ticket.dueDate
                            ? new Date(ticket.dueDate).toLocaleDateString()
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-primary hover:text-primary"
                              onClick={(e) => { e.stopPropagation(); navigate(`${roleBasePath}/tickets/${ticket.id}`); }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await TicketsAPI.delete(ticket.id);
                                  setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
                                  setWricefObjects((prev) => prev.map((o) => ({
                                    ...o,
                                    items: (o.items || []).map((it) => ({
                                      ...it,
                                      tickets: (it.tickets || []).filter((t) => t.id !== ticket.id),
                                    })),
                                  })));
                                  toast.success('Ticket deleted');
                                } catch {
                                  toast.error('Failed to delete ticket');
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {tickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No tickets found for this project.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {activeTab === 'team' && (
          <section
            id="project-panel-team"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="project-tab-team"
            className="rounded-lg border bg-card"
          >
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-4">Consultant</TableHead>
                  <TableHead className="px-4">Role</TableHead>
                  <TableHead className="px-4">Allocation</TableHead>
                  <TableHead className="px-4">Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => {
                  const user = users.find((u) => u.id === allocation.userId);
                  return (
                    <TableRow key={allocation.id}>
                      <TableCell className="px-4 py-3 text-sm">{user?.name ?? '-'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {user?.role ?? '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">{allocation.allocationPercent}%</TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {user?.availabilityPercent ?? '-'}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {allocations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No allocations found for this project.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        )}

        {activeTab === 'kpi' && (
          <section
            id="project-panel-kpi"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="project-tab-kpi"
            className="space-y-6"
          >
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Tasks On Track</div>
                <div className="text-3xl font-bold text-emerald-600">{kpis.onTrack}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  of {tasks.length} total tasks
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Overdue Tasks</div>
                <div className="text-3xl font-bold text-destructive">{kpis.late}</div>
                <div className="text-xs text-muted-foreground mt-1">past planned end date</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Blocked Tasks</div>
                <div className="text-3xl font-bold text-amber-500">{kpis.blocked}</div>
                <div className="text-xs text-muted-foreground mt-1">require attention</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Completed</div>
                <div className="text-3xl font-bold text-foreground">{kpis.completed}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tasks.length > 0 ? Math.round((kpis.completed / tasks.length) * 100) : 0}% completion rate
                </div>
              </div>
            </div>

            {/* Progress & Effort */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Progress Overview</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-semibold">{project?.progress ?? 0}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full bg-primary transition-all"
                        style={{ width: `${project?.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Average Task Progress</span>
                      <span className="font-semibold">{Math.round(kpis.productivity)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.round(kpis.productivity)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Effort Tracking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Estimated Hours</div>
                    <div className="text-2xl font-bold text-foreground mt-1">
                      {totalEstimatedHours.toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Actual Hours</div>
                    <div className="text-2xl font-bold text-foreground mt-1">
                      {totalActualHours.toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Variance</div>
                    <div className={`text-2xl font-bold mt-1 ${totalEstimatedHours - totalActualHours >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {(totalEstimatedHours - totalActualHours).toFixed(1)}h
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Budget Spent</div>
                    <div className="text-2xl font-bold text-foreground mt-1">
                      {totalEstimatedHours > 0
                        ? Math.round((totalActualHours / totalEstimatedHours) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Ticket Summary</h3>
                <div className="space-y-2">
                  {['NEW', 'IN_PROGRESS', 'RESOLVED', 'DONE', 'REJECTED', 'BLOCKED'].map((status) => {
                    const statusCount = tickets.filter((t) => t.status === status).length;
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.NEW;
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                          <span>{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{statusCount}</span>
                          <div className="w-24 h-1.5 rounded-full bg-muted">
                            <div
                              className={`h-1.5 rounded-full transition-all ${status === 'DONE' || status === 'RESOLVED' ? 'bg-emerald-500' : status === 'REJECTED' || status === 'BLOCKED' ? 'bg-destructive' : 'bg-primary'}`}
                              style={{ width: `${tickets.length > 0 ? (statusCount / tickets.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Objects Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Total WRICEFs</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{wricefObjects.length}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Total Objects</div>
                    <div className="text-2xl font-bold text-foreground mt-1">
                      {wricefObjects.reduce((sum, wo) => sum + (wo.items?.length ?? 0), 0)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Documents</div>
                    <div className="text-2xl font-bold text-foreground mt-1">
                      {wricefObjects.reduce((sum, wo) => sum + (wo.documents?.length ?? 0), 0)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Critical Tickets</div>
                    <div className="text-2xl font-bold text-destructive mt-1">
                      {tickets.filter((t) => t.priority === 'CRITICAL').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Performance */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Team Performance</h3>
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="px-4">Consultant</TableHead>
                      <TableHead className="px-4">Role</TableHead>
                      <TableHead className="px-4">Assigned Tasks</TableHead>
                      <TableHead className="px-4">Completed</TableHead>
                      <TableHead className="px-4">Tickets</TableHead>
                      <TableHead className="px-4">Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => {
                      const user = users.find((u) => u.id === allocation.userId);
                      const userTasks = tasks.filter((t) => t.assigneeId === allocation.userId);
                      const completedTasks = userTasks.filter((t) => t.status === 'DONE').length;
                      const userTickets = tickets.filter((t) => t.assignedTo === allocation.userId);
                      return (
                        <TableRow key={allocation.id}>
                          <TableCell className="px-4 py-3 text-sm font-medium">{user?.name ?? '-'}</TableCell>
                          <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                            {user?.role ?? '-'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">{userTasks.length}</TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            <span className="text-emerald-600 font-medium">{completedTasks}</span>
                            <span className="text-muted-foreground">/{userTasks.length}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">{userTickets.length}</TableCell>
                          <TableCell className="px-4 py-3 text-sm">{allocation.allocationPercent}%</TableCell>
                        </TableRow>
                      );
                    })}
                    {allocations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No team allocations found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'docs' && (
          <section
            id="project-panel-docs"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby="project-tab-docs"
            className="space-y-4"
          >
            {/* Project Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Complexity</div>
                <div className="text-lg font-semibold text-foreground">
                  <Badge variant="outline">{project.complexity ?? 'N/A'}</Badge>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Budget (Chiffrage)</div>
                <div className="text-lg font-semibold text-foreground">
                  ${project.budget?.toLocaleString() ?? 'N/A'}
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Time Spent (h)</div>
                <div className="text-lg font-semibold text-foreground">
                  {totalActualHours.toFixed(1)}
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Estimated Hours</div>
                <div className="text-lg font-semibold text-foreground">
                  {totalEstimatedHours.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Tech Keywords */}
            {project.techKeywords && project.techKeywords.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-2">Tech Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {project.techKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation area */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Project Documentation</h3>
              <Textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                rows={12}
                placeholder="Write project documentation here (markdown supported)..."
                className="font-mono text-sm"
              />
              <div className="flex justify-end">
                <Button
                  disabled={docSaving}
                  onClick={async () => {
                    setDocSaving(true);
                    try {
                      await ProjectsAPI.update(project.id, { documentation: docText });
                      setProject((prev) => (prev ? { ...prev, documentation: docText } : prev));
                      toast.success('Documentation saved');
                    } catch {
                      toast.error('Failed to save documentation');
                    } finally {
                      setDocSaving(false);
                    }
                  }}
                >
                  {docSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ── Full modal for Add Ticket from Objects tab ── */}
        <Dialog open={showInlineTicketForWricef !== null} onOpenChange={(open) => { if (!open) setShowInlineTicketForWricef(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-primary" />
                Add Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inline-ticket-title">Title *</Label>
                <Input
                  id="inline-ticket-title"
                  value={inlineTicketForm.title}
                  onChange={(e) => setInlineTicketForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ticket title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nature</Label>
                  <Select value={inlineTicketForm.nature} onValueChange={(val) => setInlineTicketForm((prev) => ({ ...prev, nature: val as TicketNature }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(TICKET_NATURE_LABELS) as [TicketNature, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Complexity</Label>
                  <Select value={inlineTicketForm.complexity} onValueChange={(val) => setInlineTicketForm((prev) => ({ ...prev, complexity: val as Ticket['complexity'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIMPLE">Simple</SelectItem>
                      <SelectItem value="MOYEN">Moyen</SelectItem>
                      <SelectItem value="COMPLEXE">Complexe</SelectItem>
                      <SelectItem value="TRES_COMPLEXE">Très Complexe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={inlineTicketForm.priority} onValueChange={(val) => setInlineTicketForm((prev) => ({ ...prev, priority: val as Ticket['priority'] }))}>
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
                  <Label htmlFor="inline-ticket-due">Due Date</Label>
                  <Input
                    id="inline-ticket-due"
                    type="date"
                    value={inlineTicketForm.dueDate}
                    onChange={(e) => setInlineTicketForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inline-ticket-effort">Effort (h)</Label>
                  <Input id="inline-ticket-effort" type="number" min={0} step={0.5}
                    value={inlineTicketForm.effortHours}
                    onChange={(e) => setInlineTicketForm((prev) => ({ ...prev, effortHours: Number(e.target.value || 0) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inline-ticket-est">Estimation (h)</Label>
                  <Input id="inline-ticket-est" type="number" min={0} step={0.5}
                    value={inlineTicketForm.estimationHours}
                    onChange={(e) => setInlineTicketForm((prev) => ({ ...prev, estimationHours: Number(e.target.value || 0) }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Technical Consultant</Label>
                <Select
                  value={inlineTicketForm.techConsultantId || '__none'}
                  onValueChange={(val) => setInlineTicketForm((prev) => ({ ...prev, techConsultantId: val === '__none' ? '' : val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select technical consultant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Not assigned —</SelectItem>
                    {techConsultants.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.availabilityPercent}% available)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Functional Consultant</Label>
                <Select
                  value={inlineTicketForm.functionalConsultantId || '__none'}
                  onValueChange={(val) => setInlineTicketForm((prev) => ({ ...prev, functionalConsultantId: val === '__none' ? '' : val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select functional consultant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Not assigned —</SelectItem>
                    {funcConsultants.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.availabilityPercent}% available)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inline-ticket-desc">Description</Label>
                <Textarea
                  id="inline-ticket-desc"
                  value={inlineTicketForm.description}
                  onChange={(e) => setInlineTicketForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setShowInlineTicketForWricef(null)}>Cancel</Button>
              <Button
                disabled={creatingInlineTicket || !inlineTicketForm.title.trim()}
                onClick={async () => {
                  if (!project || !currentUser || !showInlineTicketForWricef) return;
                  const wo = wricefObjects.find((o) => o.id === showInlineTicketForWricef);
                  if (!wo) return;
                  setCreatingInlineTicket(true);
                  try {
                    let targetItem = wo.items?.[0];
                    if (!targetItem) {
                      targetItem = await WricefItemsAPI.create({
                        wricefId: wo.id,
                        objectId: wo.wricefId + '-OBJ-001',
                        title: wo.title,
                        description: '',
                      });
                      setWricefObjects((prev) => prev.map((o) =>
                        o.id === wo.id ? { ...o, items: [{ ...targetItem!, tickets: [] }] } : o
                      ));
                    }
                    const created = await TicketsAPI.create({
                      projectId: project.id,
                      createdBy: currentUser.id,
                      status: 'NEW',
                      priority: inlineTicketForm.priority,
                      nature: inlineTicketForm.nature,
                      title: inlineTicketForm.title.trim(),
                      description: inlineTicketForm.description.trim(),
                      dueDate: inlineTicketForm.dueDate || undefined,
                      wricefItemId: targetItem!.id,
                      module: wo.module || 'OTHER',
                      complexity: inlineTicketForm.complexity,
                      effortHours: inlineTicketForm.effortHours,
                      estimationHours: inlineTicketForm.estimationHours,
                      estimatedViaAbaque: false,
                      assignedTo: inlineTicketForm.techConsultantId || undefined,
                      assignedToRole: inlineTicketForm.techConsultantId ? 'CONSULTANT_TECHNIQUE' : undefined,
                      techConsultantId: inlineTicketForm.techConsultantId || undefined,
                      functionalConsultantId: inlineTicketForm.functionalConsultantId || undefined,
                      history: [],
                    });
                    setWricefObjects((prev) => prev.map((o) => {
                      if (o.id !== wo.id) return o;
                      const items = (o.items || []).map((it) => {
                        if (it.id === targetItem!.id) return { ...it, tickets: [...(it.tickets || []), created] };
                        return it;
                      });
                      return { ...o, items };
                    }));
                    setTickets((prev) => [created, ...prev]);
                    setShowInlineTicketForWricef(null);
                    toast.success('Ticket created successfully');
                  } catch {
                    toast.error('Failed to create ticket');
                  } finally {
                    setCreatingInlineTicket(false);
                  }
                }}
              >
                {creatingInlineTicket ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : 'Create Ticket'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Create New Object mini-dialog (opened from the ticket form) ── */}
        <Dialog open={showCreateObjectInTicket} onOpenChange={setShowCreateObjectInTicket}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create New Object
              </DialogTitle>
            </DialogHeader>

            {/* Project auto-assigned info */}
            <div className="rounded border border-border/60 bg-muted/30 px-3 py-2 text-sm mb-1">
              <span className="text-muted-foreground">Project: </span>
              <span className="font-medium">{project?.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">(assigned automatically)</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Object ID */}
              <div className="space-y-1.5">
                <Label htmlFor="new-obj-wricefid">Object ID *</Label>
                <Input
                  id="new-obj-wricefid"
                  value={newObjectInTicketForm.wricefId}
                  onChange={(e) => setNewObjectInTicketForm((p) => ({ ...p, wricefId: e.target.value }))}
                  placeholder="e.g. W-001"
                  className="font-mono"
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={newObjectInTicketForm.type || '__none'}
                  onValueChange={(val) => setNewObjectInTicketForm((p) => ({ ...p, type: val === '__none' ? '' : val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— None —</SelectItem>
                    {(['W', 'R', 'I', 'C', 'E', 'F'] as WricefType[]).map((t) => (
                      <SelectItem key={t} value={t}>{t} – {WRICEF_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="new-obj-title">Title *</Label>
                <Input
                  id="new-obj-title"
                  value={newObjectInTicketForm.title}
                  onChange={(e) => setNewObjectInTicketForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Object title"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="new-obj-desc">Description</Label>
                <Textarea
                  id="new-obj-desc"
                  value={newObjectInTicketForm.description}
                  onChange={(e) => setNewObjectInTicketForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              {/* Complexity */}
              <div className="space-y-1.5">
                <Label>Complexity</Label>
                <Select
                  value={newObjectInTicketForm.complexity}
                  onValueChange={(val) => setNewObjectInTicketForm((p) => ({ ...p, complexity: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIMPLE">Simple</SelectItem>
                    <SelectItem value="MOYEN">Moyen</SelectItem>
                    <SelectItem value="COMPLEXE">Complexe</SelectItem>
                    <SelectItem value="TRES_COMPLEXE">Très Complexe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SAP Module */}
              <div className="space-y-1.5">
                <Label>Module</Label>
                <Select
                  value={newObjectInTicketForm.module}
                  onValueChange={(val) => setNewObjectInTicketForm((p) => ({ ...p, module: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SAP_MODULE_LABELS) as Array<keyof typeof SAP_MODULE_LABELS>).map((m) => (
                      <SelectItem key={m} value={m}>{m} – {SAP_MODULE_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateObjectInTicket(false)}
                disabled={creatingObjectInTicket}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  creatingObjectInTicket ||
                  !newObjectInTicketForm.wricefId.trim() ||
                  !newObjectInTicketForm.title.trim()
                }
                onClick={async () => {
                  if (!project) return;
                  setCreatingObjectInTicket(true);
                  try {
                    const created = await WricefObjectsAPI.create({
                      projectId: project.id,
                      wricefId: newObjectInTicketForm.wricefId.trim(),
                      title: newObjectInTicketForm.title.trim(),
                      description: newObjectInTicketForm.description.trim(),
                      complexity: newObjectInTicketForm.complexity as WricefObject['complexity'],
                      type: (newObjectInTicketForm.type || undefined) as WricefObject['type'],
                      module: (newObjectInTicketForm.module || 'OTHER') as WricefObject['module'],
                    });
                    // Add to objects list
                    setWricefObjects((prev) => [...prev, created]);
                    // Auto-select the newly created object in the ticket form
                    const firstItem = created.items?.[0];
                    setTicketForm((prev) => ({
                      ...prev,
                      wricefId: created.id,
                      wricefItemId: firstItem?.id ?? '',
                    }));
                    setShowCreateObjectInTicket(false);
                    toast.success(`Object "${created.title}" created and selected`);
                  } catch {
                    toast.error('Failed to create object');
                  } finally {
                    setCreatingObjectInTicket(false);
                  }
                }}
              >
                {creatingObjectInTicket ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Save Object'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateTicket} onOpenChange={setShowCreateTicket}>
          <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Create Project Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div className="rounded border border-border/70 bg-muted/30 p-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Project:</span> {project.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Abaque:</span>{' '}
                    {selectedAbaque?.name ?? 'No linked abaque'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Object selector */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Object *</Label>
                    <Select
                      value={ticketForm.wricefId || '__none'}
                      onValueChange={(value) => {
                        if (value === '__create_new') {
                          setNewObjectInTicketForm({ wricefId: '', title: '', description: '', complexity: 'MOYEN', type: '', module: 'OTHER' });
                          setShowCreateObjectInTicket(true);
                          return;
                        }
                        const woId = value === '__none' ? '' : value;
                        const firstItem = wricefObjects.find((w) => w.id === woId)?.items?.[0];
                        setTicketForm((prev) => ({
                          ...prev,
                          wricefId: woId,
                          wricefItemId: firstItem?.id ?? '',
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an Object" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__create_new">
                          <span className="flex items-center gap-1.5 text-primary font-medium">
                            <Plus className="h-3.5 w-3.5" />
                            Create New Object
                          </span>
                        </SelectItem>
                        <SelectItem value="__none">No Object</SelectItem>
                        {wricefObjects.map((wo) => (
                          <SelectItem key={wo.id} value={wo.id}>
                            {wo.wricefId} – {wo.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="project-ticket-title">Title *</Label>
                    <Input
                      id="project-ticket-title"
                      value={ticketForm.title}
                      onChange={(event) =>
                        setTicketForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Ticket title"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Task Nature</Label>
                    <Select
                      value={ticketForm.nature}
                      onValueChange={(value) => {
                        setTicketForm((prev) => ({ ...prev, nature: value as TicketNature }));
                        setIsEstimatedByAbaque(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(TICKET_NATURE_LABELS) as [TicketNature, string][]).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Complexity</Label>
                    <Select
                      value={ticketForm.complexity}
                      onValueChange={(value) => {
                        setTicketForm((prev) => ({
                          ...prev,
                          complexity: value as AbaqueComplexity,
                        }));
                        setIsEstimatedByAbaque(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={ticketForm.priority}
                      onValueChange={(value) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          priority: value as Ticket['priority'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="project-ticket-due-date">Due Date</Label>
                    <Input
                      id="project-ticket-due-date"
                      type="date"
                      value={ticketForm.dueDate}
                      onChange={(event) =>
                        setTicketForm((prev) => ({ ...prev, dueDate: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Technical Consultant</Label>
                    <Select
                      value={ticketForm.techConsultantId || '__none'}
                      onValueChange={(val) =>
                        setTicketForm((prev) => ({ ...prev, techConsultantId: val === '__none' ? '' : val }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Select technical consultant" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Not assigned —</SelectItem>
                        {techConsultants.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.availabilityPercent}% available)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Functional Consultant</Label>
                    <Select
                      value={ticketForm.functionalConsultantId || '__none'}
                      onValueChange={(val) =>
                        setTicketForm((prev) => ({ ...prev, functionalConsultantId: val === '__none' ? '' : val }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Select functional consultant" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none"> Not assigned </SelectItem>
                        {funcConsultants.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.availabilityPercent}% available)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="project-ticket-estimation">Estimation (Days)</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={applyAbaqueEstimate}
                        disabled={!selectedAbaque}
                      >
                        <Calculator className="h-3.5 w-3.5 mr-1" />
                        Abaque
                      </Button>
                    </div>
                    <Select
                      value={String(ticketForm.estimationHours)}
                      onValueChange={(val) => {
                        setTicketForm((prev) => ({ ...prev, estimationHours: Number(val) }));
                        setIsEstimatedByAbaque(false);
                      }}
                    >
                      <SelectTrigger id="project-ticket-estimation">
                        <SelectValue placeholder="Select days" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { label: '0.5 day (4h)', hours: 4 },
                          { label: '1 day (8h)', hours: 8 },
                          { label: '1.5 days (12h)', hours: 12 },
                          { label: '2 days (16h)', hours: 16 },
                          { label: '3 days (24h)', hours: 24 },
                          { label: '4 days (32h)', hours: 32 },
                          { label: '5 days (40h)', hours: 40 },
                          { label: '7 days (56h)', hours: 56 },
                          { label: '10 days (80h)', hours: 80 },
                          { label: '15 days (120h)', hours: 120 },
                          { label: '20 days (160h)', hours: 160 },
                          { label: '30 days (240h)', hours: 240 },
                        ].map(({ label, hours }) => (
                          <SelectItem key={hours} value={String(hours)}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isEstimatedByAbaque && (
                      <Badge variant="secondary" className="inline-flex items-center gap-1">
                        <Scale className="h-3 w-3" />
                        Standard guideline match
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="project-ticket-effort">Effort Logged (Days)</Label>
                    <Select
                      value={String(ticketForm.effortHours)}
                      onValueChange={(val) => {
                        setTicketForm((prev) => ({ ...prev, effortHours: Number(val) }));
                      }}
                    >
                      <SelectTrigger id="project-ticket-effort">
                        <SelectValue placeholder="Select days" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { label: '0 days (0h)', hours: 0 },
                          { label: '0.5 day (4h)', hours: 4 },
                          { label: '1 day (8h)', hours: 8 },
                          { label: '1.5 days (12h)', hours: 12 },
                          { label: '2 days (16h)', hours: 16 },
                          { label: '3 days (24h)', hours: 24 },
                          { label: '4 days (32h)', hours: 32 },
                          { label: '5 days (40h)', hours: 40 },
                          { label: '7 days (56h)', hours: 56 },
                          { label: '10 days (80h)', hours: 80 },
                          { label: '15 days (120h)', hours: 120 },
                          { label: '20 days (160h)', hours: 160 },
                          { label: '30 days (240h)', hours: 240 },
                        ].map(({ label, hours }) => (
                          <SelectItem key={hours} value={String(hours)}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="project-ticket-description">Description</Label>
                    <Textarea
                      id="project-ticket-description"
                      value={ticketForm.description}
                      onChange={(event) =>
                        setTicketForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">Abaque Reference</div>
                {!selectedAbaque ? (
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    Link an abaque to the project to see standard effort values.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/70 bg-surface-2 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/55">
                        <TableRow>
                          <TableHead className="px-3">Nature</TableHead>
                          <TableHead className="px-3 text-center">L</TableHead>
                          <TableHead className="px-3 text-center">M</TableHead>
                          <TableHead className="px-3 text-center">H</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abaqueTaskNatures.map((taskNature) => {
                          const low = selectedAbaque.entries.find(
                            (entry) =>
                              entry.taskNature === taskNature && entry.complexity === 'LOW'
                          )?.standardHours;
                          const medium = selectedAbaque.entries.find(
                            (entry) =>
                              entry.taskNature === taskNature && entry.complexity === 'MEDIUM'
                          )?.standardHours;
                          const high = selectedAbaque.entries.find(
                            (entry) =>
                              entry.taskNature === taskNature && entry.complexity === 'HIGH'
                          )?.standardHours;
                          const activeRow = taskNature === ticketForm.nature;
                          return (
                            <TableRow
                              key={taskNature}
                              className={activeRow ? 'bg-primary/10' : undefined}
                            >
                              <TableCell className="px-3 py-2 text-xs font-medium">
                                {ABAQUE_TASK_NATURE_LABELS[taskNature]}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-center text-xs">{low ?? '-'}</TableCell>
                              <TableCell className="px-3 py-2 text-center text-xs">{medium ?? '-'}</TableCell>
                              <TableCell className="px-3 py-2 text-center text-xs">{high ?? '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4 pt-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateTicket(false);
                  setTicketForm(EMPTY_TICKET_FORM);
                  setIsEstimatedByAbaque(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void createProjectTicket()} disabled={isCreatingTicket}>
                {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
