import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { BookOpenText, ExternalLink, FilePlus2, Paperclip, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
import { Textarea } from '../../components/ui/textarea';
import { useAuth } from '../../context/AuthContext';
import {
  DocumentationAPI,
  ProjectsAPI,
  TicketsAPI,
  UsersAPI,
  WricefObjectsAPI,
} from '../../services/odataClient';
import {
  DocumentationAttachment,
  DocumentationObject,
  DocumentationObjectType,
  DOCUMENTATION_OBJECT_TYPE_LABELS,
  Project,
  Ticket,
  User,
  UserRole,
  WricefObject,
} from '../../types/entities';

type TypeFilter = DocumentationObjectType | 'ALL';

const homePathByRole: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  MANAGER: '/manager/dashboard',
  PROJECT_MANAGER: '/project-manager/dashboard',
  DEV_COORDINATOR: '/dev-coordinator/dashboard',
  CONSULTANT_TECHNIQUE: '/consultant-tech/dashboard',
  CONSULTANT_FONCTIONNEL: '/consultant-func/dashboard',
};

const formatDate = (value: string) => new Date(value).toLocaleString();

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const buildDefaultContent = (title: string) =>
  `# ${title}\n\n## Scope\n-\n\n## Functional Details\n-\n\n## Technical Notes\n-\n`;

interface CreateFormState {
  title: string;
  description: string;
  type: DocumentationObjectType;
  content: string;
  projectId: string;
  wricefObjectId: string;
  attachments: DocumentationAttachment[];
}

const EMPTY_FORM: CreateFormState = {
  title: '',
  description: '',
  type: 'GENERAL',
  content: '',
  projectId: '',
  wricefObjectId: '',
  attachments: [],
};

