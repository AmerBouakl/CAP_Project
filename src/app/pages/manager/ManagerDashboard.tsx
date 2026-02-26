import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  AllocationsAPI,
  EvaluationsAPI,
  TasksAPI,
  UsersAPI,
} from '../../services/odataClient';
import { Allocation, Evaluation, Task, User } from '../../types/entities';
import { TopPerformersWidget } from '../../components/business/TopPerformersWidget';



export const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoadError(null);

      const [fetchedTasks, fetchedUsers, fetchedEvaluations, fetchedAllocations] = await Promise.all([
        TasksAPI.getAll(),
        UsersAPI.getAll(),
        EvaluationsAPI.getAll(),
        AllocationsAPI.getAll(),
      ]);

      setTasks(fetchedTasks);
      setUsers(fetchedUsers);
      setEvaluations(fetchedEvaluations);
      setAllocations(fetchedAllocations);
    } catch (error) {
      setLoadError('Unable to load dashboard data. Some metrics may be outdated.');
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // ---------------------------------------------------------------------------
  // TACE — Taux d'Activité Congés Exclus
  // Measures utilisation rate of tech consultants based on current allocations.
  // 0% = everyone on bench (available), 100% = everyone fully allocated (busy).
  // ---------------------------------------------------------------------------
  const tace = useMemo(() => {
    const techConsultants = users.filter((u) => u.role === 'CONSULTANT_TECHNIQUE' && u.active);
    if (techConsultants.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);

    const rates = techConsultants.map((consultant) => {
      const currentAllocations = allocations.filter(
        (a) => a.userId === consultant.id && a.startDate <= today && a.endDate >= today
      );
      const totalAlloc = currentAllocations.reduce((sum, a) => sum + a.allocationPercent, 0);
      return Math.min(totalAlloc, 100); // cap at 100%
    });

    return Math.round(rates.reduce((sum, r) => sum + r, 0) / techConsultants.length);
  }, [users, allocations]);

  const productivityMetrics = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'DONE');

    const throughput = tasks.length ? (completed.length / tasks.length) * 100 : 0;
    const criticalIssues = tasks.filter(
      (task) => task.riskLevel === 'CRITICAL' || task.status === 'BLOCKED'
    ).length;

    // SLA: percentage of completed tasks that were delivered on time
    const onTime = completed.filter((task) => {
      if (!task.realEnd) return false;
      return task.realEnd <= task.plannedEnd;
    }).length;
    const slaRate = completed.length ? (onTime / completed.length) * 100 : 100;

    return {
      throughputRate: throughput,
      criticalIssues,
      slaRate,
      slaOnTime: onTime,
      slaTotal: completed.length,
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-transparent">
      <PageHeader
        title="Manager Dashboard"
        subtitle="Delivery progress, workload, and allocation in one view"
        breadcrumbs={[
          { label: 'Home', path: '/manager/dashboard' },
          { label: 'Manager Dashboard' },
        ]}
      />

      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        {loadError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button type="button" variant="outline" onClick={() => void loadData()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="TACE"
            value={tace}
            unit="%"
            subtitle="Taux d'Activité (Congés Exclus)"
            icon="performance"
            state={tace >= 80 ? 'Positive' : tace >= 50 ? 'Warning' : 'Error'}
            progress={tace}
          />
          <KPICard
            title="SLA Respect"
            value={Math.round(productivityMetrics.slaRate)}
            unit="%"
            subtitle={`${productivityMetrics.slaOnTime}/${productivityMetrics.slaTotal} livrées à temps`}
            icon="accept"
            state={productivityMetrics.slaRate >= 90 ? 'Positive' : productivityMetrics.slaRate >= 70 ? 'Warning' : 'Error'}
            progress={productivityMetrics.slaRate}
          />
          <KPICard
            title="Throughput"
            value={Math.round(productivityMetrics.throughputRate)}
            unit="%"
            subtitle="Completed tasks ratio"
            icon="trend-up"
            state={productivityMetrics.throughputRate >= 70 ? 'Positive' : 'Warning'}
            progress={productivityMetrics.throughputRate}
          />
          <KPICard
            title="Risk Hotspots"
            value={productivityMetrics.criticalIssues}
            subtitle="Critical or blocked tasks"
            icon="warning"
            state={productivityMetrics.criticalIssues > 0 ? 'Error' : 'Positive'}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          <TopPerformersWidget users={users} evaluations={evaluations} />

          <Card className="border-border/80 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-semibold text-xs text-destructive uppercase tracking-wide">Testing Blocked</p>
                <p className="mt-1 text-sm text-foreground">
                  Waiting for test environment access.
                </p>
              </div>
              <div className="rounded-lg border border-accent bg-accent/40 p-3">
                <p className="font-semibold text-xs text-accent-foreground uppercase tracking-wide">
                  Deadline Risk
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Fiori App Configuration due in 3 days.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <Button
                className="w-full justify-start"
                variant="default"
                onClick={() => navigate('/manager/allocations')}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Dispatcher & Allocation
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/manager/allocations')}
              >
                Allocate Resources
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/manager/tickets')}
              >
                Manage Tickets
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};
