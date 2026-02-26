import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  EvaluationsAPI,
  NotificationsAPI,
  ProjectsAPI,
  UsersAPI,
} from '../../services/odataClient';
import { Evaluation, Project, User } from '../../types/entities';
import { useAuth } from '../../context/AuthContext';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';

interface EvaluationForm {
  userId: string;
  projectId: string;
  period: string;
  productivity: number;
  quality: number;
  autonomy: number;
  collaboration: number;
  innovation: number;
  feedback: string;
}

const EMPTY_FORM: EvaluationForm = {
  userId: '',
  projectId: '',
  period: new Date().toISOString().slice(0, 7),
  productivity: 3,
  quality: 3,
  autonomy: 3,
  collaboration: 3,
  innovation: 3,
  feedback: '',
};

export const TeamEvaluations: React.FC = () => {
  const { currentUser } = useAuth();
  const [consultants, setConsultants] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<EvaluationForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, projectData, evalData] = await Promise.all([
        UsersAPI.getAll(),
        ProjectsAPI.getAll(),
        EvaluationsAPI.getAll(),
      ]);
      setConsultants(
        userData.filter(
          (user) =>
            user.role === 'CONSULTANT_TECHNIQUE' ||
            user.role === 'CONSULTANT_FONCTIONNEL'
        )
      );
      setProjects(projectData);
      setEvaluations(
        [...evalData].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
    } finally {
      setLoading(false);
    }
  };

  const score = useMemo(() => {
    const values = [
      form.productivity,
      form.quality,
      form.autonomy,
      form.collaboration,
      form.innovation,
    ];
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [form]);

  const submitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !form.userId || !form.projectId) {
      toast.error('Consultant and project are required');
      return;
    }
    if (form.feedback.trim().length < 10) {
      toast.error('Feedback must contain at least 10 characters');
      return;
    }
    const duplicate = evaluations.find(
      (evaluation) =>
        evaluation.userId === form.userId &&
        evaluation.projectId === form.projectId &&
        evaluation.period === form.period
    );
    if (duplicate) {
      toast.error('An evaluation already exists for this consultant/project/period');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await EvaluationsAPI.create({
        userId: form.userId,
        evaluatorId: currentUser.id,
        projectId: form.projectId,
        period: form.period,
        score,
        qualitativeGrid: {
          productivity: form.productivity,
          quality: form.quality,
          autonomy: form.autonomy,
          collaboration: form.collaboration,
          innovation: form.innovation,
        },
        feedback: form.feedback.trim(),
        createdAt: new Date().toISOString(),
      });

      setEvaluations((prev) => [created, ...prev]);
      await NotificationsAPI.create({
        userId: form.userId,
        type: 'EVALUATION_PUBLISHED',
        title: 'New Evaluation Published',
        message: `A new ${form.period} evaluation has been submitted.`,
        read: false,
      });
      setForm(EMPTY_FORM);
      toast.success('Evaluation submitted');
    } catch (error) {
      toast.error('Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Team Evaluations"
        subtitle="Monthly qualitative evaluation grid for consultants"
        breadcrumbs={[
          { label: 'Home', path: '/manager/dashboard' },
          { label: 'Evaluations' },
        ]}
      />

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 xl:col-span-1 h-fit">
          <h3 className="text-lg font-semibold text-foreground mb-4">New Monthly Evaluation</h3>
          <form onSubmit={submitEvaluation} className="space-y-4">
            <div>
              <Label htmlFor="evaluation-consultant" className="mb-1 block text-sm text-muted-foreground">
                Consultant
              </Label>
              <Select
                value={form.userId}
                onValueChange={(val) => setForm((prev) => ({ ...prev, userId: val }))}
              >
                <SelectTrigger id="evaluation-consultant">
                  <SelectValue placeholder="Select consultant" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="evaluation-project" className="mb-1 block text-sm text-muted-foreground">
                Project
              </Label>
              <Select
                value={form.projectId}
                onValueChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
              >
                <SelectTrigger id="evaluation-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="evaluation-period" className="mb-1 block text-sm text-muted-foreground">
                Period (month)
              </Label>
              <Input
                id="evaluation-period"
                type="month"
                value={form.period}
                onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
              />
            </div>

            {(
              [
                ['productivity', 'Productivity'],
                ['quality', 'Quality'],
                ['autonomy', 'Autonomy'],
                ['collaboration', 'Collaboration'],
                ['innovation', 'Innovation'],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <div className="flex justify-between text-sm mb-1">
                  <Label htmlFor={`evaluation-${field}`} className="text-muted-foreground">
                    {label}
                  </Label>
                  <span className="text-foreground">{form[field]}/5</span>
                </div>
                <input
                  id={`evaluation-${field}`}
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={form[field]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field]: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
            ))}

            <div>
              <Label htmlFor="evaluation-feedback" className="mb-1 block text-sm text-muted-foreground">
                Feedback
              </Label>
              <Textarea
                id="evaluation-feedback"
                value={form.feedback}
                onChange={(e) => setForm((prev) => ({ ...prev, feedback: e.target.value }))}
                rows={4}
                placeholder="Qualitative assessment and improvement actions..."
              />
            </div>

            <div className="p-3 rounded bg-muted text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Calculated score</span>
              <span className="font-semibold text-foreground">{score.toFixed(2)} / 5</span>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Evaluation'}
            </Button>
          </form>
        </div>

        <Card className="overflow-hidden border bg-card/92 xl:col-span-2">
          <div className="border-b px-4 py-3">
            <h3 className="text-lg font-semibold text-foreground">Evaluation History</h3>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4">Consultant</TableHead>
                <TableHead className="px-4">Project</TableHead>
                <TableHead className="px-4">Period</TableHead>
                <TableHead className="px-4">Score</TableHead>
                <TableHead className="px-4">Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading evaluations...
                  </TableCell>
                </TableRow>
              ) : evaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No evaluations found.
                  </TableCell>
                </TableRow>
              ) : (
                evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id} className="hover:bg-accent/40 align-top">
                    <TableCell className="px-4 py-3 font-medium">
                      {consultants.find((user) => user.id === evaluation.userId)?.name ??
                        evaluation.userId}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {projects.find((project) => project.id === evaluation.projectId)?.name ??
                        evaluation.projectId}
                    </TableCell>
                    <TableCell className="px-4 py-3">{evaluation.period}</TableCell>
                    <TableCell className="px-4 py-3 font-semibold">
                      {evaluation.score.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {evaluation.feedback}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};
