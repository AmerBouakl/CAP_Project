import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { EvaluationsAPI, UsersAPI } from '../../services/odataClient';
import { Evaluation, User } from '../../types/entities';
import { useAuth } from '../../context/AuthContext';
import { Label } from '../../components/ui/label';
import { SkillsRadarChart } from '../../components/charts/SkillsRadarChart';
import { Badge } from '../../components/ui/badge';

interface DevelopmentAction {
  id: string;
  label: string;
  done: boolean;
}

interface Objective {
  id: string;
  type: 'INDIVIDUAL' | 'TEAM';
  title: string;
  target: string;
  progress: number;
}

export const MyPerformance: React.FC = () => {
  const { currentUser } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DevelopmentAction[]>([
    { id: 'd1', label: 'Complete CAP advanced training', done: false },
    { id: 'd2', label: 'Improve code review turnaround time', done: true },
    { id: 'd3', label: 'Publish one technical knowledge note per sprint', done: false },
  ]);
  const [objectives, setObjectives] = useState<Objective[]>([
    {
      id: 'o1',
      type: 'INDIVIDUAL',
      title: 'Increase on-time completion rate',
      target: '>= 95%',
      progress: 78,
    },
    {
      id: 'o2',
      type: 'INDIVIDUAL',
      title: 'Reduce average cycle time on assigned tasks',
      target: '<= 5 days',
      progress: 64,
    },
    {
      id: 'o3',
      type: 'TEAM',
      title: 'Raise sprint throughput for delivery team',
      target: '>= 20 completed tasks',
      progress: 71,
    },
  ]);

  useEffect(() => {
    if (!currentUser) return;
    void loadData(currentUser.id);
  }, [currentUser]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [data, allUsers] = await Promise.all([
        EvaluationsAPI.getByUser(userId),
        UsersAPI.getAll(),
      ]);
      setEvaluations(data);
      setUserProfile(allUsers.find((u) => u.id === userId) ?? null);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!evaluations.length) {
      return {
        score: 0,
        productivity: 0,
        quality: 0,
        autonomy: 0,
        collaboration: 0,
        innovation: 0,
      };
    }

    const count = evaluations.length;
    const score = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / count;
    const productivity =
      evaluations.reduce(
        (sum, evaluation) => sum + evaluation.qualitativeGrid.productivity,
        0
      ) / count;
    const quality =
      evaluations.reduce((sum, evaluation) => sum + evaluation.qualitativeGrid.quality, 0) /
      count;
    const autonomy =
      evaluations.reduce((sum, evaluation) => sum + evaluation.qualitativeGrid.autonomy, 0) /
      count;
    const collaboration =
      evaluations.reduce(
        (sum, evaluation) => sum + evaluation.qualitativeGrid.collaboration,
        0
      ) / count;
    const innovation =
      evaluations.reduce((sum, evaluation) => sum + evaluation.qualitativeGrid.innovation, 0) /
      count;
    return { score, productivity, quality, autonomy, collaboration, innovation };
  }, [evaluations]);

  const radarData = useMemo(
    () => [
      { axis: 'Productivité', value: summary.productivity, fullMark: 5 },
      { axis: 'Qualité', value: summary.quality, fullMark: 5 },
      { axis: 'Autonomie', value: summary.autonomy, fullMark: 5 },
      { axis: 'Collaboration', value: summary.collaboration, fullMark: 5 },
      { axis: 'Innovation', value: summary.innovation, fullMark: 5 },
    ],
    [summary]
  );

  const toggleAction = (id: string) => {
    setPlan((prev) =>
      prev.map((action) => (action.id === id ? { ...action, done: !action.done } : action))
    );
  };

  const updateObjectiveProgress = (id: string, progress: number) => {
    const clamped = Math.max(0, Math.min(100, progress));
    setObjectives((prev) =>
      prev.map((objective) => (objective.id === id ? { ...objective, progress: clamped } : objective))
    );
  };

  const okrCompletion = objectives.length
    ? Math.round(objectives.reduce((sum, objective) => sum + objective.progress, 0) / objectives.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="My Performance"
        subtitle="Personal performance trend, feedback and development plan"
        breadcrumbs={[
          { label: 'Home', path: '/consultant-tech/dashboard' },
          { label: 'My Performance' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Average Score</p>
            <p className="text-2xl font-semibold text-foreground">{summary.score.toFixed(2)} / 5</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Evaluations</p>
            <p className="text-2xl font-semibold text-foreground">{evaluations.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Plan Completion</p>
            <p className="text-2xl font-semibold text-foreground">
              {Math.round((plan.filter((action) => action.done).length / plan.length) * 100)}%
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">OKR Completion</p>
            <p className="text-2xl font-semibold text-foreground">{okrCompletion}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-foreground mb-2">Radar de Compétences</h3>
            <p className="text-xs text-muted-foreground mb-3">Score moyen sur les 5 axes d'évaluation</p>
            {summary.score > 0 ? (
              <SkillsRadarChart data={radarData} />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Aucune évaluation disponible
              </div>
            )}
            {userProfile && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Compétences</p>
                  <div className="flex flex-wrap gap-1.5">
                    {userProfile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
                {userProfile.certifications.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Certifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {userProfile.certifications.map((cert) => {
                        const label = typeof cert === 'string' ? cert : cert.name;
                        const key = typeof cert === 'string' ? cert : cert.id;
                        return (
                          <Badge key={key} variant="outline" className="text-xs border-primary/40 text-primary">{label}</Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4">Development Plan</h3>
            <div className="space-y-2">
              {plan.map((action) => (
                <Label
                  key={action.id}
                  htmlFor={`development-action-${action.id}`}
                  className="flex items-center gap-3 p-2 border border-border rounded hover:bg-accent/40 cursor-pointer"
                >
                  <input
                    id={`development-action-${action.id}`}
                    type="checkbox"
                    checked={action.done}
                    onChange={() => toggleAction(action.id)}
                  />
                  <span className={action.done ? 'line-through text-muted-foreground' : 'text-foreground'}>
                    {action.label}
                  </span>
                </Label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Objectives & OKR Tracking</h3>
          <div className="space-y-4">
            {objectives.map((objective) => (
              <div key={objective.id} className="rounded border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{objective.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {objective.type} target: {objective.target}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={objective.progress}
                    onChange={(event) =>
                      updateObjectiveProgress(objective.id, Number(event.target.value || 0))
                    }
                    className="w-full accent-primary"
                  />
                  <span className="w-12 text-right text-sm font-semibold text-foreground">
                    {objective.progress}%
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${objective.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Evaluation History</h3>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-6 text-muted-foreground">Loading evaluations...</div>
            ) : evaluations.length === 0 ? (
              <div className="p-6 text-muted-foreground">No evaluations found yet.</div>
            ) : (
              evaluations.map((evaluation) => (
                <div key={evaluation.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-foreground">{evaluation.period}</div>
                    <div className="text-sm font-semibold text-foreground">
                      {evaluation.score.toFixed(2)} / 5
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
