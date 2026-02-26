import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  ImputationsAPI,
  ImputationPeriodsAPI,
  TicketsAPI,
  UsersAPI,
} from '../../services/odataClient';
import {
  Imputation,
  ImputationPeriod,
  Ticket,
  User,
  IMPUTATION_VALIDATION_LABELS,
  ImputationValidationStatus,
} from '../../types/entities';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodKey(date: string): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const half = d.getDate() <= 15 ? 'H1' : 'H2';
  return `${year}-${month}-${half}`;
}

function getPeriodRange(periodKey: string): { start: string; end: string } {
  const [yearMonth, half] = periodKey.split('-').reduce<string[]>((acc, part, i) => {
    if (i < 2) {
      if (acc.length === 0) acc.push(part);
      else acc[0] += '-' + part;
    } else acc.push(part);
    return acc;
  }, []);
  const [y, m] = yearMonth.split('-').map(Number);
  if (half === 'H1') {
    return {
      start: `${y}-${String(m).padStart(2, '0')}-01`,
      end: `${y}-${String(m).padStart(2, '0')}-15`,
    };
  }
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${String(m).padStart(2, '0')}-16`,
    end: `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
  };
}

function formatPeriodLabel(key: string): string {
  const parts = key.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = parseInt(parts[1], 10) - 1;
  const half = parts[2] === 'H1' ? '1-15' : '16-end';
  return `${monthNames[m]} ${half} ${parts[0]}`;
}

