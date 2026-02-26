import React, { useMemo } from 'react';
import { Medal, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { User, Evaluation } from '../../types/entities';

interface TopPerformersWidgetProps {
  users: User[];
  evaluations: Evaluation[];
}

export const TopPerformersWidget: React.FC<TopPerformersWidgetProps> = ({
  users,
  evaluations,
}) => {
  const rankedUsers = useMemo(() => {
    const consultants = users.filter(
      (user) =>
        user.role === 'CONSULTANT_TECHNIQUE' || user.role === 'CONSULTANT_FONCTIONNEL'
    );

    const withScores = consultants.map((user) => {
      const userEvaluations = evaluations.filter((evaluation) => evaluation.userId === user.id);
      const latestEvaluation = [...userEvaluations].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      )[0];

      return {
        ...user,
        score: latestEvaluation ? latestEvaluation.score : 0,
        evalCount: userEvaluations.length,
      };
    });

    return withScores.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [users, evaluations]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-primary fill-primary/20" />;
      case 1:
        return <Medal className="h-5 w-5 text-muted-foreground fill-muted/35" />;
      case 2:
        return <Medal className="h-5 w-5 text-accent-foreground fill-accent/60" />;
      default:
        return (
          <span className="w-5 text-center text-sm font-bold text-muted-foreground">{index + 1}</span>
        );
    }
  };

  return (
    <Card className="border-border/80 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Top Performers</CardTitle>
          <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
            This Quarter
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rankedUsers.map((user, index) => (
          <div key={user.id} className="group flex items-center gap-4">
            <div className="flex w-8 flex-shrink-0 items-center justify-center">{getRankIcon(index)}</div>

            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarFallback className={index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted'}>
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                {user.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{user.role === 'CONSULTANT_TECHNIQUE' ? 'Tech' : 'Functional'}</span>
                <span>&bull;</span>
                <span>{user.evalCount} Reviews</span>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-sm font-bold">
                {user.score > 0 ? user.score.toFixed(1) : '-'}
              </span>
              <span className="text-[10px] text-muted-foreground">Score</span>
            </div>
          </div>
        ))}

        {rankedUsers.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No performance data available yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
