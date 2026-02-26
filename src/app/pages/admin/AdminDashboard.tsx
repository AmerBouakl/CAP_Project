import React, { useEffect, useState } from 'react';
import { Activity, Database, ServerCog, Users } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { NotificationsAPI, ProjectsAPI, TasksAPI, UsersAPI } from '../../services/odataClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Notification } from '../../types/entities';

const kpiReferences = [
  {
    name: 'Total Users',
    formula: 'count(all users)',
    source: 'Users',
    refresh: 'On dashboard load',
  },
  {
    name: 'Active Users',
    formula: 'count(users where active = true)',
    source: 'Users',
    refresh: 'On dashboard load',
  },
  {
    name: 'Projects',
    formula: 'count(all projects)',
    source: 'Projects',
    refresh: 'On dashboard load',
  },
  {
    name: 'Total Tasks',
    formula: 'count(all tasks)',
    source: 'Tasks',
    refresh: 'On dashboard load',
  },
];

export const AdminDashboard: React.FC = () => {
  const [userCount, setUserCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [auditEvents, setAuditEvents] = useState<
    Array<Notification & { userName: string }>
  >([]);

  useEffect(() => {
    const loadData = async () => {
      const [users, projects, tasks] = await Promise.all([UsersAPI.getAll(), ProjectsAPI.getAll(), TasksAPI.getAll()]);

      const allNotifications = (
        await Promise.all(users.map((user) => NotificationsAPI.getByUser(user.id)))
      ).flat();
      const userNameById = new Map(users.map((user) => [user.id, user.name] as const));

      setUserCount(users.length);
      setProjectCount(projects.length);
      setTaskCount(tasks.length);
      setActiveUsers(users.filter((user) => user.active).length);
      setAuditEvents(
        [...allNotifications]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((event) => ({
            ...event,
            userName: userNameById.get(event.userId) ?? event.userId,
          }))
      );
    };

    void loadData();
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <PageHeader
        title="Admin Command Center"
        subtitle="Platform health, user governance, and data integrity overview"
        breadcrumbs={[{ label: 'Admin Dashboard' }]}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Total Users" value={userCount} icon="group" color="blue" />
          <KPICard title="Active Users" value={activeUsers} icon="group" color="green" />
          <KPICard
            title="Projects"
            value={projectCount}
            icon="project-definition-triangle-2"
            color="yellow"
          />
          <KPICard title="Tasks" value={taskCount} icon="task" color="purple" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="bg-card/92">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-4 w-4 text-primary" />
                KPI Definitions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full min-w-[580px]">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        KPI
                      </th>
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        Formula
                      </th>
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        Refresh
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiReferences.map((kpi) => (
                      <tr key={kpi.name} className="border-t border-border/60">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{kpi.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{kpi.formula}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{kpi.source}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{kpi.refresh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/92">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ServerCog className="h-4 w-4 text-primary" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Backend mode</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge>Mock Data</Badge>
                  <span className="text-sm text-muted-foreground">Frontend-only simulation</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">OData endpoint</p>
                <p className="mt-2 break-all text-sm font-medium text-foreground">/odata/v4/performance</p>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Activity snapshot</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />User records</span>
                    <span className="font-semibold text-foreground">{userCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" />Project entities</span>
                    <span className="font-semibold text-foreground">{projectCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" />Audit events</span>
                    <span className="font-semibold text-foreground">{auditEvents.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/92">
          <CardHeader>
            <CardTitle className="text-lg">Audit & Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full min-w-[760px]">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {auditEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No audit entries available.
                      </td>
                    </tr>
                  ) : (
                    auditEvents.slice(0, 12).map((event) => (
                      <tr key={event.id}>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{event.userName}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{event.title}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{event.message}</td>
                        <td className="px-4 py-3">
                          <Badge variant={event.read ? 'secondary' : 'default'}>
                            {event.read ? 'Read' : 'Unread'}
                          </Badge>
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
    </div>
  );
};
