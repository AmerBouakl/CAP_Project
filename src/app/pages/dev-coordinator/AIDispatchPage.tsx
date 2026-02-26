import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, UserCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { TicketsAPI, UsersAPI } from '../../services/odataClient';
import { assigneeRecommender } from '../../services/aiRecommender';
import {
  Ticket,
  User,
  AssigneeRecommendation,
  TICKET_NATURE_LABELS,
  TICKET_STATUS_LABELS,
  USER_ROLE_LABELS,
} from '../../types/entities';

const AIDispatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<AssigneeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, u] = await Promise.all([TicketsAPI.getAll(), UsersAPI.getAll()]);
        setTickets(t);
        setUsers(u);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const unassignedTickets = tickets.filter((t) => !t.assignedTo && t.status !== 'DONE' && t.status !== 'REJECTED');
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const runRecommendation = useCallback(async () => {
    if (!selectedTicket) return;
    setRecommending(true);
    try {
      const recs = await assigneeRecommender.recommend(selectedTicket, users, tickets);
      setRecommendations(recs);
    } finally {
      setRecommending(false);
    }
  }, [selectedTicket, users, tickets]);

  const handleAssign = async (userId: string) => {
    if (!selectedTicket) return;
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    try {
      await TicketsAPI.update(selectedTicket.id, {
        assignedTo: userId,
        assignedToRole: user.role,
        status: selectedTicket.status === 'NEW' ? 'IN_PROGRESS' : selectedTicket.status,
      });

      toast.success('Ticket assigned', {
        description: `"${selectedTicket.title}" assigned to ${user.name} (${USER_ROLE_LABELS[user.role]})`,
      });

      // Refresh data
      const refreshed = await TicketsAPI.getAll();
      setTickets(refreshed);
      setSelectedTicketId('');
      setRecommendations([]);
    } catch {
      toast.error('Failed to assign ticket');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="AI Dispatch (Demo)"
          subtitle="Select an unassigned ticket and let the scoring engine recommend the best assignees"
        />
      </div>

      {/* Ticket Selection */}
      <Card className="border-border/80 bg-card">
        <CardHeader>
          <CardTitle className="text-lg">1. Select Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an unassigned ticket..." />
            </SelectTrigger>
            <SelectContent>
              {unassignedTickets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  [{TICKET_NATURE_LABELS[t.nature]}] {t.title} ({t.priority})
                </SelectItem>
              ))}
              {unassignedTickets.length === 0 && (
                <SelectItem value="__none" disabled>No unassigned tickets</SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedTicket && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-medium">{selectedTicket.title}</p>
              <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{TICKET_NATURE_LABELS[selectedTicket.nature]}</Badge>
                <Badge variant="secondary">{selectedTicket.priority}</Badge>
                <Badge>{TICKET_STATUS_LABELS[selectedTicket.status]}</Badge>
                {selectedTicket.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            disabled={!selectedTicket || recommending}
            onClick={runRecommendation}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {recommending ? 'Analyzing...' : 'Suggest Assignees (AI Demo)'}
          </Button>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-lg">2. Recommended Assignees (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => {
                const user = users.find((u) => u.id === rec.userId);
                if (!user) return null;
                return (
                  <div key={rec.userId} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <Badge className="mt-0.5 bg-primary/10 text-primary border border-primary/20 text-xs font-medium">{USER_ROLE_LABELS[user.role]}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">{(rec.score ?? 0).toFixed(0)}</span>
                        <Button size="sm" onClick={() => handleAssign(rec.userId)}>
                          <UserCheck className="mr-1 h-4 w-4" /> Assign
                        </Button>
                      </div>
                    </div>

                    {/* Factor breakdown */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Availability</span>
                          <span className="font-semibold">{(rec.factors.availabilityScore ?? 0).toFixed(0)}/100</span>
                        </div>
                        <Progress value={rec.factors.availabilityScore ?? 0} className="h-2.5 bg-emerald-100 dark:bg-emerald-950 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Skills Match</span>
                          <span className="font-semibold">{(rec.factors.skillsMatchScore ?? 0).toFixed(0)}/100</span>
                        </div>
                        <Progress value={rec.factors.skillsMatchScore ?? 0} className="h-2.5 bg-blue-100 dark:bg-blue-950 [&>[data-slot=progress-indicator]]:bg-blue-500" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Performance</span>
                          <span className="font-semibold">{(rec.factors.performanceScore ?? 0).toFixed(0)}/100</span>
                        </div>
                        <Progress value={rec.factors.performanceScore ?? 0} className="h-2.5 bg-amber-100 dark:bg-amber-950 [&>[data-slot=progress-indicator]]:bg-amber-500" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Similar Tickets</span>
                          <span className="font-semibold">{(rec.factors.similarTicketsScore ?? 0).toFixed(0)}/100</span>
                        </div>
                        <Progress value={rec.factors.similarTicketsScore ?? 0} className="h-2.5 bg-violet-100 dark:bg-violet-950 [&>[data-slot=progress-indicator]]:bg-violet-500" />
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1">
                      {user.skills.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring explanation */}
      <Card className="border-border/80 bg-card">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Scoring Algorithm</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>Weighted Score</strong> = Availability (30%) + Skills Match (35%) + Performance (15%) + Similar Tickets (20%)</p>
          <p>• <strong>Availability</strong>: User availability % minus penalty for open ticket count</p>
          <p>• <strong>Skills Match</strong>: Fuzzy match between user skills and ticket nature/tags</p>
          <p>• <strong>Performance</strong>: Count of resolved tickets (capped at 100)</p>
          <p>• <strong>Similar Tickets</strong>: Past tickets of same nature resolved by this user</p>
          <p className="pt-2 text-muted-foreground/70 italic">This is a deterministic demo — no external AI service is called.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIDispatchPage;
