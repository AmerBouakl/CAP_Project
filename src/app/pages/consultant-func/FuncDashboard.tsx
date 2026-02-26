import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, ClipboardList, FileText, TicketCheck, Timer } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { useAuth } from '../../context/AuthContext';
import { DeliverablesAPI, TicketsAPI } from '../../services/odataClient';
import { Deliverable, Ticket } from '../../types/entities';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export const FuncDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setLoading(true);

      try {
        const [deliverableData, ticketData] = await Promise.all([
          DeliverablesAPI.getAll(),
          TicketsAPI.getAll(),
        ]);

        setDeliverables(deliverableData);
        setTickets(ticketData.filter((ticket) => ticket.createdBy === currentUser.id));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [currentUser]);

  const pendingDeliverables = deliverables.filter(
    (deliverable) => deliverable.validationStatus === 'PENDING'
  ).length;
  const approvedDeliverables = deliverables.filter(
    (deliverable) => deliverable.validationStatus === 'APPROVED'
  ).length;
  const openTickets = tickets.filter(
    (ticket) => ticket.status === 'NEW' || ticket.status === 'IN_PROGRESS'
  ).length;
  const resolvedTickets = tickets.filter((ticket) => ticket.status === 'DONE').length;

  return (
    <div className="min-h-screen bg-transparent">
      <PageHeader
        title={`Welcome back, ${currentUser?.name.split(' ')[0] ?? 'Consultant'}`}
        subtitle="Functional delivery cockpit for validations, tickets, and collaboration"
        breadcrumbs={[{ label: 'My Dashboard' }]}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Pending Deliverables" value={pendingDeliverables} icon="document" color="yellow" />
          <KPICard title="Approved Deliverables" value={approvedDeliverables} icon="accept" color="green" />
          <KPICard title="Open Tickets" value={openTickets} icon="incident" color="blue" />
          <KPICard title="Resolved Tickets" value={resolvedTickets} icon="history" color="purple" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="bg-card/92">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <FileText className="h-4 w-4 text-primary" />
                Deliverables Awaiting Validation
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={() => navigate('/consultant-func/deliverables')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading deliverables...</p>
              ) : (
                deliverables
                  .filter((deliverable) => deliverable.validationStatus === 'PENDING')
                  .slice(0, 6)
                  .map((deliverable) => (
                    <button
                      key={deliverable.id}
                      type="button"
                      onClick={() => navigate('/consultant-func/deliverables')}
                      className="w-full rounded-xl border border-border/70 bg-surface-1 p-4 text-left transition hover-lift"
                    >
                      <p className="font-semibold text-foreground">{deliverable.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{deliverable.type}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Timer className="h-3.5 w-3.5" /> Pending Review
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(deliverable.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/92">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <ClipboardList className="h-4 w-4 text-primary" />
                My Recent Tickets
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={() => navigate('/consultant-func/tickets')}>
                Manage Tickets
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {tickets.slice(0, 6).map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-border/70 bg-surface-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{ticket.title}</p>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {ticket.status === 'DONE' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <TicketCheck className="h-3.5 w-3.5 text-primary" />
                      )}
                      {ticket.status}
                    </span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <p className="text-sm text-muted-foreground">No tickets created yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
