import React, { useMemo, useState } from 'react';
import {
  AbaqueEstimateResult,
  ProjectAbaqueCriteria,
  ProjectAbaqueUsersRange,
  ProjectCustomizationLevel,
} from '../../types/entities';
import { calculateProjectEstimate } from '../../services/abaqueEngine';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Calculator, Globe2, Layers3, ShieldAlert, Users2 } from 'lucide-react';

const MODULE_OPTIONS = ['FI', 'CO', 'MM', 'SD', 'HR', 'PP', 'WM', 'PS'] as const;

const USER_RANGE_DEFAULTS: Record<ProjectAbaqueUsersRange, number> = {
  '1-50': 35,
  '51-200': 125,
  '200+': 260,
};

interface AbaqueEstimatorCardProps {
  initialCriteria?: ProjectAbaqueCriteria;
  applying?: boolean;
  onApply: (
    criteria: ProjectAbaqueCriteria,
    result: AbaqueEstimateResult
  ) => void | Promise<void>;
}

function rangeFromUsers(users: number): ProjectAbaqueUsersRange {
  if (users <= 50) return '1-50';
  if (users <= 200) return '51-200';
  return '200+';
}

function riskClasses(risk: AbaqueEstimateResult['riskLevel']): string {
  if (risk === 'HIGH') return 'border-transparent bg-destructive text-white';
  if (risk === 'MEDIUM') return 'border-transparent bg-amber-500 text-white';
  return 'border-transparent bg-emerald-600 text-white';
}

function complexityClasses(complexity: AbaqueEstimateResult['complexity']): string {
  if (complexity === 'HIGH') return 'border-destructive/40 bg-destructive/10 text-destructive';
  if (complexity === 'MEDIUM') return 'border-amber-500/40 bg-amber-500/10 text-amber-700';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700';
}

