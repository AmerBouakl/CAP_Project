import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { FolderKanban, Ticket, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ImputationPeriodsAPI, ProjectsAPI, TicketsAPI, UsersAPI } from '../../services/odataClient';
import { ImputationPeriod, Project, Ticket as TicketType, User, TICKET_STATUS_LABELS, TICKET_NATURE_LABELS, USER_ROLE_LABELS } from '../../types/entities';

const ProjectManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [periods, setPeriods] = useState<ImputationPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, t, u, periodData] = await Promise.all([
          ProjectsAPI.getAll(),
          TicketsAPI.getAll(),
          UsersAPI.getAll(),
          ImputationPeriodsAPI.getAll(),
        ]);
        setProjects(p);
        setTickets(t);
        setUsers(u);
        setPeriods(periodData);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const openTickets = tickets.filter((t) => t.status === 'NEW' || t.status === 'IN_PROGRESS');
  const blockedTickets = tickets.filter((t) => t.status === 'BLOCKED');
  const inTestTickets = tickets.filter((t) => t.status === 'IN_TEST');
  const pendingValidation = periods.filter((period) => period.status === 'SUBMITTED').length;
  const readyToSend = periods.filter(
    (period) => period.status === 'VALIDATED' && !period.sentToStraTIME
  ).length;

  const getUserName = (id?: string) => users.find((u) => u.id === id)?.name ?? '—';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Project Manager Dashboard"
        subtitle="Core mission: validate team imputations and send validated periods to Stratime"
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Active Projects" value={projects.filter((p) => p.status === 'ACTIVE').length} icon={FolderKanban} variant="info" />
        <KPICard title="Open Tickets" value={openTickets.length} icon={Ticket} variant="warning" />
        <KPICard title="In Test" value={inTestTickets.length} icon={CheckCircle2} variant="success" />
        <KPICard title="Blocked" value={blockedTickets.length} icon={AlertTriangle} variant="danger" />
      </div>

      <Card className="border-border/80 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Stratime Validation Pipeline</CardTitle>
          <Button size="sm" onClick={() => navigate('/project-manager/imputations')}>
            <Send className="mr-1 h-4 w-4" />
            Open Validation Hub
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted Periods</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{pendingValidation}</p>
            <p className="text-xs text-muted-foreground">Waiting for project manager validation</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ready for Stratime</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{readyToSend}</p>
            <p className="text-xs text-muted-foreground">Validated periods pending dispatch</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent tickets */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Tickets</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/project-manager/tickets')}>
            View all
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.slice(0, 6).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{ticket.title}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
                    <Badge variant="secondary">{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                    {ticket.assignedToRole && (
                      <Badge variant="outline" className="text-xs">{USER_ROLE_LABELS[ticket.assignedToRole]}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{getUserName(ticket.assignedTo)}</p>
                  <p>{ticket.effortHours}h effort</p>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No tickets yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects overview */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Projects</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/project-manager/projects')}>
            View all
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projects.map((project) => {
              const projectTickets = tickets.filter((t) => t.projectId === project.id);
              return (
                <div key={project.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{project.progress}%</p>
                    <p className="text-xs text-muted-foreground">{projectTickets.length} tickets</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagerDashboard;