const validationColor: Record<ImputationValidationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  VALIDATED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalendarImputationsProps {
  title: string;
  subtitle: string;
  homePath: string;
  /** If true, the user can add/edit imputations (consultants, manager). False for view-only (Chef de Projet). */
  canEdit: boolean;
  /** If true, the user can also impute hours themselves (Manager role). */
  canImpute: boolean;
  /** If true, reviewer actions are enabled (validate/reject periods). */
  canValidate?: boolean;
  /** If true, validated periods can be sent to StraTIME/Stratime. */
  canSendToStraTIME?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CalendarImputations: React.FC<CalendarImputationsProps> = ({
  title,
  subtitle,
  homePath,
  canEdit,
  canImpute,
  canValidate = false,
  canSendToStraTIME = false,
}) => {
  const { currentUser } = useAuth();
  const [imputations, setImputations] = useState<Imputation[]>([]);
  const [periods, setPeriods] = useState<ImputationPeriod[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Add imputation dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [addForm, setAddForm] = useState({
    ticketId: '',
    hours: 0,
    description: '',
  });

  useEffect(() => {
    void loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [impData, periodData, ticketData, userData] = await Promise.all([
        canImpute
          ? ImputationsAPI.getByConsultant(currentUser.id)
          : ImputationsAPI.getAll(),
        canImpute
          ? ImputationPeriodsAPI.getByConsultant(currentUser.id)
          : ImputationPeriodsAPI.getAll(),
        TicketsAPI.getAll(),
        UsersAPI.getAll(),
      ]);
      setImputations(impData);
      setPeriods(periodData);
      setTickets(ticketData);
      setUsers(userData);
    } finally {
      setLoading(false);
    }
  };

  const ticketLabel = (id: string) => {
    const t = tickets.find((tk) => tk.id === id);
    return t ? `${t.ticketCode} — ${t.title}` : id;
  };
  const consultantName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  // My tickets (assigned to me) for the add form
  const myTickets = useMemo(() => {
    if (!currentUser) return [];
    return tickets.filter(
      (t) => t.assignedTo === currentUser.id && t.status !== 'DONE' && t.status !== 'REJECTED'
    );
  }, [tickets, currentUser]);

  // Calendar computation
  const calendarDays = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: { date: string; day: number; isCurrentMonth: boolean; isWeekend: boolean }[] = [];

    for (let i = -startOffset; i <= lastDay.getDate() + (6 - ((lastDay.getDay() + 6) % 7)); i++) {
      const d = new Date(y, m - 1, i + 1);
      days.push({
        date: d.toISOString().slice(0, 10),
        day: d.getDate(),
        isCurrentMonth: d.getMonth() === m - 1,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    return days;
  }, [calendarMonth]);

  // Group imputations by date
  const imputationsByDate = useMemo(() => {
    const map: Record<string, Imputation[]> = {};
    imputations.forEach((imp) => {
      if (!map[imp.date]) map[imp.date] = [];
      map[imp.date].push(imp);
    });
    return map;
  }, [imputations]);

  const hoursByDate = useMemo(() => {
    const map: Record<string, number> = {};
    imputations.forEach((imp) => {
      map[imp.date] = (map[imp.date] || 0) + imp.hours;
    });
    return map;
  }, [imputations]);

  // Bi-weekly periods for the current view
  const currentPeriods = useMemo(() => {
    const [y, m] = calendarMonth.split('-');
    return [
      { key: `${y}-${m}-H1`, label: formatPeriodLabel(`${y}-${m}-H1`) },
      { key: `${y}-${m}-H2`, label: formatPeriodLabel(`${y}-${m}-H2`) },
    ];
  }, [calendarMonth]);

  const periodData = (key: string) => {
    const p = periods.find((pd) => pd.periodKey === key && (canImpute ? pd.consultantId === currentUser?.id : true));
    const periodImps = imputations.filter((i) => i.periodKey === key && (canImpute ? i.consultantId === currentUser?.id : true));
    const totalHours = periodImps.reduce((s, i) => s + i.hours, 0);
    return { period: p, imputations: periodImps, totalHours };
  };

  const reviewPeriods = useMemo(
    () =>
      periods
        .filter((period) => period.periodKey.startsWith(calendarMonth))
        .sort((a, b) =>
          `${a.periodKey}-${a.consultantId}`.localeCompare(`${b.periodKey}-${b.consultantId}`)
        ),
    [periods, calendarMonth]
  );

  const periodImputations = (period: ImputationPeriod) =>
    imputations.filter(
      (imp) => imp.periodKey === period.periodKey && imp.consultantId === period.consultantId
    );

  // Navigation
  const prevMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Add imputation
  const handleAddImputation = async () => {
    if (!currentUser || !addForm.ticketId || addForm.hours <= 0) {
      toast.error('Please select a ticket and enter hours');
      return;
    }
    const ticket = tickets.find((t) => t.id === addForm.ticketId);
    if (!ticket) return;

    try {
      const newImp = await ImputationsAPI.create({
        consultantId: currentUser.id,
        ticketId: addForm.ticketId,
        projectId: ticket.projectId,
        module: ticket.module,
        date: selectedDate,
        hours: addForm.hours,
        description: addForm.description,
        validationStatus: 'DRAFT',
        periodKey: getPeriodKey(selectedDate),
      });
      setImputations((prev) => [...prev, newImp]);
      setShowAddDialog(false);
      setAddForm({ ticketId: '', hours: 0, description: '' });
      toast.success('Imputation added');
    } catch {
      toast.error('Failed to add imputation');
    }
  };

  // Submit period
  const submitPeriod = async (periodKey: string) => {
    if (!currentUser) return;
    const existing = periods.find((p) => p.periodKey === periodKey && p.consultantId === currentUser.id);
    const range = getPeriodRange(periodKey);
    const periodImps = imputations.filter((i) => i.periodKey === periodKey && i.consultantId === currentUser.id);
    const totalHours = periodImps.reduce((s, i) => s + i.hours, 0);

    try {
      if (existing) {
        const updated = await ImputationPeriodsAPI.submit(existing.id);
        setPeriods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        // Also update imputation statuses locally
        setImputations((prev) =>
          prev.map((i) =>
            i.consultantId === currentUser.id && i.periodKey === periodKey && i.validationStatus === 'DRAFT'
              ? { ...i, validationStatus: 'SUBMITTED' as ImputationValidationStatus }
              : i
          )
        );
      } else {
        const newPeriod = await ImputationPeriodsAPI.create({
          periodKey,
          consultantId: currentUser.id,
          startDate: range.start,
          endDate: range.end,
          status: 'SUBMITTED',
          totalHours,
          submittedAt: new Date().toISOString(),
        });
        setPeriods((prev) => [...prev, newPeriod]);
        setImputations((prev) =>
          prev.map((i) =>
            i.consultantId === currentUser.id && i.periodKey === periodKey && i.validationStatus === 'DRAFT'
              ? { ...i, validationStatus: 'SUBMITTED' as ImputationValidationStatus }
              : i
          )
        );
      }
      toast.success(`Period ${formatPeriodLabel(periodKey)} submitted`);
    } catch {
      toast.error('Failed to submit period');
    }
  };

  const validatePeriod = async (period: ImputationPeriod) => {
    if (!currentUser) return;
    try {
      const updated = await ImputationPeriodsAPI.validate(period.id, currentUser.id);
      setPeriods((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setImputations((prev) =>
        prev.map((entry) =>
          entry.periodKey === period.periodKey && entry.consultantId === period.consultantId
            ? {
                ...entry,
                validationStatus: 'VALIDATED',
                validatedBy: currentUser.id,
                validatedAt: updated.validatedAt ?? new Date().toISOString(),
              }
            : entry
        )
      );
      toast.success(`Period ${formatPeriodLabel(period.periodKey)} validated`);
    } catch {
      toast.error('Failed to validate period');
    }
  };

  const rejectPeriod = async (period: ImputationPeriod) => {
    if (!currentUser) return;
    try {
      const updated = await ImputationPeriodsAPI.reject(period.id, currentUser.id);
      setPeriods((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setImputations((prev) =>
        prev.map((entry) =>
          entry.periodKey === period.periodKey && entry.consultantId === period.consultantId
            ? {
                ...entry,
                validationStatus: 'REJECTED',
                validatedBy: currentUser.id,
                validatedAt: updated.validatedAt ?? new Date().toISOString(),
              }
            : entry
        )
      );
      toast.success(`Period ${formatPeriodLabel(period.periodKey)} rejected`);
    } catch {
      toast.error('Failed to reject period');
    }
  };

  const sendPeriodToStraTIME = async (period: ImputationPeriod) => {
    if (!currentUser) return;
    try {
      const updated = await ImputationPeriodsAPI.sendToStraTIME(period.id, currentUser.id);
      setPeriods((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      toast.success(`Period ${formatPeriodLabel(period.periodKey)} sent to Stratime`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send period to Stratime'
      );
    }
  };

  // Summary stats
  const totalHoursThisMonth = useMemo(() => {
    const prefix = calendarMonth;
    return imputations
      .filter((i) => i.date.startsWith(prefix) && (canImpute ? i.consultantId === currentUser?.id : true))
      .reduce((s, i) => s + i.hours, 0);
  }, [imputations, calendarMonth, canImpute, currentUser]);

  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title={title} subtitle={subtitle} breadcrumbs={[{ label: 'Home', path: homePath }, { label: title }]} />
        <div className="p-6 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[{ label: 'Home', path: homePath }, { label: title }]}
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" /> Total This Month
            </div>
            <p className="text-2xl font-bold">{totalHoursThisMonth}h</p>
          </div>
          {currentPeriods.map((cp) => {
            const pd = periodData(cp.key);
            const periodEntries = periods.filter((period) => period.periodKey === cp.key);
            return (
              <div key={cp.key} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CalendarDays className="h-4 w-4" /> {cp.label}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{pd.totalHours}h</p>
                  {canValidate ? (
                    <Badge variant="outline">{periodEntries.length} period(s)</Badge>
                  ) : pd.period ? (
                    <Badge className={validationColor[pd.period.status]}>
                      {IMPUTATION_VALIDATION_LABELS[pd.period.status]}
                    </Badge>
                  ) : pd.totalHours > 0 ? (
                    <Badge className={validationColor['DRAFT']}>Draft</Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Validated
            </div>
            <p className="text-2xl font-bold">
              {imputations
                .filter((i) => i.validationStatus === 'VALIDATED' && (canImpute ? i.consultantId === currentUser?.id : true))
                .reduce((s, i) => s + i.hours, 0)}h
            </p>
          </div>
          {canValidate && (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Send className="h-4 w-4 text-blue-500" /> Sent to Stratime
              </div>
              <p className="text-2xl font-bold">
                {periods
                  .filter((period) => period.periodKey.startsWith(calendarMonth) && period.sentToStraTIME)
                  .reduce((sum, period) => sum + period.totalHours, 0)}h
              </p>
            </div>
          )}
        </div>

        {/* Bi-weekly period submission bar */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Bi-weekly Submission</span>
            {currentPeriods.map((cp) => {
              const pd = periodData(cp.key);
              const canSubmit = pd.totalHours > 0 && (!pd.period || pd.period.status === 'DRAFT' || pd.period.status === 'REJECTED');
              return (
                <div key={cp.key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{cp.label}:</span>
                  <span className="text-sm font-medium">{pd.totalHours}h</span>
                  {canSubmit && (
                    <Button size="sm" variant="outline" onClick={() => void submitPeriod(cp.key)}>
                      <Send className="h-3 w-3 mr-1" /> Submit
                    </Button>
                  )}
                  {pd.period && pd.period.status !== 'DRAFT' && (
                    <Badge className={validationColor[pd.period.status] + ' text-[10px]'}>
                      {IMPUTATION_VALIDATION_LABELS[pd.period.status]}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canValidate && (
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Validation and Stratime Dispatch</h3>
                <p className="text-xs text-muted-foreground">
                  Validate submitted periods, then send validated periods to the Stratime platform.
                </p>
              </div>
            </div>

            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-4">Consultant</TableHead>
                  <TableHead className="px-4">Period</TableHead>
                  <TableHead className="px-4">Hours</TableHead>
                  <TableHead className="px-4">Validation</TableHead>
                  <TableHead className="px-4">Stratime</TableHead>
                  <TableHead className="px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewPeriods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      No imputation periods found for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviewPeriods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="px-4 py-3 text-sm">{consultantName(period.consultantId)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{formatPeriodLabel(period.periodKey)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold">{period.totalHours}h</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge className={validationColor[period.status] + ' text-[10px]'}>
                          {IMPUTATION_VALIDATION_LABELS[period.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {period.sentToStraTIME ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {period.status === 'SUBMITTED' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => void rejectPeriod(period)}>
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                              <Button size="sm" onClick={() => void validatePeriod(period)}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Validate
                              </Button>
                            </>
                          )}
                          {canSendToStraTIME && period.status === 'VALIDATED' && !period.sentToStraTIME && (
                            <Button size="sm" variant="secondary" onClick={() => void sendPeriodToStraTIME(period)}>
                              <Send className="mr-1 h-3.5 w-3.5" />
                              Send to Stratime
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Calendar View */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between p-4 border-b">
            <Button size="sm" variant="outline" onClick={prevMonth}>← Prev</Button>
            <h3 className="text-lg font-semibold">
              {new Date(Number(calendarMonth.split('-')[0]), Number(calendarMonth.split('-')[1]) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <Button size="sm" variant="outline" onClick={nextMonth}>Next →</Button>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
              {calendarDays.map((cell) => {
                const dayImps = imputationsByDate[cell.date] || [];
                const dayHours = hoursByDate[cell.date] || 0;
                const isToday = cell.date === today;

                return (
                  <div
                    key={cell.date}
                    className={`min-h-[90px] bg-card p-1.5 border-b border-r transition-colors ${
                      !cell.isCurrentMonth ? 'opacity-30' : ''
                    } ${cell.isWeekend ? 'bg-muted/20' : ''} ${
                      isToday ? 'ring-2 ring-primary/40 ring-inset' : ''
                    } ${canEdit && cell.isCurrentMonth ? 'cursor-pointer hover:bg-accent/30' : ''}`}
                    onClick={() => {
                      if (canEdit && cell.isCurrentMonth) {
                        setSelectedDate(cell.date);
                        setShowAddDialog(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {cell.day}
                      </span>
                      {dayHours > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          dayHours >= 8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          dayHours >= 4 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {dayHours}h
                        </span>
                      )}
                    </div>
                    {dayImps.slice(0, 2).map((imp) => {
                      const ticket = tickets.find((t) => t.id === imp.ticketId);
                      return (
                        <div
                          key={imp.id}
                          className="mb-0.5 truncate rounded px-1 py-0.5 text-[9px] font-medium bg-primary/10 text-primary"
                          title={`${ticket?.ticketCode || ''} — ${imp.hours}h — ${imp.description || ''}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {imp.hours}h {ticket?.ticketCode || imp.ticketId.slice(0, 6)}
                        </div>
                      );
                    })}
                    {dayImps.length > 2 && (
                      <div className="text-[9px] text-muted-foreground">+{dayImps.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Period Detail Tables */}
        {(canValidate ? reviewPeriods : currentPeriods).map((entry) => {
          const period = canValidate ? (entry as ImputationPeriod) : periodData((entry as { key: string }).key).period;
          const label = canValidate
            ? `${consultantName((entry as ImputationPeriod).consultantId)} - ${formatPeriodLabel(
                (entry as ImputationPeriod).periodKey
              )}`
            : (entry as { label: string }).label;
          const periodRows = canValidate
            ? periodImputations(entry as ImputationPeriod)
            : periodData((entry as { key: string }).key).imputations;
          const totalHours = periodRows.reduce((sum, imp) => sum + imp.hours, 0);

          if (periodRows.length === 0) return null;

          return (
            <div
              key={canValidate ? (entry as ImputationPeriod).id : (entry as { key: string }).key}
              className="rounded-lg border bg-card"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <Badge className={validationColor[period?.status || 'DRAFT'] + ' text-[10px]'}>
                    {IMPUTATION_VALIDATION_LABELS[period?.status || 'DRAFT']}
                  </Badge>
                  <span className="text-xs text-muted-foreground">({totalHours}h total)</span>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="px-4">Date</TableHead>
                    <TableHead className="px-4">Ticket</TableHead>
                    <TableHead className="px-4">Module</TableHead>
                    <TableHead className="px-4">Hours</TableHead>
                    <TableHead className="px-4">Description</TableHead>
                    <TableHead className="px-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodRows
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="px-4 py-2 text-sm font-mono">{imp.date}</TableCell>
                        <TableCell className="px-4 py-2 text-sm">{ticketLabel(imp.ticketId)}</TableCell>
                        <TableCell className="px-4 py-2">
                          <Badge variant="outline" className="text-[10px]">{imp.module}</Badge>
                        </TableCell>
                        <TableCell className="px-4 py-2 text-sm font-bold">{imp.hours}h</TableCell>
                        <TableCell className="px-4 py-2 text-sm text-muted-foreground max-w-[200px] truncate">{imp.description || '-'}</TableCell>
                        <TableCell className="px-4 py-2">
                          <Badge className={validationColor[imp.validationStatus] + ' text-[10px]'}>
                            {IMPUTATION_VALIDATION_LABELS[imp.validationStatus]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>

      {/* Add Imputation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Imputation — {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Show existing imputations for this date */}
            {(imputationsByDate[selectedDate] || []).length > 0 && (
              <div className="rounded border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Already logged:</p>
                {(imputationsByDate[selectedDate] || []).map((imp) => (
                  <div key={imp.id} className="flex items-center justify-between py-1 text-sm">
                    <span>{ticketLabel(imp.ticketId)}</span>
                    <span className="font-bold">{imp.hours}h</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t mt-1">
                  <span className="text-xs font-semibold">Total</span>
                  <span className="text-sm font-bold">{hoursByDate[selectedDate] || 0}h</span>
                </div>
              </div>
            )}

            <div>
              <Label>Ticket *</Label>
              <Select value={addForm.ticketId} onValueChange={(v) => setAddForm({ ...addForm, ticketId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a ticket" /></SelectTrigger>
                <SelectContent>
                  {myTickets.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.ticketCode} — {t.title} ({t.module})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hours *</Label>
              <Input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={addForm.hours || ''}
                onChange={(e) => setAddForm({ ...addForm, hours: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                rows={2}
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => void handleAddImputation()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarImputations;
