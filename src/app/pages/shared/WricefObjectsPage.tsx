import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Upload,
  Plus,
  Pencil,
  Trash2,
  Search,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Ticket as TicketIcon,
  BookOpenText,
  Save,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Paperclip,
  User as UserIcon,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
import { useAuth } from '../../context/AuthContext';
import { Textarea } from '../../components/ui/textarea';
import {
  WricefObjectsAPI,
  ProjectsAPI,
  UsersAPI,
  TicketsAPI,
  DocumentationAPI,
} from '../../services/odataClient';
import {
  WricefObject,
  Ticket,
  DocumentationObject,
  Project,
  User,
  TicketComplexity,
  TicketStatus,
  WricefType,
  WRICEF_TYPE_LABELS,
  WRICEF_TYPE_COLORS,
  TICKET_COMPLEXITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_NATURE_LABELS,
  SAP_MODULE_LABELS,
  SAPModule,
  DOCUMENTATION_OBJECT_TYPE_LABELS,
  DocumentationObjectType,
  TicketNature,
  UserRole,
  Priority,
} from '../../types/entities';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const complexityColor: Record<TicketComplexity, string> = {
  SIMPLE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  MOYEN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLEXE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  TRES_COMPLEXE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusColor: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  IN_TEST: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const priorityColor: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusIcon: Record<string, React.ReactNode> = {
  NEW: <CircleDot className="h-3 w-3" />,
  IN_PROGRESS: <Clock className="h-3 w-3" />,
  IN_TEST: <AlertTriangle className="h-3 w-3" />,
  BLOCKED: <AlertTriangle className="h-3 w-3" />,
  DONE: <CheckCircle2 className="h-3 w-3" />,
  REJECTED: <X className="h-3 w-3" />,
};

const canManage = (role: UserRole) =>
  ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(role);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditingRow {
  id: string; // '' for new row
  wricefId: string;
  type: string;
  title: string;
  description: string;
  complexity: TicketComplexity;
  module: string;
}

const emptyRow = (): EditingRow => ({
  id: '',
  wricefId: '',
  type: '',
  title: '',
  description: '',
  complexity: 'SIMPLE',
  module: 'OTHER',
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WricefObjectsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [objects, setObjects] = useState<WricefObject[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [complexityFilter, setComplexityFilter] = useState<TicketComplexity | 'ALL'>('ALL');

  // UI state
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Create ticket dialog
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createTicketObjId, setCreateTicketObjId] = useState('');
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    nature: 'PROGRAMME' as TicketNature,
    module: 'OTHER' as SAPModule,
    priority: 'MEDIUM' as Priority,
    complexity: 'SIMPLE' as TicketComplexity,
  });

  // Create documentation dialog
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createDocObjId, setCreateDocObjId] = useState('');
  const [docForm, setDocForm] = useState({
    title: '',
    description: '',
    type: 'GENERAL' as DocumentationObjectType,
    content: '',
  });

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [proj, objs, userData] = await Promise.all([
        ProjectsAPI.getAll(),
        WricefObjectsAPI.getAll(),  // already expands tickets + documents
        UsersAPI.getAll(),
      ]);
      setProjects(proj);
      setObjects(objs);
      setUsers(userData);
    } catch (err) {
      console.error('Failed to load data', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const filteredObjects = useMemo(() => {
    let result = [...objects];

    if (selectedProject !== 'all') {
      result = result.filter((o) => o.projectId === selectedProject);
    }

    if (complexityFilter !== 'ALL') {
      result = result.filter((o) => o.complexity === complexityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.wricefId.toLowerCase().includes(q) ||
          o.title.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.wricefId.localeCompare(b.wricefId));
  }, [objects, selectedProject, complexityFilter, searchQuery]);

  const projectName = (pid: string) =>
    projects.find((p) => p.id === pid)?.name ?? pid;

  const userName = (uid: string | undefined) => {
    if (!uid) return '—';
    return users.find((u) => u.id === uid)?.name ?? uid;
  };

  /** Get all tickets across items for a WRICEF object */
  const objTickets = (obj: WricefObject): Ticket[] =>
    (obj.items ?? []).flatMap((item) => item.tickets ?? []);
  /** Get documentation for an object from expanded data */
  const objDocs = (obj: WricefObject): DocumentationObject[] => obj.documents ?? [];

  // -----------------------------------------------------------------------
  // Row expand/collapse
  // -----------------------------------------------------------------------

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // CRUD Operations
  // -----------------------------------------------------------------------

  const handleSaveRow = async () => {
    if (!editingRow) return;
    const { id, wricefId, type, title, description, complexity, module } = editingRow;
    if (!wricefId.trim() || !title.trim()) {
      toast.error('Object ID and Title are required');
      return;
    }

    try {
      if (id) {
        // Update existing
        const updated = await WricefObjectsAPI.update(id, {
          wricefId,
          type: (type || undefined) as WricefObject['type'],
          title,
          description,
          complexity,
          module: (module || 'OTHER') as WricefObject['module'],
        });
        setObjects((prev) => prev.map((o) => (o.id === id ? updated : o)));
        toast.success('Object updated');
      } else {
        // Create new
        const projectId = selectedProject !== 'all' ? selectedProject : projects[0]?.id;
        if (!projectId) {
          toast.error('Please select a project first');
          return;
        }
        const created = await WricefObjectsAPI.create({
          wricefId,
          type: (type || undefined) as WricefObject['type'],
          title,
          description,
          complexity,
          module: (module || 'OTHER') as WricefObject['module'],
          projectId,
        } as WricefObject);
        setObjects((prev) => [...prev, created]);
        toast.success('Object created');
      }
      setEditingRow(null);
    } catch (err) {
      console.error('Save failed', err);
      toast.error('Failed to save');
    }
  };

  const handleDeleteObject = async (obj: WricefObject) => {
    const relatedTickets = objTickets(obj);
    if (relatedTickets.length > 0) {
      toast.error(`Cannot delete: ${relatedTickets.length} ticket(s) linked to this object`);
      return;
    }
    try {
      await WricefObjectsAPI.delete(obj.id);
      setObjects((prev) => prev.filter((o) => o.id !== obj.id));
      toast.success('Object deleted');
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to delete');
    }
  };

  // -----------------------------------------------------------------------
  // Delete ticket
  // -----------------------------------------------------------------------

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await TicketsAPI.delete(ticketId);
      // Reload objects to reflect change
      const objs = await WricefObjectsAPI.getAll();
      setObjects(objs);
      toast.success('Ticket deleted');
    } catch (err) {
      console.error('Delete ticket failed', err);
      toast.error('Failed to delete ticket');
    }
  };

  // -----------------------------------------------------------------------
  // Create ticket from object view
  // -----------------------------------------------------------------------

  const openCreateTicket = (objId: string) => {
    setCreateTicketObjId(objId);
    setTicketForm({
      title: '',
      description: '',
      nature: 'PROGRAMME',
      module: 'OTHER',
      priority: 'MEDIUM',
      complexity: 'SIMPLE',
    });
    setCreateTicketOpen(true);
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const obj = objects.find((o) => o.id === createTicketObjId);
    if (!obj) return;
    // Use first item (auto-created via deep insert)
    const firstItem = obj.items?.[0];
    if (!firstItem) {
      toast.error('Object has no items — cannot create ticket');
      return;
    }
    try {
      await TicketsAPI.create({
        title: ticketForm.title,
        description: ticketForm.description,
        nature: ticketForm.nature,
        module: ticketForm.module,
        priority: ticketForm.priority,
        complexity: ticketForm.complexity,
        projectId: obj.projectId,
        wricefItemId: firstItem.id,
        createdBy: currentUser!.id,
        status: 'NEW',
        effortHours: 0,
        estimationHours: 0,
        history: [],
      } as Omit<Ticket, 'id' | 'createdAt' | 'ticketCode'>);
      const objs = await WricefObjectsAPI.getAll();
      setObjects(objs);
      setCreateTicketOpen(false);
      toast.success('Ticket created');
    } catch (err) {
      console.error('Create ticket failed', err);
      toast.error('Failed to create ticket');
    }
  };

  // -----------------------------------------------------------------------
  // Create documentation from object view
  // -----------------------------------------------------------------------

  const openCreateDoc = (objId: string) => {
    setCreateDocObjId(objId);
    setDocForm({ title: '', description: '', type: 'GENERAL', content: '' });
    setCreateDocOpen(true);
  };

  const handleCreateDoc = async () => {
    if (!docForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const obj = objects.find((o) => o.id === createDocObjId);
    if (!obj) return;
    try {
      await DocumentationAPI.create({
        wricefObjectId: obj.id,
        projectId: obj.projectId,
        title: docForm.title,
        description: docForm.description,
        type: docForm.type,
        content: docForm.content,
        authorId: currentUser!.id,
        attachments: [],
      });
      const objs = await WricefObjectsAPI.getAll();
      setObjects(objs);
      setCreateDocOpen(false);
      toast.success('Documentation created');
    } catch (err) {
      console.error('Create doc failed', err);
      toast.error('Failed to create documentation');
    }
  };

  // -----------------------------------------------------------------------
  // Delete documentation
  // -----------------------------------------------------------------------

  const handleDeleteDoc = async (docId: string) => {
    try {
      await DocumentationAPI.delete(docId);
      const objs = await WricefObjectsAPI.getAll();
      setObjects(objs);
      toast.success('Documentation deleted');
    } catch (err) {
      console.error('Delete doc failed', err);
      toast.error('Failed to delete documentation');
    }
  };

  // -----------------------------------------------------------------------
  // Excel Upload
  // -----------------------------------------------------------------------

  const handleUploadExcel = async () => {
    if (!uploadFile || !uploadProjectId) {
      toast.error('Please select a project and a file');
      return;
    }

    setUploading(true);
    try {
      // Convert file to base64
      const buffer = await uploadFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      const base64 = btoa(binary);

      const created = await WricefObjectsAPI.uploadExcel(uploadProjectId, base64);
      setObjects((prev) => [...prev, ...created]);
      toast.success(`${created.length} object(s) imported`);
      setUploadDialogOpen(false);
      setUploadFile(null);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Failed to upload Excel file');
    } finally {
      setUploading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = filteredObjects.length;
    const byComplexity = {
      SIMPLE: 0,
      MOYEN: 0,
      COMPLEXE: 0,
      TRES_COMPLEXE: 0,
    };
    filteredObjects.forEach((o) => {
      if (o.complexity in byComplexity)
        byComplexity[o.complexity as TicketComplexity]++;
    });
    const totalTickets = filteredObjects.reduce(
      (sum, o) => sum + objTickets(o).length,
      0
    );
    const totalDocs = filteredObjects.reduce(
      (sum, o) => sum + objDocs(o).length,
      0
    );
    return { total, byComplexity, totalTickets, totalDocs };
  }, [filteredObjects]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!currentUser) return null;
  const isManager = canManage(currentUser.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Object Organizer"
        subtitle="Manage objects per project – upload WRICEF or edit inline"
      />

      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Objects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <div className="text-xs text-muted-foreground">Linked Tickets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <div className="text-xs text-muted-foreground">Documentation</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.byComplexity.SIMPLE}</div>
            <div className="text-xs text-muted-foreground">Simple</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.byComplexity.COMPLEXE + stats.byComplexity.TRES_COMPLEXE}
            </div>
            <div className="text-xs text-muted-foreground">Complex / Very Complex</div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Toolbar ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, title or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={complexityFilter}
          onValueChange={(v) => setComplexityFilter(v as TicketComplexity | 'ALL')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Complexity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Complexity</SelectItem>
            {Object.entries(TICKET_COMPLEXITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isManager && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUploadProjectId(selectedProject !== 'all' ? selectedProject : '');
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload WRICEF
            </Button>
            <Button
              size="sm"
              onClick={() => setEditingRow(emptyRow())}
              disabled={editingRow !== null}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Object
            </Button>
          </>
        )}
      </div>

      {/* ---- Main Table ---- */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filteredObjects.length === 0 && !editingRow ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No objects found.</p>
              {isManager && (
                <p className="text-sm mt-1">
                  Upload an Excel file or add objects manually.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-[120px]">Object ID</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-[130px]">Complexity</TableHead>
                  <TableHead className="w-[100px]">Module</TableHead>
                  <TableHead className="w-[140px]">Project</TableHead>
                  <TableHead className="w-[80px] text-center">Tickets</TableHead>
                  <TableHead className="w-[80px] text-center">Docs</TableHead>
                  {isManager && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* New row (add mode) */}
                {editingRow && !editingRow.id && (
                  <InlineEditRow
                    row={editingRow}
                    onChange={setEditingRow}
                    onSave={handleSaveRow}
                    onCancel={() => setEditingRow(null)}
                    projects={projects}
                    selectedProject={selectedProject}
                  />
                )}

                {filteredObjects.map((obj) => {
                  const isExpanded = expandedIds.has(obj.id);
                  const isEditing = editingRow?.id === obj.id;
                  const tickets = objTickets(obj);
                  const docs = objDocs(obj);

                  if (isEditing && editingRow) {
                    return (
                      <InlineEditRow
                        key={obj.id}
                        row={editingRow}
                        onChange={setEditingRow}
                        onSave={handleSaveRow}
                        onCancel={() => setEditingRow(null)}
                        projects={projects}
                        selectedProject={obj.projectId}
                      />
                    );
                  }

                  return (
                    <React.Fragment key={obj.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(obj.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {obj.wricefId}
                        </TableCell>
                        <TableCell>
                          {obj.type ? (
                            <Badge className={WRICEF_TYPE_COLORS[obj.type] + ' text-xs'}>
                              {obj.type} – {WRICEF_TYPE_LABELS[obj.type]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{obj.title}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[300px]">
                          {obj.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={complexityColor[obj.complexity as TicketComplexity] ?? ''}
                            variant="secondary"
                          >
                            {TICKET_COMPLEXITY_LABELS[obj.complexity as TicketComplexity] ??
                              obj.complexity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">{obj.module ? SAP_MODULE_LABELS[obj.module] ?? obj.module : '—'}</span>
                        </TableCell>
                        <TableCell className="text-sm">{projectName(obj.projectId)}</TableCell>
                        <TableCell className="text-center">{tickets.length}</TableCell>
                        <TableCell className="text-center">{docs.length}</TableCell>
                        {isManager && (
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  setEditingRow({
                                    id: obj.id,
                                    wricefId: obj.wricefId,
                                    type: obj.type ?? '',
                                    title: obj.title,
                                    description: obj.description,
                                    complexity: obj.complexity as TicketComplexity,
                                    module: obj.module ?? 'OTHER',
                                  })
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteObject(obj)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell
                            colSpan={isManager ? 11 : 10}
                            className="bg-muted/30 px-6 py-4"
                          >
                            <ExpandedDetail
                              wricefObject={obj}
                              tickets={tickets}
                              docs={docs}
                              projectName={projectName(obj.projectId)}
                              resolveUserName={userName}
                              onTicketClick={(ticketId) => navigate(`../tickets/${ticketId}`)}
                              onAddTicket={() => openCreateTicket(obj.id)}
                              onDeleteTicket={handleDeleteTicket}
                              onAddDoc={() => openCreateDoc(obj.id)}
                              onDeleteDoc={handleDeleteDoc}
                              isManager={isManager}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ---- Upload Excel Dialog ---- */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload WRICEF Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Project</Label>
              <Select value={uploadProjectId} onValueChange={setUploadProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Excel File (.xlsx, .xls)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                className="mt-1"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Expected columns: <strong>id</strong>, <strong>title</strong>,{' '}
                <strong>description</strong>, <strong>complexity</strong> (Simple / Moyen /
                Complexe / Très complexe)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadExcel} disabled={uploading || !uploadFile || !uploadProjectId}>
              {uploading ? 'Uploading…' : 'Upload & Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Create Ticket Dialog ---- */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5" />
              New Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                placeholder="Ticket title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Describe the ticket…"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nature</Label>
                <Select
                  value={ticketForm.nature}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, nature: v as TicketNature })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_NATURE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Module</Label>
                <Select
                  value={ticketForm.module}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, module: v as SAPModule })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SAP_MODULE_LABELS) as SAPModule[]).map((m) => (
                      <SelectItem key={m} value={m}>{SAP_MODULE_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v as Priority })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Complexity</Label>
                <Select
                  value={ticketForm.complexity}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, complexity: v as TicketComplexity })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_COMPLEXITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTicketOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={!ticketForm.title.trim()}>
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Create Documentation Dialog ---- */}
      <Dialog open={createDocOpen} onOpenChange={setCreateDocOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpenText className="h-5 w-5" />
              New Documentation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                placeholder="Documentation title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={docForm.type}
                onValueChange={(v) => setDocForm({ ...docForm, type: v as DocumentationObjectType })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENTATION_OBJECT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={docForm.description}
                onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                placeholder="Brief description…"
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={docForm.content}
                onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                placeholder="Documentation content…"
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDocOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDoc} disabled={!docForm.title.trim()}>
              Create Documentation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Edit Row Sub-component
// ---------------------------------------------------------------------------

function InlineEditRow({
  row,
  onChange,
  onSave,
  onCancel,
  projects,
  selectedProject,
}: {
  row: EditingRow;
  onChange: (r: EditingRow) => void;
  onSave: () => void;
  onCancel: () => void;
  projects: Project[];
  selectedProject: string;
}) {
  return (
    <TableRow className="bg-primary/5">
      <TableCell></TableCell>
      <TableCell>
        <Input
          value={row.wricefId}
          onChange={(e) => onChange({ ...row, wricefId: e.target.value })}
          placeholder="W-001"
          className="h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Select
          value={row.type}
          onValueChange={(v) => onChange({ ...row, type: v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {(['W','R','I','C','E','F'] as WricefType[]).map((t) => (
              <SelectItem key={t} value={t}>{t} – {WRICEF_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={row.title}
          onChange={(e) => onChange({ ...row, title: e.target.value })}
          placeholder="Object title"
          className="h-8 text-sm"
        />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Input
          value={row.description}
          onChange={(e) => onChange({ ...row, description: e.target.value })}
          placeholder="Description"
          className="h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Select
          value={row.complexity}
          onValueChange={(v) => onChange({ ...row, complexity: v as TicketComplexity })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_COMPLEXITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={row.module}
          onValueChange={(v) => onChange({ ...row, module: v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SAP_MODULE_LABELS) as SAPModule[]).map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {selectedProject !== 'all'
          ? projects.find((p) => p.id === selectedProject)?.name ?? '—'
          : '—'}
      </TableCell>
      <TableCell className="text-center">—</TableCell>
      <TableCell className="text-center">—</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSave}>
            <Save className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Expanded Detail Sub-component — rich ticket + documentation view
// ---------------------------------------------------------------------------

function ExpandedDetail({
  wricefObject,
  tickets,
  docs,
  projectName,
  resolveUserName,
  onTicketClick,
  onAddTicket,
  onDeleteTicket,
  onAddDoc,
  onDeleteDoc,
  isManager,
}: {
  wricefObject: WricefObject;
  tickets: Ticket[];
  docs: DocumentationObject[];
  projectName: string;
  resolveUserName: (uid: string | undefined) => string;
  onTicketClick?: (ticketId: string) => void;
  onAddTicket?: () => void;
  onDeleteTicket?: (ticketId: string) => void;
  onAddDoc?: () => void;
  onDeleteDoc?: (docId: string) => void;
  isManager?: boolean;
}) {
  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [tickets]);

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
  };

  return (
    <div className="space-y-5">
      {/* ---- Object Info Header ---- */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">Project:</strong> {projectName}
        </span>
        <span>
          <strong className="text-foreground">Object ID:</strong>{' '}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
            {wricefObject.wricefId}
          </code>
        </span>
        {wricefObject.description && (
          <span className="text-xs line-clamp-1 max-w-[400px]">
            {wricefObject.description}
          </span>
        )}
      </div>

      {/* ---- Status Breakdown ---- */}
      {tickets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[status] ?? ''}`}
            >
              {statusIcon[status]}
              {count} {TICKET_STATUS_LABELS[status as TicketStatus] ?? status}
            </div>
          ))}
        </div>
      )}

      {/* ---- Tickets & Documentation (side by side) ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Tickets Section ---- */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <TicketIcon className="h-4 w-4 text-primary" />
              Tickets ({tickets.length})
            </h4>
            {onAddTicket && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddTicket}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Ticket
              </Button>
            )}
          </div>
        {tickets.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No tickets linked to this object yet.
          </p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-border/70 bg-background p-3 hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/40"
                onClick={() => onTicketClick?.(t.id)}
              >
                {/* Row 1: Code, Title, Status, Priority, Delete */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                      {t.ticketCode}
                    </span>
                    <span className="font-medium text-sm truncate">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${statusColor[t.status] ?? ''}`}
                    >
                      {statusIcon[t.status]}
                      <span className="ml-1">
                        {TICKET_STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${priorityColor[t.priority] ?? ''}`}
                    >
                      {t.priority}
                    </Badge>
                    {onDeleteTicket && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTicket(t.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Row 2: Meta info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-medium text-foreground/70">Nature:</span>
                    {TICKET_NATURE_LABELS[t.nature] ?? t.nature}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="font-medium text-foreground/70">Module:</span>
                    {SAP_MODULE_LABELS[t.module] ?? t.module}
                  </span>
                  {t.assignedTo && (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {resolveUserName(t.assignedTo)}
                    </span>
                  )}
                  {t.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(t.dueDate)}
                    </span>
                  )}
                  {t.effortHours > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t.effortHours}h logged
                    </span>
                  )}
                  {t.estimationHours > 0 && (
                    <span>Est: {t.estimationHours}h</span>
                  )}
                </div>

                {/* Row 3: Description preview */}
                {t.description && (
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        </div>

        {/* ---- Documentation Section ---- */}
        <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <BookOpenText className="h-4 w-4 text-primary" />
            Documentation ({docs.length})
          </h4>
          {onAddDoc && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddDoc}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Doc
            </Button>
          )}
        </div>
        {docs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No documentation linked to this object yet.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-border/70 bg-background p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{d.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {DOCUMENTATION_OBJECT_TYPE_LABELS[d.type] ?? d.type}
                      </Badge>
                    </div>
                    {d.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {d.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {resolveUserName(d.authorId)}
                      </span>
                      <span>Updated: {formatDate(d.updatedAt ?? d.createdAt)}</span>
                      {d.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {d.attachments.length} file{d.attachments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {onDeleteDoc && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteDoc(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
