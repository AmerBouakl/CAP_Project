import React, { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { useAuth } from '../../context/AuthContext';
import { EvaluationsAPI, ProjectsAPI, TasksAPI, TimesheetsAPI } from '../../services/odataClient';
import { Evaluation, Project, Task, Timesheet } from '../../types/entities';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { getFridayOfWeek, getMondayOfWeek, toLocalDateKey } from '../../utils/date';

export const TechDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const loadDashboardData = async () => {
      setLoading(true);

      try {
        const [taskData, allProjects, evals, timesheetData] = await Promise.all([
          TasksAPI.getByUser(currentUser.id),
          ProjectsAPI.getAll(),
          EvaluationsAPI.getByUser(currentUser.id),
          TimesheetsAPI.getByUser(currentUser.id),
        ]);

        const myProjectIds = new Set(taskData.map((task) => task.projectId));
        setTasks(taskData);
        setProjects(allProjects.filter((project) => myProjectIds.has(project.id)));
        setEvaluations(evals);
        setTimesheets(timesheetData);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, [currentUser]);

  const myTasksCount = tasks.length;
  const overdueTasks = tasks.filter(
    (task) => task.status !== 'DONE' && new Date(task.plannedEnd) < new Date() && !task.realEnd
  ).length;

  const weekStart = toLocalDateKey(getMondayOfWeek(new Date()));
  const weekEnd = toLocalDateKey(getFridayOfWeek(new Date()));
  const hoursThisWeek = timesheets
    .filter((entry) => entry.date >= weekStart && entry.date <= weekEnd)
    .reduce((sum, entry) => sum + entry.hours, 0);

  const activeProjects = projects.filter((project) => project.status === 'ACTIVE').length;
  const averageScore =
    evaluations.length > 0
      ? evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length
      : 0;

  const upcomingTasks = tasks
    .filter((task) => task.status === 'TO_DO' || task.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.plannedEnd).getTime() - new Date(b.plannedEnd).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-transparent">
      <PageHeader
        title={`Welcome back, ${currentUser?.name.split(' ')[0] ?? 'Consultant'}`}
        subtitle="Execution cockpit for your deliveries, workload, and quality score"
        breadcrumbs={[{ label: 'My Dashboard' }]}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KPICard title="My Tasks" value={myTasksCount} icon="task" color="blue" />
          <KPICard title="Overdue Tasks" value={overdueTasks} icon="alert" color="red" />
          <KPICard title="Hours This Week" value={hoursThisWeek} icon="timesheet" color="green" />
          <KPICard
            title="Active Projects"
            value={activeProjects}
            icon="project-definition-triangle-2"
            color="yellow"
          />
          <KPICard
            title="Performance Score"
            value={averageScore.toFixed(1)}
            unit="/5"
            icon="trend-up"
            color="blue"
            progress={(averageScore / 5) * 100}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
          <Card className="bg-card/92">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => navigate('/consultant-tech/tasks')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
              ) : upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
              ) : (
                upcomingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate('/consultant-tech/tasks')}
                    className="w-full rounded-xl border border-border/70 bg-surface-1 p-4 text-left transition hover-lift"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{task.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {task.priority}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Due {new Date(task.plannedEnd).toLocaleDateString()}
                      </span>
                      <span>{task.progressPercent}% done</span>
                    </div>
                    <Progress className="mt-2" value={task.progressPercent} />
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/92">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Assigned Projects</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/consultant-tech/projects')}
              >
                Open Projects
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assigned projects.</p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="rounded-xl border border-border/70 bg-surface-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{project.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {project.description}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-1 text-xs font-medium text-primary">
                        <FolderKanban className="h-3.5 w-3.5" />
                        {project.status}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{project.progress ?? 0}%</span>
                      </div>
                      <Progress value={project.progress ?? 0} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/92">
          <CardHeader>
            <CardTitle className="text-lg">Productivity Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-surface-1 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">This Week</p>
              <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Clock3 className="h-5 w-5 text-primary" />
                {hoursThisWeek}h
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-1 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Tasks Completed</p>
              <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {tasks.filter((task) => task.status === 'DONE').length}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-1 p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Quality Score</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{averageScore.toFixed(2)} / 5</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
