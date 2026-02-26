import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, Ticket, Users, BarChart3, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { TicketsAPI, UsersAPI } from '../../services/odataClient';
import { Ticket as TicketType, User, TICKET_STATUS_LABELS, TICKET_NATURE_LABELS, USER_ROLE_LABELS } from '../../types/entities';

const DevCoordinatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, u] = await Promise.all([
          TicketsAPI.getAll(),
          UsersAPI.getAll(),
        ]);
        setTickets(t);
        setUsers(u);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const consultants = useMemo(
    () => users.filter((u) => u.role === 'CONSULTANT_TECHNIQUE' || u.role === 'CONSULTANT_FONCTIONNEL'),
    [users]
  );

  const unassignedTickets = tickets.filter((t) => !t.assignedTo);
  const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const blockedTickets = tickets.filter((t) => t.status === 'BLOCKED');
  const totalEffort = tickets.reduce((sum, t) => sum + t.effortHours, 0);

  const getUserName = (id?: string) => users.find((u) => u.id === id)?.name ?? '—';

  // Workload per consultant
  const workload = useMemo(() => {
    return consultants.map((c) => {
      const assigned = tickets.filter((t) => t.assignedTo === c.id && t.status !== 'DONE' && t.status !== 'REJECTED');
      const effort = assigned.reduce((sum, t) => sum + t.effortHours, 0);
      return { user: c, ticketCount: assigned.length, effortHours: effort };
    });
  }, [consultants, tickets]);

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
        title="Dev Coordinator Dashboard"
        subtitle="Ticket dispatch, workload monitoring, and consultant availability"
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Unassigned Tickets" value={unassignedTickets.length} icon={Ticket} variant="warning" />
        <KPICard title="In Progress" value={inProgressTickets.length} icon={Clock} variant="info" />
        <KPICard title="Blocked" value={blockedTickets.length} icon={AlertTriangle} variant="danger" />
        <KPICard title="Total Effort (h)" value={totalEffort.toFixed(1)} icon={BarChart3} variant="default" />
      </div>

      {/* Consultant Workload */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Consultant Workload</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/dev-coordinator/workload')}>
            Details
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workload.map(({ user, ticketCount, effortHours }) => (
              <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <Badge variant="outline" className="text-xs">{USER_ROLE_LABELS[user.role]}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{ticketCount} tickets</span>
                  <span className="font-medium">{effortHours}h effort</span>
                  <span className={`text-xs ${user.availabilityPercent >= 80 ? 'text-green-600' : user.availabilityPercent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {user.availabilityPercent}% avail.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unassigned tickets ready for dispatch */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tickets Awaiting Assignment</CardTitle>
          <Button variant="default" size="sm" onClick={() => navigate('/dev-coordinator/ai-dispatch')}>
            <Sparkles className="mr-2 h-4 w-4" /> AI Dispatch
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unassignedTickets.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                All tickets are assigned
              </div>
            ) : (
              unassignedTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{ticket.title}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
                      <Badge variant="secondary">{ticket.priority}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/dev-coordinator/ai-dispatch')}>
                    Assign
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent tickets */}
      <Card className="border-border/80 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Tickets</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/dev-coordinator/tickets')}>
            View all
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{ticket.title}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
                    <Badge variant="secondary">{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{getUserName(ticket.assignedTo)}</p>
                  <p>{ticket.effortHours}h effort</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevCoordinatorDashboard;
