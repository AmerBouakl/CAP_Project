import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  DeliverablesAPI,
  NotificationsAPI,
  ProjectsAPI,
  TasksAPI,
  UsersAPI,
} from '../../services/odataClient';
import { Deliverable, Project, Task, User } from '../../types/entities';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

interface ProjectFeedback {
  author: string;
  content: string;
  createdAt: string;
}

export const FuncProjects: React.FC = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackHistory, setFeedbackHistory] = useState<Record<string, ProjectFeedback[]>>({});

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectData, deliverableData, taskData, userData] = await Promise.all([
        ProjectsAPI.getAll(),
        DeliverablesAPI.getAll(),
        TasksAPI.getAll(),
        UsersAPI.getAll(),
      ]);
      setProjects(projectData);
      setDeliverables(deliverableData);
      setTasks(taskData);
      setUsers(userData);
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    return projects.map((project) => {
      const projectDeliverables = deliverables.filter((deliverable) => deliverable.projectId === project.id);
      const pending = projectDeliverables.filter((deliverable) => deliverable.validationStatus === 'PENDING').length;
      const changes = projectDeliverables.filter(
        (deliverable) => deliverable.validationStatus === 'CHANGES_REQUESTED'
      ).length;
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      const blocked = projectTasks.filter((task) => task.status === 'BLOCKED').length;
      const manager = users.find((user) => user.id === project.managerId);
      const technicalConsultant = users.find(
        (user) =>
          user.role === 'CONSULTANT_TECHNIQUE' &&
          projectTasks.some((task) => task.assigneeId === user.id)
      );
      return { project, pending, changes, blocked, manager, technicalConsultant };
    });
  }, [deliverables, projects, tasks, users]);

  const openTeamsDiscussion = (tech?: User) => {
    if (!currentUser || !tech) return;
    const usersParam = encodeURIComponent(`${currentUser.email},${tech.email}`);
    const message = encodeURIComponent('Need clarification on business requirements for current project.');
    window.open(
      `https://teams.microsoft.com/l/chat/0/0?users=${usersParam}&message=${message}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const submitFeedback = async (project: Project, manager?: User) => {
    if (!currentUser) return;
    const content = (feedbackDrafts[project.id] ?? '').trim();

    if (content.length < 10) {
      toast.error('Project feedback must contain at least 10 characters');
      return;
    }

    setFeedbackHistory((prev) => ({
      ...prev,
      [project.id]: [
        {
          author: currentUser.name,
          content,
          createdAt: new Date().toISOString(),
        },
        ...(prev[project.id] ?? []),
      ],
    }));
    setFeedbackDrafts((prev) => ({ ...prev, [project.id]: '' }));

    if (manager) {
      try {
        await NotificationsAPI.create({
          userId: manager.id,
          type: 'PROJECT_FEEDBACK',
          title: 'New Functional Project Feedback',
          message: `${currentUser.name} submitted a project feedback for ${project.name}.`,
          read: false,
        });
      } catch {
        // Silent in mock mode.
      }
    }

    toast.success('Project feedback submitted');
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Projects"
        subtitle="Functional perimeter, deliverables status and collaboration entry points"
        breadcrumbs={[
          { label: 'Home', path: '/consultant-func/dashboard' },
          { label: 'Projects' },
        ]}
      />

      <div className="p-6">
        {loading ? (
          <div className="text-muted-foreground">Loading projects...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rows.map(({ project, pending, changes, blocked, manager, technicalConsultant }) => (
              <div key={project.id} className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded border border-border">
                    <div className="text-xs text-muted-foreground">Manager</div>
                    <div className="font-medium text-foreground">{manager?.name ?? 'Unknown'}</div>
                  </div>
                  <div className="p-3 rounded border border-border">
                    <div className="text-xs text-muted-foreground">Tech Contact</div>
                    <div className="font-medium text-foreground">
                      {technicalConsultant?.name ?? 'Not assigned'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border border-border p-2 text-center">
                    <div className="text-xl font-semibold text-primary">{pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="rounded border border-border p-2 text-center">
                    <div className="text-xl font-semibold text-destructive">{changes}</div>
                    <div className="text-xs text-muted-foreground">Changes Req.</div>
                  </div>
                  <div className="rounded border border-border p-2 text-center">
                    <div className="text-xl font-semibold text-accent-foreground">{blocked}</div>
                    <div className="text-xs text-muted-foreground">Blocked Tasks</div>
                  </div>
                </div>

                <button
                  onClick={() => openTeamsDiscussion(technicalConsultant)}
                  disabled={!technicalConsultant}
                  className="w-full px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Teams Chat
                </button>

                <div className="space-y-2 rounded border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Project Feedback
                  </p>
                  <Textarea
                    value={feedbackDrafts[project.id] ?? ''}
                    onChange={(event) =>
                      setFeedbackDrafts((prev) => ({ ...prev, [project.id]: event.target.value }))
                    }
                    rows={3}
                    placeholder="Share business feedback, blockers, or requested adjustments..."
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void submitFeedback(project, manager)}
                  >
                    Submit Feedback
                  </Button>

                  {(feedbackHistory[project.id] ?? []).slice(0, 2).map((feedback, index) => (
                    <div key={`${project.id}-feedback-${index}`} className="rounded bg-surface-2 p-2 text-xs">
                      <p className="font-medium text-foreground">{feedback.author}</p>
                      <p className="mt-1 text-muted-foreground">{feedback.content}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(feedback.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
