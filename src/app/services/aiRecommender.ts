// AI Assignee Recommender – Demo implementation
//
// Architecture: put behind IAssigneeRecommender interface.
// Currently a deterministic scoring algorithm; later replace with real AI.

import {
  AssigneeRecommendation,
  Ticket,
  TicketNature,
  User,
  UserRole,
} from '../types/entities';

// ---------------------------------------------------------------------------
// Interface (swap out for real AI later)
// ---------------------------------------------------------------------------

export interface IAssigneeRecommender {
  recommend(
    ticket: Partial<Ticket>,
    allUsers: User[],
    allTickets: Ticket[],
    /** Weight config – optional override */
    weights?: ScoringWeights,
  ): AssigneeRecommendation[];
}

export interface ScoringWeights {
  availability: number;
  skillsMatch: number;
  performance: number;
  similarTickets: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  availability: 0.30,
  skillsMatch: 0.35,
  performance: 0.15,
  similarTickets: 0.20,
};

// ---------------------------------------------------------------------------
// Nature → suggested skill mapping (heuristic for demo)
// ---------------------------------------------------------------------------

const NATURE_SKILL_MAP: Record<TicketNature, string[]> = {
  WORKFLOW: ['SAP Workflow', 'ABAP', 'BPM', 'Fiori', 'workflow'],
  FORMULAIRE: ['SAP Forms', 'ABAP', 'Adobe Forms', 'SmartForms', 'formulaire', 'UI5'],
  PROGRAMME: ['ABAP', 'Java', 'Node.js', 'CAP', 'BTP', 'programme'],
  ENHANCEMENT: ['ABAP', 'Fiori', 'Enhancement Framework', 'BAdI', 'enhancement'],
  MODULE: ['SAP MM', 'SAP SD', 'SAP FI', 'SAP CO', 'SAP PP', 'module', 'Business Analysis'],
  REPORT: ['ABAP', 'CDS Views', 'SAP Analytics Cloud', 'BW/4HANA', 'report', 'ALV'],
};

// ---------------------------------------------------------------------------
// Demo/Mock Recommender
// ---------------------------------------------------------------------------

export class MockAssigneeRecommender implements IAssigneeRecommender {
  recommend(
    ticket: Partial<Ticket>,
    allUsers: User[],
    allTickets: Ticket[],
    weights: ScoringWeights = DEFAULT_WEIGHTS,
  ): AssigneeRecommendation[] {
    // Only consider active, assignable users (not ADMIN)
    const candidates = allUsers.filter(
      (u) =>
        u.active &&
        u.role !== 'ADMIN' &&
        u.role !== 'MANAGER',
    );

    const scored = candidates.map((user) => {
      const availability = this.scoreAvailability(user, allTickets);
      const skills = this.scoreSkillsMatch(user, ticket);
      const performance = this.scorePerformance(user, allTickets);
      const similar = this.scoreSimilarTickets(user, ticket, allTickets);

      const totalScore =
        availability * weights.availability +
        skills * weights.skillsMatch +
        performance * weights.performance +
        similar * weights.similarTickets;

      const explanationParts: string[] = [];
      if (availability > 70) explanationParts.push('high availability');
      if (skills > 60) explanationParts.push('strong skills match');
      if (performance > 60) explanationParts.push('good track record');
      if (similar > 50) explanationParts.push('experience with similar tickets');
      if (explanationParts.length === 0) explanationParts.push('general compatibility');

      return {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        score: Math.round(totalScore * 10) / 10,
        factors: {
          availabilityScore: Math.round(availability),
          skillsMatchScore: Math.round(skills),
          performanceScore: Math.round(performance),
          similarTicketsScore: Math.round(similar),
        },
        explanation: `Recommended due to ${explanationParts.join(', ')}. Overall score: ${Math.round(totalScore)}%.`,
      } satisfies AssigneeRecommendation;
    });

    // Sort descending by score, return top 5
    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  // ---- Scoring functions (0-100 scale) ----

  private scoreAvailability(user: User, allTickets: Ticket[]): number {
    // Base: user.availabilityPercent
    // Penalty: open tickets reduce availability
    const openTickets = allTickets.filter(
      (t) =>
        t.assignedTo === user.id &&
        (t.status === 'NEW' || t.status === 'IN_PROGRESS' || t.status === 'IN_TEST'),
    ).length;

    const penalty = Math.min(openTickets * 12, 60);
    return Math.max(0, user.availabilityPercent - penalty);
  }

  private scoreSkillsMatch(user: User, ticket: Partial<Ticket>): number {
    const ticketSkills: string[] = [];

    // From nature
    if (ticket.nature) {
      ticketSkills.push(...(NATURE_SKILL_MAP[ticket.nature] || []));
    }
    // From tags
    if (ticket.tags) {
      ticketSkills.push(...ticket.tags);
    }

    if (ticketSkills.length === 0) return 50; // neutral

    const userSkillsLower = user.skills.map((s) => s.toLowerCase());
    const matches = ticketSkills.filter((s) =>
      userSkillsLower.some((us) => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us)),
    ).length;

    return Math.min(100, (matches / ticketSkills.length) * 100);
  }

  private scorePerformance(user: User, allTickets: Ticket[]): number {
    const doneTickets = allTickets.filter(
      (t) => t.assignedTo === user.id && t.status === 'DONE',
    );
    if (doneTickets.length === 0) return 40; // no data → neutral-low

    // More done tickets = better track record (up to 20 as max reference)
    return Math.min(100, 40 + (doneTickets.length / 20) * 60);
  }

  private scoreSimilarTickets(
    user: User,
    ticket: Partial<Ticket>,
    allTickets: Ticket[],
  ): number {
    if (!ticket.nature) return 30;

    const sameNatureDone = allTickets.filter(
      (t) =>
        t.assignedTo === user.id &&
        t.nature === ticket.nature &&
        t.status === 'DONE',
    ).length;

    // 0 → 20, 1 → 50, 2 → 70, 3+ → 85+
    if (sameNatureDone === 0) return 20;
    if (sameNatureDone === 1) return 50;
    if (sameNatureDone === 2) return 70;
    return Math.min(100, 85 + sameNatureDone);
  }
}

// ---------------------------------------------------------------------------
// Singleton – swap with real AI service later
// ---------------------------------------------------------------------------

export const assigneeRecommender: IAssigneeRecommender = new MockAssigneeRecommender();
