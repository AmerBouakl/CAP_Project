import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Edit3, Plus, RefreshCcw, Trash2, FolderSearch, Upload, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { ProjectsAPI, WricefObjectsAPI } from '../../services/odataClient';
import { Priority, Project, ProjectStatus } from '../../types/entities';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const STATUS_OPTIONS: ProjectStatus[] = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const PRIORITY_OPTIONS: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

type DialogMode = 'create' | 'edit' | null;

interface ProjectFormState {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  endDate: string;
  progress: number;
  budget: string;
}

const DEFAULT_FORM: ProjectFormState = {
  name: '',
  description: '',
  status: 'PLANNED',
  priority: 'MEDIUM',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  progress: 0,
  budget: '',
};

const statusStyles: Record<ProjectStatus, string> = {
  PLANNED: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-primary/12 text-primary',
  ON_HOLD: 'bg-accent text-accent-foreground',
  COMPLETED: 'bg-secondary text-secondary-foreground',
  CANCELLED: 'bg-destructive/12 text-destructive',
};

const priorityStyles: Record<Priority, string> = {
  LOW: 'bg-secondary text-secondary-foreground',
  MEDIUM: 'bg-accent text-accent-foreground',
  HIGH: 'bg-primary/12 text-primary',
  CRITICAL: 'bg-destructive/12 text-destructive',
};

export const ProjectsEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);

  // WRICEF Excel upload with project creation
  const [wricefFile, setWricefFile] = useState<{ name: string; base64: string } | null>(null);
  const wricefFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await ProjectsAPI.getAll();
      setProjects(data);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || project.priority === priorityFilter;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [projects, priorityFilter, searchQuery, statusFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

  const openCreateDialog = () => {
    setSelectedProject(null);
    setForm(DEFAULT_FORM);
    setDialogMode('create');
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setForm({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      endDate: project.endDate,
      progress: project.progress ?? 0,
      budget: project.budget !== undefined ? String(project.budget) : '',
    });
    setDialogMode('edit');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedProject(null);
    setForm(DEFAULT_FORM);
    setWricefFile(null);
  };

  const handleWricefFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      setWricefFile({ name: file.name, base64 });
    } catch {
      toast.error('Failed to read file');
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    if (!form.startDate || !form.endDate) {
      toast.error('Start and end dates are required');
      return;
    }

    if (form.endDate < form.startDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    const progress = Math.max(0, Math.min(100, Number(form.progress) || 0));
    const budgetValue = form.budget.trim() === '' ? undefined : Number(form.budget);

    if (budgetValue !== undefined && Number.isNaN(budgetValue)) {
      toast.error('Budget must be a valid number');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      startDate: form.startDate,
      endDate: form.endDate,
      progress,
      budget: budgetValue,
      managerId: selectedProject?.managerId ?? currentUser?.id ?? 'u2',
    };

    try {
      setSaving(true);
      if (dialogMode === 'create') {
        const created = await ProjectsAPI.create(payload);
        setProjects((prev) => [created, ...prev]);

        // Upload WRICEF Excel if attached
        if (wricefFile) {
          try {
            const wricefResult = await WricefObjectsAPI.uploadExcel(created.id, wricefFile.base64);
            toast.success(
              `Project created with ${wricefResult.length} WRICEF object${wricefResult.length !== 1 ? 's' : ''}`
            );
          } catch {
            toast.success('Project created, but WRICEF upload failed');
          }
        } else {
          toast.success('Project created successfully');
        }
      } else if (dialogMode === 'edit' && selectedProject) {
        const updated = await ProjectsAPI.update(selectedProject.id, payload);
        setProjects((prev) =>
          prev.map((project) => (project.id === selectedProject.id ? updated : project))
        );
        toast.success('Project updated successfully');
      }
      closeDialog();
    } catch (error) {
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await ProjectsAPI.delete(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      toast.success('Project deleted');
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setProjectPendingDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <PageHeader
        title="Projects"
        subtitle="Portfolio pipeline with smart filtering, quick edits, and KPI context"
        breadcrumbs={[
          { label: 'Home', path: '/manager/dashboard' },
          { label: 'Projects' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadProjects()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Card className="bg-card/92">
          <CardContent className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-[2fr_1fr_1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="projects-search" className="sr-only">
                Search projects
              </Label>
              <Input
                id="projects-search"
                placeholder="Search by name or description"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="projects-status-filter" className="sr-only">
                Filter by status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'ALL')}
              >
                <SelectTrigger id="projects-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="projects-priority-filter" className="sr-only">
                Filter by priority
              </Label>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as Priority | 'ALL')}
              >
                <SelectTrigger id="projects-priority-filter">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="secondary" onClick={resetFilters}>
              Reset
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-card/92">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-muted/65">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Timeline
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Loading projects...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-sm text-muted-foreground">
                          <FolderSearch className="h-8 w-8 text-muted-foreground" />
                          <p>No projects match the current filters.</p>
                          <Button variant="secondary" size="sm" onClick={openCreateDialog}>
                            <Plus className="h-4 w-4" />
                            Create project
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => (
                      <tr key={project.id} className="border-t border-border/60 transition hover:bg-accent/35">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/manager/projects/${project.id}`)}
                            className="text-left font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {project.name}
                          </button>
                          <p className="mt-1 line-clamp-2 max-w-[360px] text-xs text-muted-foreground">
                            {project.description}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusStyles[project.status]}>{project.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={priorityStyles[project.priority]}>{project.priority}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <div>{new Date(project.startDate).toLocaleDateString()}</div>
                          <div>{new Date(project.endDate).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-44">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>{project.progress ?? 0}%</span>
                            </div>
                            <Progress value={project.progress ?? 0} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {project.budget !== undefined ? `€${project.budget.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(project)}
                              aria-label={`Edit ${project.name}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setProjectPendingDelete(project)}
                              aria-label={`Delete ${project.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Create Project' : 'Edit Project'}</DialogTitle>
            <DialogDescription>
              Capture project planning metadata and portfolio tracking fields.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={saveProject}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="S/4HANA Migration Program"
                  required
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Describe project scope, outcomes, and execution context"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, status: value as ProjectStatus }))
                  }
                >
                  <SelectTrigger id="project-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-priority">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, priority: value as Priority }))
                  }
                >
                  <SelectTrigger id="project-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-start-date">Start Date</Label>
                <Input
                  id="project-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-end-date">End Date</Label>
                <Input
                  id="project-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-progress">Progress (%)</Label>
                <Input
                  id="project-progress"
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, progress: Number(event.target.value || 0) }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-budget">Budget (EUR)</Label>
                <Input
                  id="project-budget"
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                  placeholder="Optional"
                />
              </div>

              {dialogMode === 'create' && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Upload WRICEF (Excel)</Label>
                  <p className="text-xs text-muted-foreground">
                    Optionally upload an Excel file to initialize WRICEF objects for this project.
                  </p>
                  <input
                    ref={wricefFileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => void handleWricefFileSelect(e)}
                  />
                  {!wricefFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => wricefFileRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload WRICEF Excel
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">{wricefFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setWricefFile(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? dialogMode === 'create'
                    ? 'Creating...'
                    : 'Saving...'
                  : dialogMode === 'create'
                    ? 'Create Project'
                    : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={projectPendingDelete !== null}
        onOpenChange={(open) => !open && setProjectPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              {projectPendingDelete
                ? `This will remove "${projectPendingDelete.name}" from the mock portfolio data.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => projectPendingDelete && void deleteProject(projectPendingDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
