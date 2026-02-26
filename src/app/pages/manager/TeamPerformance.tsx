import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { EvaluationsAPI, TasksAPI, UsersAPI } from '../../services/odataClient';
import { Evaluation, Task, User } from '../../types/entities';
import { SkillsRadarChart } from '../../components/charts/SkillsRadarChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

export const TeamPerformance: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultant, setSelectedConsultant] = useState<string>('NONE');

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, taskData, evalData] = await Promise.all([
        UsersAPI.getAll(),
        TasksAPI.getAll(),
        EvaluationsAPI.getAll(),
      ]);
      setUsers(userData.filter((user) => user.role !== 'ADMIN' && user.role !== 'MANAGER'));
      setTasks(taskData);
      setEvaluations(evalData);
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    return users.map((user) => {
      const userTasks = tasks.filter((task) => task.assigneeId === user.id);
      const done = userTasks.filter((task) => task.status === 'DONE').length;
      const blocked = userTasks.filter((task) => task.status === 'BLOCKED').length;
      const overdue = userTasks.filter(
        (task) => task.status !== 'DONE' && new Date(task.plannedEnd) < new Date()
      ).length;

      const userEvals = evaluations.filter((evaluation) => evaluation.userId === user.id);
      const avgScore = userEvals.length
        ? userEvals.reduce((sum, evaluation) => sum + evaluation.score, 0) /
          userEvals.length
        : 0;

      const qualityScore = userEvals.length
        ? userEvals.reduce((sum, evaluation) => sum + evaluation.qualitativeGrid.quality, 0) /
          userEvals.length
        : 0;

      return {
        user,
        assigned: userTasks.length,
        done,
        blocked,
        overdue,
        avgScore,
        qualityScore,
      };
    });
  }, [evaluations, tasks, users]);

  const globalScore = rows.length
    ? rows.reduce((sum, row) => sum + row.avgScore, 0) / rows.length
    : 0;

  const workloadBalance = rows.length
    ? rows.reduce((sum, row) => sum + row.assigned, 0) / rows.length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Team Performance"
        subtitle="Individual and collective performance by consultant"
        breadcrumbs={[
          { label: 'Home', path: '/manager/dashboard' },
          { label: 'Team Performance' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">Team Average Score</div>
            <div className="text-2xl font-semibold text-foreground">
              {globalScore.toFixed(2)} / 5
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">Active Consultants</div>
            <div className="text-2xl font-semibold text-foreground">{rows.length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">Average Workload</div>
            <div className="text-2xl font-semibold text-foreground">
              {workloadBalance.toFixed(1)} tasks
            </div>
          </div>
        </div>

        {/* Radar de Compétences - Consultant Selector */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">Radar de Compétences</h3>
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select consultant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Select a consultant</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedConsultant !== 'NONE' && (() => {
            const userEvals = evaluations.filter((ev) => ev.userId === selectedConsultant);
            if (!userEvals.length) {
              return <p className="text-sm text-muted-foreground">No evaluations available for this consultant.</p>;
            }
            const avg = (field: keyof Evaluation['qualitativeGrid']) =>
              userEvals.reduce((s, ev) => s + ev.qualitativeGrid[field], 0) / userEvals.length;
            const radarData = [
              { axis: 'Productivity', value: avg('productivity'), fullMark: 5 },
              { axis: 'Quality', value: avg('quality'), fullMark: 5 },
              { axis: 'Autonomy', value: avg('autonomy'), fullMark: 5 },
              { axis: 'Collaboration', value: avg('collaboration'), fullMark: 5 },
              { axis: 'Innovation', value: avg('innovation'), fullMark: 5 },
            ];
            return <SkillsRadarChart data={radarData} />;
          })()}
        </div>

        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Consultant
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Assigned
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Done
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Blocked
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Overdue
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Evaluation
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Quality
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Availability
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Loading team performance...
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.user.id} className="hover:bg-accent/40">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{row.user.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.user.role}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{row.assigned}</td>
                    <td className="px-4 py-3 text-sm text-primary">{row.done}</td>
                    <td className="px-4 py-3 text-sm text-destructive">{row.blocked}</td>
                    <td className="px-4 py-3 text-sm text-accent-foreground">{row.overdue}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{row.avgScore.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {row.qualityScore.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {row.user.availabilityPercent}%
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
