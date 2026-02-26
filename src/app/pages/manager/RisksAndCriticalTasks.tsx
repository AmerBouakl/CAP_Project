import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { NotificationsAPI, ProjectsAPI, TasksAPI, UsersAPI } from '../../services/odataClient';
import { Project, Task, TaskStatus, User } from '../../types/entities';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';

export const RisksAndCriticalTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyCritical, setShowOnlyCritical] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskData, projectData, userData] = await Promise.all([
        TasksAPI.getAll(),
        ProjectsAPI.getAll(),
        UsersAPI.getAll(),
      ]);
      setTasks(taskData);
      setProjects(projectData);
      setUsers(userData);
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const riskCondition =
        task.riskLevel === 'HIGH' ||
        task.riskLevel === 'CRITICAL' ||
        task.status === 'BLOCKED';
      if (showOnlyCritical) {
        return task.isCritical || riskCondition;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const score = (task: Task) => {
        let risk = 0;
        if (task.riskLevel === 'CRITICAL') risk += 40;
        if (task.riskLevel === 'HIGH') risk += 30;
        if (task.status === 'BLOCKED') risk += 20;
        if (task.isCritical) risk += 10;
        return risk;
      };
      return score(b) - score(a);
    });
  }, [showOnlyCritical, tasks]);

  const counts = useMemo(() => {
    return {
      blocked: tasks.filter((task) => task.status === 'BLOCKED').length,
      highRisk: tasks.filter((task) => task.riskLevel === 'HIGH').length,
      criticalRisk: tasks.filter((task) => task.riskLevel === 'CRITICAL').length,
      criticalTasks: tasks.filter((task) => task.isCritical).length,
    };
  }, [tasks]);

  const consultantAssignees = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role === 'CONSULTANT_TECHNIQUE' || user.role === 'CONSULTANT_FONCTIONNEL'
      ),
    [users]
  );

  const notifyAssignee = async (userId: string | undefined, title: string, message: string) => {
    if (!userId) return;
    try {
      await NotificationsAPI.create({
        userId,
        type: 'TASK_UPDATED',
        title,
        message,
        read: false,
      });
    } catch {
      // Silent in mock mode.
    }
  };

  const updateTask = async (taskId: string, patch: Partial<Task>): Promise<Task | null> => {
    try {
      const updated = await TasksAPI.update(taskId, patch);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
      return updated;
    } catch (error) {
      toast.error('Failed to update task');
      return null;
    }
  };

  const setMitigation = async (task: Task, mitigation: string) => {
    const nextComment = mitigation.trim();
    if ((task.comments ?? '') === nextComment) return;

    const updated = await updateTask(task.id, { comments: nextComment });
    if (updated) {
      await notifyAssignee(
        updated.assigneeId,
        'Mitigation Updated',
        `${updated.title}: mitigation notes were updated by manager.`
      );
    }
  };

  const setStatus = async (task: Task, status: TaskStatus) => {
    const updated = await updateTask(task.id, { status });
    if (updated) {
      await notifyAssignee(
        updated.assigneeId,
        'Task Status Updated',
        `${updated.title}: status changed to ${status}.`
      );
    }
  };

  const setRisk = async (task: Task, riskLevel: Task['riskLevel']) => {
    const updated = await updateTask(task.id, { riskLevel });
    if (updated) {
      await notifyAssignee(
        updated.assigneeId,
        'Risk Level Updated',
        `${updated.title}: risk level changed to ${riskLevel}.`
      );
    }
  };

  const setAssignee = async (task: Task, assigneeId: string) => {
    const nextAssigneeId = assigneeId || undefined;
    const updated = await updateTask(task.id, { assigneeId: nextAssigneeId });
    if (updated && nextAssigneeId) {
      await notifyAssignee(
        nextAssigneeId,
        'Task Reassigned',
        `${updated.title}: you have been assigned as mitigation owner.`
      );
    }
  };

  const setDeadline = async (task: Task, plannedEnd: string) => {
    if (!plannedEnd || task.plannedEnd === plannedEnd) return;
    const updated = await updateTask(task.id, { plannedEnd });
    if (updated) {
      await notifyAssignee(
        updated.assigneeId,
        'Deadline Updated',
        `${updated.title}: deadline changed to ${new Date(plannedEnd).toLocaleDateString()}.`
      );
    }
  };

  const statusOptions: TaskStatus[] = ['TO_DO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Risks & Critical Tasks"
        subtitle="Track blocked work, risk level and mitigation actions"
        breadcrumbs={[
          { label: 'Home', path: '/manager/dashboard' },
          { label: 'Risks & Critical Tasks' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Blocked Tasks</p>
            <p className="text-2xl font-semibold text-destructive">{counts.blocked}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">High Risk</p>
            <p className="text-2xl font-semibold text-primary">{counts.highRisk}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Critical Risk</p>
            <p className="text-2xl font-semibold text-destructive">{counts.criticalRisk}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Critical Tasks</p>
            <p className="text-2xl font-semibold text-foreground">{counts.criticalTasks}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <Label htmlFor="show-critical-risks" className="text-sm text-foreground">
              Show only critical or risky tasks
            </Label>
            <Switch
              id="show-critical-risks"
              checked={showOnlyCritical}
              onCheckedChange={(checked) => setShowOnlyCritical(Boolean(checked))}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {rows.length} tasks displayed
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Risk
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Deadline
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Mitigation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading risk register...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No matching tasks.
                  </td>
                </tr>
              ) : (
                rows.map((task) => (
                  <tr key={task.id} className="hover:bg-accent/40 align-top">
                    <td className="px-4 py-3 text-sm text-foreground">
                      <div className="font-medium flex items-center gap-2">
                        {task.title}
                        {task.isCritical && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-destructive/12 text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            Critical
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Planned end: {new Date(task.plannedEnd).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {projects.find((project) => project.id === task.projectId)?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Select
                        value={task.assigneeId ?? 'UNASSIGNED'}
                        onValueChange={(value) =>
                          void setAssignee(task, value === 'UNASSIGNED' ? '' : value)
                        }
                      >
                        <SelectTrigger aria-label={`Assignee for ${task.title}`} className="min-w-[190px]">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                          {consultantAssignees.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={task.status}
                        onValueChange={(value) => void setStatus(task, value as TaskStatus)}
                      >
                        <SelectTrigger aria-label={`Status for ${task.title}`} className="min-w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={task.riskLevel}
                        onValueChange={(value) => void setRisk(task, value as Task['riskLevel'])}
                      >
                        <SelectTrigger aria-label={`Risk level for ${task.title}`} className="min-w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">NONE</SelectItem>
                          <SelectItem value="LOW">LOW</SelectItem>
                          <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                          <SelectItem value="HIGH">HIGH</SelectItem>
                          <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        aria-label={`Deadline for ${task.title}`}
                        defaultValue={task.plannedEnd}
                        className="min-w-[170px]"
                        onBlur={(event) => void setDeadline(task, event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Textarea
                        aria-label={`Mitigation notes for ${task.title}`}
                        defaultValue={task.comments ?? ''}
                        onBlur={(event) => void setMitigation(task, event.target.value)}
                        placeholder="Mitigation action / blocker details"
                        rows={2}
                        className="w-full min-w-[240px]"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
