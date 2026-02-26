import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { ProjectsAPI, TasksAPI, UsersAPI } from '../../services/odataClient';
import { Project, Task, User } from '../../types/entities';
import { useAuth } from '../../context/AuthContext';

export const MyProjects: React.FC = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    void loadData(currentUser.id);
  }, [currentUser]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [userTasks, allProjects, allUsers] = await Promise.all([
        TasksAPI.getByUser(userId),
        ProjectsAPI.getAll(),
        UsersAPI.getAll(),
      ]);

      const projectIds = new Set(userTasks.map((task) => task.projectId));
      setProjects(allProjects.filter((project) => projectIds.has(project.id)));
      setTasks(userTasks);
      setUsers(allUsers);
    } finally {
      setLoading(false);
    }
  };

  const projectsWithStats = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      const done = projectTasks.filter((task) => task.status === 'DONE').length;
      const blocked = projectTasks.filter((task) => task.status === 'BLOCKED').length;
      const progress = projectTasks.length
        ? projectTasks.reduce((sum, task) => sum + task.progressPercent, 0) /
          projectTasks.length
        : project.progress ?? 0;
      const manager = users.find((user) => user.id === project.managerId);
      return { project, manager, done, blocked, progress, projectTasks };
    });
  }, [projects, tasks, users]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="My Projects"
        subtitle="Read-only overview of your assigned projects and tasks"
        breadcrumbs={[
          { label: 'Home', path: '/consultant-tech/dashboard' },
          { label: 'My Projects' },
        ]}
      />

      <div className="p-6">
        {loading ? (
          <div className="text-muted-foreground">Loading projects...</div>
        ) : projectsWithStats.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
            No projects assigned yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projectsWithStats.map(({ project, manager, done, blocked, progress, projectTasks }) => (
              <div key={project.id} className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded border border-border">
                    <p className="text-muted-foreground text-xs">Manager</p>
                    <p className="font-medium text-foreground">{manager?.name ?? 'Unknown'}</p>
                  </div>
                  <div className="p-3 rounded border border-border">
                    <p className="text-muted-foreground text-xs">Period</p>
                    <p className="font-medium text-foreground">
                      {new Date(project.startDate).toLocaleDateString()} -{' '}
                      {new Date(project.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">My Progress</span>
                    <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border border-border p-2 text-center">
                    <div className="text-xl font-semibold text-foreground">{projectTasks.length}</div>
                    <div className="text-xs text-muted-foreground">Assigned</div>
                  </div>
                  <div className="rounded border border-border p-2 text-center">
                    <div className="text-xl font-semibold text-primary">{done}</div>
                    <div className="text-xs text-muted-foreground">Done</div>
                  </div>
                  <div className="rounded border border-border p-2 text-center">
                    <div className="text-xl font-semibold text-destructive">{blocked}</div>
                    <div className="text-xs text-muted-foreground">Blocked</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
