import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { useAuth } from '../../context/AuthContext';
import { NotificationsAPI, TasksAPI, UsersAPI } from '../../services/odataClient';
import { Task, TaskStatus, User } from '../../types/entities';
import { todayLocalDateKey } from '../../utils/date';

const TASK_STATUSES: { status: TaskStatus; label: string; tone: string }[] = [
  { status: 'TO_DO', label: 'To Do', tone: 'bg-muted' },
  { status: 'IN_PROGRESS', label: 'In Progress', tone: 'bg-accent' },
  { status: 'BLOCKED', label: 'Blocked', tone: 'bg-destructive/10' },
  { status: 'DONE', label: 'Done', tone: 'bg-primary/10' },
];

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TO_DO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['BLOCKED', 'DONE'],
  BLOCKED: ['IN_PROGRESS', 'DONE'],
  DONE: [],
  CANCELLED: [],
};

export const MyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      void loadTasks();
    }
  }, [currentUser]);

  const loadTasks = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [taskData, userData] = await Promise.all([
        TasksAPI.getByUser(currentUser.id),
        UsersAPI.getAll(),
      ]);
      setTasks(taskData);
      setUsers(userData);
    } finally {
      setLoading(false);
    }
  };

  const patchTaskInState = (taskId: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, ...patch } : prev));
  };

  const persistTask = async (taskId: string, patch: Partial<Task>, successMessage: string) => {
    try {
      const updated = await TasksAPI.update(taskId, patch);
      patchTaskInState(taskId, updated);
      toast.success(successMessage);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const createLocalNotification = async (title: string, message: string) => {
    if (!currentUser) return;
    try {
      await NotificationsAPI.create({
        userId: currentUser.id,
        type: 'TASK_UPDATED',
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      // No-op in mock mode.
    }
  };

  const getAllowedStatuses = (status: TaskStatus) => {
    return [status, ...(ALLOWED_TRANSITIONS[status] ?? [])];
  };

  const updateTaskStatus = async (task: Task, newStatus: TaskStatus) => {
    const allowed = getAllowedStatuses(task.status);
    if (!allowed.includes(newStatus)) {
      toast.error(`Invalid lifecycle transition: ${task.status} -> ${newStatus}`);
      return;
    }

    const patch: Partial<Task> = {
      status: newStatus,
      progressPercent: newStatus === 'DONE' ? 100 : task.progressPercent,
      realEnd: newStatus === 'DONE' ? todayLocalDateKey() : task.realEnd,
    };
    await persistTask(task.id, patch, 'Task status updated');
    await createLocalNotification('Task Status Updated', `${task.title}: ${newStatus}`);
  };

  const updateTaskProgress = async (task: Task, progress: number) => {
    const safeProgress = Math.min(100, Math.max(0, progress));
    const patch: Partial<Task> = {
      progressPercent: safeProgress,
      status: safeProgress === 100 ? 'DONE' : task.status,
      realEnd: safeProgress === 100 ? todayLocalDateKey() : task.realEnd,
    };
    await persistTask(task.id, patch, 'Progress updated');
  };

  const updateTaskComment = async (task: Task, comment: string) => {
    await persistTask(task.id, { comments: comment }, 'Comments updated');
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const getPriorityTone = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-destructive/12 text-destructive';
      case 'HIGH':
        return 'bg-primary/12 text-primary';
      case 'MEDIUM':
        return 'bg-accent text-accent-foreground';
      case 'LOW':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isOverdue = (task: Task) => {
    return task.status !== 'DONE' && new Date(task.plannedEnd) < new Date() && !task.realEnd;
  };

  const functionalContact = useMemo(() => {
    return users.find((user) => user.role === 'CONSULTANT_FONCTIONNEL');
  }, [users]);

  const openTeamsDiscussion = () => {
    if (!currentUser || !functionalContact) return;
    const usersParam = encodeURIComponent(`${currentUser.email},${functionalContact.email}`);
    const message = encodeURIComponent(
      `Question regarding task: ${selectedTask?.title ?? 'Current task'}`
    );
    window.open(
      `https://teams.microsoft.com/l/chat/0/0?users=${usersParam}&message=${message}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="My Tasks"
        subtitle="Manage your tasks using the Kanban board"
        breadcrumbs={[
          { label: 'Home', path: '/consultant-tech/dashboard' },
          { label: 'My Tasks' },
        ]}
      />

      <div className="p-6 lg:p-8">
        {loading ? (
          <div className="text-muted-foreground">Loading tasks...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TASK_STATUSES.map(({ status, label, tone }) => (
              <div key={status} className="flex flex-col">
                <div className={cn('rounded-t-lg border-b border-border px-4 py-3', tone)}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{label}</h3>
                    <span className="rounded-full bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                      {getTasksByStatus(status).length}
                    </span>
                  </div>
                </div>

                <div className="min-h-[500px] flex-1 space-y-3 rounded-b-lg bg-surface-2 p-4">
                  {getTasksByStatus(status).map((task) => (
                    <article key={task.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                      <h4 className="font-medium text-foreground">{task.title}</h4>

                      <Badge className={cn('mt-2', getPriorityTone(task.priority))}>{task.priority}</Badge>

                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{task.progressPercent}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{ width: `${task.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="mr-1 h-3 w-3" />
                          <span>Due: {new Date(task.plannedEnd).toLocaleDateString()}</span>
                          {isOverdue(task) && <AlertCircle className="ml-1 h-3 w-3 text-destructive" />}
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          <span>
                            {task.actualHours}h / {task.estimatedHours}h
                          </span>
                        </div>

                        {task.isCritical && (
                          <Badge className="bg-destructive/12 text-destructive">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Critical
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                        <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedTask(task)}>
                          Details
                        </Button>

                        {status !== 'DONE' && (
                          <Select
                            value={task.status}
                            onValueChange={(value) =>
                              void updateTaskStatus(task, value as TaskStatus)
                            }
                          >
                            <SelectTrigger
                              aria-label={`Update status for ${task.title}`}
                              className="h-8 flex-1 text-xs"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllowedStatuses(task.status).map((allowedStatus) => (
                                <SelectItem key={allowedStatus} value={allowedStatus}>
                                  Move to{' '}
                                  {TASK_STATUSES.find((entry) => entry.status === allowedStatus)?.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </article>
                  ))}

                  {getTasksByStatus(status).length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">No tasks</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedTask && (
            <>
              <SheetHeader className="p-6 pb-0">
                <SheetTitle>{selectedTask.title}</SheetTitle>
                <SheetDescription>Update progress, status, and blockers.</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 p-6">
                <div>
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea id="task-description" value={selectedTask.description} disabled rows={3} />
                </div>

                <div>
                  <Label htmlFor="task-progress-slider">Progress: {selectedTask.progressPercent}%</Label>
                  <input
                    id="task-progress-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={selectedTask.progressPercent}
                    onChange={(event) =>
                      void updateTaskProgress(selectedTask, Number(event.target.value))
                    }
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-status">Status</Label>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(value) => void updateTaskStatus(selectedTask, value as TaskStatus)}
                  >
                    <SelectTrigger id="task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllowedStatuses(selectedTask.status).map((status) => (
                        <SelectItem key={status} value={status}>
                          {TASK_STATUSES.find((entry) => entry.status === status)?.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-planned-start">Planned Start</Label>
                    <Input id="task-planned-start" type="date" value={selectedTask.plannedStart} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="task-planned-end">Planned End</Label>
                    <Input id="task-planned-end" type="date" value={selectedTask.plannedEnd} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-estimated-hours">Estimated Hours</Label>
                    <Input
                      id="task-estimated-hours"
                      type="number"
                      value={selectedTask.estimatedHours}
                      disabled
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="task-actual-hours">Actual Hours</Label>
                    <Input id="task-actual-hours" type="number" value={selectedTask.actualHours} disabled />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-comments">Comments / Blockers</Label>
                  <Textarea
                    id="task-comments"
                    value={selectedTask.comments || ''}
                    onChange={(event) =>
                      setSelectedTask((prev) =>
                        prev ? { ...prev, comments: event.target.value } : prev
                      )
                    }
                    onBlur={(event) => void updateTaskComment(selectedTask, event.target.value)}
                    rows={4}
                    placeholder="Describe blockers, dependencies, or notes..."
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={openTeamsDiscussion}
                  className="w-full"
                  disabled={!functionalContact}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Teams Discussion (Functional Consultant)
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
