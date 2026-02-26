import {
  AbaqueEstimateResult,
  ProjectAbaqueCriteria,
  ProjectAbaqueUsersRange,
} from '../types/entities';

const USER_RANGE_MIDPOINTS: Record<ProjectAbaqueUsersRange, number> = {
  '1-50': 35,
  '51-200': 125,
  '200+': 260,
};

const DAILY_RATE_EUR = 950;

function normalizeUsers(value: ProjectAbaqueCriteria['numberOfUsers']): number {
  if (typeof value === 'number') return Math.max(1, value);
  return USER_RANGE_MIDPOINTS[value];
}

function computeComplexityScore(criteria: ProjectAbaqueCriteria): number {
  const users = normalizeUsers(criteria.numberOfUsers);
  const modules = criteria.modulesInvolved.length;
  const countries = Math.max(1, criteria.numberOfCountries);

  let score = 0;

  if (users > 200) score += 3;
  else if (users > 50) score += 1;

  if (modules > 5) score += 4;
  else if (modules > 3) score += 3;
  else if (modules > 1) score += 1;

  if (countries > 3) score += 4;
  else if (countries > 2) score += 3;
  else if (countries > 1) score += 1;

  if (criteria.customizationLevel === 'HIGH_CUSTOM') score += 5;
  else if (criteria.customizationLevel === 'MEDIUM') score += 2;

  return score;
}

export function calculateProjectEstimate(criteria: ProjectAbaqueCriteria): AbaqueEstimateResult {
  const users = normalizeUsers(criteria.numberOfUsers);
  const modules = criteria.modulesInvolved.length;
  const countries = Math.max(1, criteria.numberOfCountries);
  const score = computeComplexityScore(criteria);

  const forcedHigh =
    criteria.customizationLevel === 'HIGH_CUSTOM' || modules > 3 || countries > 2;

  const complexity =
    forcedHigh || score >= 9 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW';

  let estimatedConsultingDays = 18;

  estimatedConsultingDays += modules * 4;
  estimatedConsultingDays += Math.max(0, countries - 1) * 6;

  if (users > 200) estimatedConsultingDays += 24;
  else if (users > 50) estimatedConsultingDays += 10;

  if (criteria.customizationLevel === 'HIGH_CUSTOM') estimatedConsultingDays += 36;
  else if (criteria.customizationLevel === 'MEDIUM') estimatedConsultingDays += 16;

  if (complexity === 'HIGH') estimatedConsultingDays += 12;
  if (complexity === 'LOW') estimatedConsultingDays = Math.max(12, estimatedConsultingDays - 4);

  const rawBudget = estimatedConsultingDays * DAILY_RATE_EUR;
  const lowerBudget = Math.round((rawBudget * 0.85) / 1000) * 1000;
  const upperBudget = Math.round((rawBudget * 1.15) / 1000) * 1000;

  const budgetBracket = `${Math.round(lowerBudget / 1000)}k - ${Math.round(upperBudget / 1000)}k EUR`;

  const riskLevel =
    complexity === 'HIGH' || score >= 10
      ? 'HIGH'
      : complexity === 'MEDIUM'
        ? 'MEDIUM'
        : 'LOW';

  const recommendedTeamSize = Math.max(
    complexity === 'HIGH' ? 4 : complexity === 'MEDIUM' ? 3 : 2,
    Math.ceil(estimatedConsultingDays / 45)
  );

  return {
    complexity,
    estimatedConsultingDays,
    budgetBracket,
    riskLevel,
    recommendedTeamSize,
  };
}