export const AbaqueEstimatorCard: React.FC<AbaqueEstimatorCardProps> = ({
  initialCriteria,
  applying = false,
  onApply,
}) => {
  const [userRange, setUserRange] = useState<ProjectAbaqueUsersRange>(() => {
    if (!initialCriteria) return '51-200';
    if (typeof initialCriteria.numberOfUsers === 'string') return initialCriteria.numberOfUsers;
    return rangeFromUsers(initialCriteria.numberOfUsers);
  });
  const [numberOfUsers, setNumberOfUsers] = useState<number>(() => {
    if (!initialCriteria) return 120;
    return typeof initialCriteria.numberOfUsers === 'number'
      ? initialCriteria.numberOfUsers
      : USER_RANGE_DEFAULTS[initialCriteria.numberOfUsers];
  });
  const [numberOfCountries, setNumberOfCountries] = useState<number>(
    initialCriteria?.numberOfCountries ?? 1
  );
  const [customizationLevel, setCustomizationLevel] = useState<ProjectCustomizationLevel>(
    initialCriteria?.customizationLevel ?? 'STANDARD'
  );
  const [modulesInvolved, setModulesInvolved] = useState<string[]>(
    initialCriteria?.modulesInvolved.length ? initialCriteria.modulesInvolved : ['FI', 'CO']
  );

  const criteria = useMemo<ProjectAbaqueCriteria>(
    () => ({
      numberOfUsers,
      modulesInvolved,
      numberOfCountries,
      customizationLevel,
    }),
    [customizationLevel, modulesInvolved, numberOfCountries, numberOfUsers]
  );

  const result = useMemo(() => calculateProjectEstimate(criteria), [criteria]);

  const consumptionColor =
    result.riskLevel === 'HIGH'
      ? 'text-destructive'
      : result.riskLevel === 'MEDIUM'
        ? 'text-amber-600'
        : 'text-emerald-600';

  const toggleModule = (moduleName: string, checked: boolean) => {
    setModulesInvolved((prev) => {
      if (checked) {
        if (prev.includes(moduleName)) return prev;
        return [...prev, moduleName];
      }
      if (prev.length === 1 && prev[0] === moduleName) return prev;
      return prev.filter((m) => m !== moduleName);
    });
  };

  return (
    <Card className="border-border/70 bg-gradient-to-br from-card via-card to-muted/40">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Calculator className="h-5 w-5 text-primary" />
          Abaques de Chiffrage
        </CardTitle>
        <CardDescription>
          Scope the project quickly from SAP parameters and apply a standardized estimate.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 py-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Users Range</Label>
            <Select
              value={userRange}
              onValueChange={(value) => {
                const nextRange = value as ProjectAbaqueUsersRange;
                setUserRange(nextRange);
                setNumberOfUsers(USER_RANGE_DEFAULTS[nextRange]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-50">1-50 users</SelectItem>
                <SelectItem value="51-200">51-200 users</SelectItem>
                <SelectItem value="200+">200+ users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <Label className="text-sm">Estimated User Volume</Label>
              <span className="font-semibold text-foreground">{numberOfUsers} users</span>
            </div>
            <Slider
              value={[numberOfUsers]}
              min={10}
              max={500}
              step={5}
              onValueChange={(values) => {
                const nextUsers = values[0] ?? numberOfUsers;
                setNumberOfUsers(nextUsers);
                setUserRange(rangeFromUsers(nextUsers));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Dynamic sizing used by the estimator logic.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <Label className="text-sm">Number of Countries</Label>
              <span className="font-semibold text-foreground">{numberOfCountries}</span>
            </div>
            <Slider
              value={[numberOfCountries]}
              min={1}
              max={8}
              step={1}
              onValueChange={(values) => setNumberOfCountries(values[0] ?? 1)}
            />
          </div>

          <div className="space-y-2">
            <Label>Customization Level</Label>
            <Select
              value={customizationLevel}
              onValueChange={(value) => setCustomizationLevel(value as ProjectCustomizationLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH_CUSTOM">High Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Modules Involved</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MODULE_OPTIONS.map((moduleName) => (
                <label
                  key={moduleName}
                  className="flex items-center gap-2 rounded-md border border-border/70 bg-background/70 p-2 text-sm"
                >
                  <Checkbox
                    checked={modulesInvolved.includes(moduleName)}
                    onCheckedChange={(checked) => toggleModule(moduleName, checked === true)}
                  />
                  <span>{moduleName}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/90 p-5 transition-all duration-300">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live Estimate</p>
              <h4 className="text-lg font-semibold text-foreground">Scoping Output</h4>
            </div>
            <Badge className={riskClasses(result.riskLevel)}>
              <ShieldAlert className="h-3 w-3" />
              {result.riskLevel} Risk
            </Badge>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <Badge variant="outline" className={complexityClasses(result.complexity)}>
              Complexity {result.complexity}
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Layers3 className="h-3 w-3" />
              {modulesInvolved.length} Modules
            </Badge>
            <Badge variant="secondary" className="bg-accent/20 text-foreground">
              <Globe2 className="h-3 w-3" />
              {numberOfCountries} Countries
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 transition-all duration-300">
              <p className="text-xs text-muted-foreground">Estimated Consulting Days</p>
              <p className="text-2xl font-semibold text-foreground">
                {result.estimatedConsultingDays}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 transition-all duration-300">
              <p className="text-xs text-muted-foreground">Budget Bracket</p>
              <p className={`text-xl font-semibold ${consumptionColor}`}>{result.budgetBracket}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 transition-all duration-300">
              <p className="text-xs text-muted-foreground">Recommended Team Size</p>
              <p className="text-2xl font-semibold text-foreground">{result.recommendedTeamSize}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 transition-all duration-300">
              <p className="text-xs text-muted-foreground">User Scope</p>
              <p className="text-2xl font-semibold text-foreground">{numberOfUsers}</p>
              <p className="text-xs text-muted-foreground">users</p>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            The estimate is generated from internal mock rules (users, modules, countries, and
            customization level).
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t border-border/60">
        <Button
          type="button"
          onClick={() => void onApply(criteria, result)}
          disabled={applying || modulesInvolved.length === 0}
        >
          {applying ? 'Applying...' : 'Apply Estimate to Project'}
          <Users2 className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