export const DocumentationObjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [documentationObjects, setDocumentationObjects] = useState<DocumentationObject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [wricefObjects, setWricefObjects] = useState<WricefObject[]>([]);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [docData, projectData, ticketData, userData, wricefData] = await Promise.all([
          DocumentationAPI.getAll(),
          ProjectsAPI.getAll(),
          TicketsAPI.getAll(),
          UsersAPI.getAll(),
          WricefObjectsAPI.getAll(),
        ]);

        setDocumentationObjects(
          [...docData].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
        );
        setProjects(projectData);
        setTickets(ticketData);
        setUsers(userData);
        setWricefObjects(wricefData);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const projectWricefObjects = useMemo(
    () => wricefObjects.filter((o) => o.projectId === form.projectId),
    [wricefObjects, form.projectId]
  );

  const filteredObjects = useMemo(() => {
    return documentationObjects.filter((doc) => {
      if (projectFilter !== 'ALL' && doc.projectId !== projectFilter) return false;
      if (typeFilter !== 'ALL' && doc.type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;

      const projectName = projects.find((project) => project.id === doc.projectId)?.name ?? '';
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        projectName.toLowerCase().includes(query)
      );
    });
  }, [documentationObjects, projectFilter, typeFilter, searchQuery, projects]);

  const countsByType = useMemo(() => {
    const counts: Record<DocumentationObjectType, number> = {
      SFD: 0,
      GUIDE: 0,
      ARCHITECTURE_DOC: 0,
      GENERAL: 0,
    };
    documentationObjects.forEach((doc) => {
      counts[doc.type] += 1;
    });
    return counts;
  }, [documentationObjects]);

  const openCreateDialog = () => {
    setForm(EMPTY_FORM);
    setIsCreateOpen(true);
  };

  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const additions: DocumentationAttachment[] = Array.from(files).map((file) => ({
      filename: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...additions] }));
    event.target.value = '';
  };

  const submitCreate = async () => {
    if (!currentUser) return;
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.projectId) {
      toast.error('Project is required');
      return;
    }
    if (!form.wricefObjectId) {
      toast.error('Object is required');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Content is required');
      return;
    }

    try {
      setIsCreating(true);
      const created = await DocumentationAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        content: form.content.trim(),
        attachments: form.attachments,
        wricefObjectId: form.wricefObjectId,
        projectId: form.projectId,
        authorId: currentUser.id,
      });

      setDocumentationObjects((prev) =>
        [created, ...prev].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
      );
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success('Object created');
    } catch {
      toast.error('Failed to create object');
    } finally {
      setIsCreating(false);
    }
  };

  const userName = (userId: string) => users.find((user) => user.id === userId)?.name ?? userId;
  const projectName = (projectId: string) =>
    projects.find((project) => project.id === projectId)?.name ?? projectId;

  if (currentUser?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const homePath = currentUser ? homePathByRole[currentUser.role] : '/dashboard';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Documentation Objects"
        subtitle="Centralized project documentation, SFDs, guides, and architecture notes"
        breadcrumbs={[
          { label: 'Home', path: homePath },
          { label: 'Objects' },
        ]}
        actions={
          <Button onClick={openCreateDialog}>
            <FilePlus2 className="mr-1 h-4 w-4" />
            New Object
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search objects by title, content, project..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {(Object.keys(DOCUMENTATION_OBJECT_TYPE_LABELS) as DocumentationObjectType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENTATION_OBJECT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Objects</p>
              <p className="text-2xl font-semibold text-foreground">{filteredObjects.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(Object.keys(DOCUMENTATION_OBJECT_TYPE_LABELS) as DocumentationObjectType[]).map((type) => (
            <Card key={type}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {DOCUMENTATION_OBJECT_TYPE_LABELS[type]}
                  </p>
                  <p className="text-lg font-semibold text-foreground">{countsByType[type]}</p>
                </div>
                <BookOpenText className="h-4 w-4 text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-base">Knowledge Base Objects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/55">
                <TableRow>
                  <TableHead className="px-4">Title</TableHead>
                  <TableHead className="px-4">Type</TableHead>
                  <TableHead className="px-4">Project</TableHead>
                  <TableHead className="px-4">Object</TableHead>
                  <TableHead className="px-4">Files</TableHead>
                  <TableHead className="px-4">Author</TableHead>
                  <TableHead className="px-4">Updated</TableHead>
                  <TableHead className="px-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Loading objects...
                    </TableCell>
                  </TableRow>
                ) : filteredObjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No objects found for current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredObjects.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-accent/30">
                      <TableCell className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{doc.title}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{doc.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline">{DOCUMENTATION_OBJECT_TYPE_LABELS[doc.type]}</Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {projectName(doc.projectId)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="secondary">
                          {wricefObjects.find((o) => o.id === doc.wricefObjectId)?.wricefId ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          {doc.attachments.length}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">{userName(doc.authorId)}</TableCell>
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(doc.updatedAt ?? doc.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/shared/documentation/${doc.id}`)}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Documentation Object</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label htmlFor="new-object-title">Title *</Label>
                <Input
                  id="new-object-title"
                  value={form.title}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      title: value,
                      content: prev.content || buildDefaultContent(value || 'Documentation Object'),
                    }));
                  }}
                  placeholder="Documentation object title"
                />
              </div>
              <div>
                <Label htmlFor="new-object-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, type: value as DocumentationObjectType }))
                  }
                >
                  <SelectTrigger id="new-object-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOCUMENTATION_OBJECT_TYPE_LABELS) as DocumentationObjectType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {DOCUMENTATION_OBJECT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="new-object-project">Project *</Label>
              <Select
                value={form.projectId}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    projectId: value,
                    wricefObjectId: '',
                  }))
                }
              >
                <SelectTrigger id="new-object-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="new-object-description">Overview</Label>
              <Textarea
                id="new-object-description"
                rows={2}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="High-level summary of this object"
              />
            </div>

            <div>
              <Label htmlFor="new-object-content">Content *</Label>
              <Textarea
                id="new-object-content"
                rows={12}
                className="font-mono text-sm"
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="Write markdown-like content for this documentation object"
              />
            </div>

            <div>
              <Label htmlFor="new-object-files">Attached Files</Label>
              <Input id="new-object-files" type="file" multiple onChange={handleFileAttach} />
              {form.attachments.length > 0 && (
                <div className="mt-2 space-y-1 rounded-md border border-border/70 bg-muted/20 p-2">
                  {form.attachments.map((file, index) => (
                    <div key={`${file.filename}-${index}`} className="text-xs text-muted-foreground">
                      {file.filename} ({formatFileSize(file.size)})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="new-object-wricef">Object *</Label>
              {!form.projectId ? (
                <p className="text-xs text-muted-foreground">Select a project first.</p>
              ) : projectWricefObjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">No WRICEF objects found for this project.</p>
              ) : (
                <Select
                  value={form.wricefObjectId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, wricefObjectId: value }))}
                >
                  <SelectTrigger id="new-object-wricef" className="mt-1">
                    <SelectValue placeholder="Select WRICEF object" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectWricefObjects.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.wricefId} – {obj.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Object'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

