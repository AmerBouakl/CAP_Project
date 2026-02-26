import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  TicketsAPI,
  TicketCommentsAPI,
  WricefObjectsAPI,
  ProjectsAPI,
  UsersAPI,
} from '../../services/odataClient';
import {
  Ticket,
  TicketComment,
  TicketEvent,
  TicketStatus,
  WricefObject,
  Project,
  User,
  TICKET_STATUS_LABELS,
  TICKET_NATURE_LABELS,
  TICKET_COMPLEXITY_LABELS,
  SAP_MODULE_LABELS,
  USER_ROLE_LABELS,
  UserRole,
} from '../../types/entities';
import { toast } from 'sonner';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import {
  ArrowLeft,
  Send,
  Clock,
  UserIcon,
  MessageSquare,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  TestTube,
  CircleDot,
  ArrowRight,
  CalendarDays,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColor: Record<TicketStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  IN_TEST: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  DONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
};

const priorityColor: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_ORDER: TicketStatus[] = ['NEW', 'IN_PROGRESS', 'IN_TEST', 'BLOCKED', 'DONE', 'REJECTED'];

const eventIcon: Record<string, React.ReactNode> = {
  CREATED: <CircleDot className="h-3.5 w-3.5 text-blue-500" />,
  STATUS_CHANGE: <Activity className="h-3.5 w-3.5 text-amber-500" />,
  ASSIGNED: <UserIcon className="h-3.5 w-3.5 text-indigo-500" />,
  COMMENT: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
  PRIORITY_CHANGE: <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />,
  EFFORT_CHANGE: <Clock className="h-3.5 w-3.5 text-cyan-500" />,
  SENT_TO_TEST: <TestTube className="h-3.5 w-3.5 text-purple-500" />,
};

const statusIcon: Record<string, React.ReactNode> = {
  NEW: <CircleDot className="h-4 w-4" />,
  IN_PROGRESS: <PlayCircle className="h-4 w-4" />,
  IN_TEST: <TestTube className="h-4 w-4" />,
  BLOCKED: <PauseCircle className="h-4 w-4" />,
  DONE: <CheckCircle2 className="h-4 w-4" />,
  REJECTED: <XCircle className="h-4 w-4" />,
};

// Chat bubble role colors
const roleBubbleColor: Record<string, { bg: string; name: string }> = {
  CONSULTANT_TECHNIQUE: {
    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    name: 'text-blue-700 dark:text-blue-300',
  },
  CONSULTANT_FONCTIONNEL: {
    bg: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800',
    name: 'text-green-700 dark:text-green-300',
  },
  MANAGER: {
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    name: 'text-purple-700 dark:text-purple-300',
  },
};
const defaultBubble = {
  bg: 'bg-muted/50 border-border',
  name: 'text-foreground',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [wricefObjects, setWricefObjects] = useState<WricefObject[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!ticketId) return;
    void loadData();
  }, [ticketId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTickets, projectData, userData, wricefData] = await Promise.all([
        TicketsAPI.getAll(),
        ProjectsAPI.getAll(),
        UsersAPI.getAll(),
        WricefObjectsAPI.getAll(),
      ]);

      const found = allTickets.find((t) => t.id === ticketId);
      if (found) {
        setTicket(found);
        const chatMessages = await TicketCommentsAPI.getByTicket(found.id);
        setComments(chatMessages);
      }

      setProjects(projectData);
      setUsers(userData);
      setWricefObjects(wricefData);
    } catch (err) {
      console.error('Failed to load ticket', err);
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const userName = useCallback(
    (id?: string) => users.find((u) => u.id === id)?.name ?? id ?? '—',
    [users]
  );
  const userRole = useCallback(
    (id?: string) => users.find((u) => u.id === id)?.role ?? undefined,
    [users]
  );
  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? id,
    [projects]
  );
  const objectName = useCallback(
    (woId?: string) => {
      const wo = wricefObjects.find((o) => o.id === woId);
      return wo ? `${wo.wricefId} – ${wo.title}` : '—';
    },
    [wricefObjects]
  );
  const findWricefObjectForItem = useCallback(
    (itemId?: string) => {
      if (!itemId) return undefined;
      return wricefObjects.find((wo) => wo.items?.some((i) => i.id === itemId));
    },
    [wricefObjects]
  );

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------
  const sendMessage = async () => {
    if (!newMessage.trim() || !ticket || !currentUser) return;
    setSending(true);
    try {
      const created = await TicketCommentsAPI.create({
        ticketId: ticket.id,
        userId: currentUser.id,
        userRole: currentUser.role,
        message: newMessage.trim(),
      });
      setComments((prev) => [...prev, created]);
      setNewMessage('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (newStatus: TicketStatus) => {
    if (!ticket || !currentUser) return;
    try {
      const updated = await TicketsAPI.update(ticket.id, { status: newStatus });
      setTicket(updated);
      // Reload to get fresh history
      const refreshed = (await TicketsAPI.getAll()).find((t) => t.id === ticket.id);
      if (refreshed) setTicket(refreshed);
      toast.success(`Status changed to ${TICKET_STATUS_LABELS[newStatus]}`);
    } catch {
      toast.error('Failed to change status');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------
  const parentWricef = useMemo(
    () => findWricefObjectForItem(ticket?.wricefItemId),
    [ticket, findWricefObjectForItem]
  );

  const sortedHistory = useMemo(() => {
    if (!ticket?.history) return [];
    return [...ticket.history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [ticket?.history]);

  const isManager =
    currentUser?.role === 'MANAGER' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'PROJECT_MANAGER' ||
    currentUser?.role === 'DEV_COORDINATOR';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">Ticket not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button + title bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {ticket.ticketCode}
            </Badge>
            <h1 className="text-xl font-bold text-foreground truncate">{ticket.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projectName(ticket.projectId)}
            {parentWricef && <> · Object: {parentWricef.wricefId} – {parentWricef.title}</>}
          </p>
        </div>
      </div>

      {/* Main layout: Left (details + chat) | Right (feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ======= LEFT COLUMN (2/3) ======= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColor[ticket.status]}>
              <span className="mr-1">{statusIcon[ticket.status]}</span>
              {TICKET_STATUS_LABELS[ticket.status]}
            </Badge>
            <Badge className={priorityColor[ticket.priority]}>{ticket.priority}</Badge>
            <Badge variant="outline">{TICKET_NATURE_LABELS[ticket.nature]}</Badge>
            <Badge variant="outline">{SAP_MODULE_LABELS[ticket.module]}</Badge>
            <Badge variant="outline" className={ticket.complexity === 'TRES_COMPLEXE' ? 'border-red-300 text-red-700 dark:text-red-400' : ''}>
              {TICKET_COMPLEXITY_LABELS[ticket.complexity]}
            </Badge>
          </div>

          {/* Status change actions */}
          {isManager && ticket.status !== 'DONE' && ticket.status !== 'REJECTED' && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground self-center mr-1">Change to:</span>
              {STATUS_ORDER.filter((s) => s !== ticket.status).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => void changeStatus(s)}>
                  {statusIcon[s]}
                  <span className="ml-1">{TICKET_STATUS_LABELS[s]}</span>
                </Button>
              ))}
            </div>
          )}

          {/* Description */}
          {ticket.description && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Detail grid */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="text-sm font-semibold mb-3">Details</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Project</span>
                  <p className="font-medium">{projectName(ticket.projectId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Object</span>
                  <p className="font-medium">{parentWricef ? `${parentWricef.wricefId} – ${parentWricef.title}` : '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created by</span>
                  <p className="font-medium">{userName(ticket.createdBy)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned to</span>
                  <p className="font-medium">{userName(ticket.assignedTo)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Module</span>
                  <p className="font-medium">{SAP_MODULE_LABELS[ticket.module]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Complexity</span>
                  <p className="font-medium">{TICKET_COMPLEXITY_LABELS[ticket.complexity]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estimation</span>
                  <p className="font-medium">{ticket.estimationHours}h</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actual Effort</span>
                  <p className="font-medium">{ticket.effortHours}h</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date</span>
                  <p className="font-medium flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
                {ticket.estimationHours > 0 && ticket.effortHours > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Est. vs Actual</span>
                    <p className={`font-semibold ${ticket.effortHours > ticket.estimationHours ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {((ticket.effortHours / ticket.estimationHours) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ======= CHAT SECTION ======= */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Discussion ({comments.length})
              </h3>

              {/* Messages */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 mb-4">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No messages yet. Start the conversation.
                  </p>
                )}
                {comments.map((c) => {
                  const isMe = c.userId === currentUser?.id;
                  const role = c.userRole || userRole(c.userId) || '';
                  const bubble = roleBubbleColor[role] || defaultBubble;
                  const roleLabel = USER_ROLE_LABELS[role as UserRole] || role;
                  return (
                    <div
                      key={c.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-xl px-4 py-2.5 max-w-[80%] border ${bubble.bg} space-y-1`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-xs font-semibold ${bubble.name}`}>
                            {userName(c.userId)}
                            {roleLabel && (
                              <span className="ml-1 font-normal opacity-70">({roleLabel})</span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(c.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <Separator className="mb-3" />

              {/* Input */}
              <div className="flex gap-2 items-end">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  className="min-h-[60px] resize-none flex-1"
                  rows={2}
                />
                <Button
                  size="sm"
                  className="h-10 px-4"
                  disabled={!newMessage.trim() || sending}
                  onClick={() => void sendMessage()}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ======= RIGHT COLUMN (1/3) — Activity Feed ======= */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardContent className="pt-4 pb-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Activity Feed
              </h3>

              <div className="space-y-0">
                {sortedHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No activity yet.</p>
                ) : (
                  sortedHistory.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative pl-6 pb-5 last:pb-0">
                      {/* Timeline line */}
                      {idx < sortedHistory.length - 1 && (
                        <div className="absolute left-[9px] top-5 w-px h-full bg-border" />
                      )}
                      {/* Icon dot */}
                      <div className="absolute left-0 top-0.5 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-background border border-border">
                        {eventIcon[evt.action] || <Activity className="h-3 w-3" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(evt.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">{userName(evt.userId)}</span>
                          {evt.action === 'CREATED' && (
                            <span> created this ticket</span>
                          )}
                          {evt.action === 'STATUS_CHANGE' && (
                            <span>
                              {' '}changed status{' '}
                              <Badge variant="outline" className="text-[9px] mx-0.5 py-0">
                                {TICKET_STATUS_LABELS[evt.fromValue as TicketStatus] ?? evt.fromValue}
                              </Badge>
                              <ArrowRight className="inline h-3 w-3 mx-0.5 text-muted-foreground" />
                              <Badge variant="outline" className="text-[9px] mx-0.5 py-0">
                                {TICKET_STATUS_LABELS[evt.toValue as TicketStatus] ?? evt.toValue}
                              </Badge>
                            </span>
                          )}
                          {evt.action === 'ASSIGNED' && (
                            <span> assigned to <span className="font-medium">{userName(evt.toValue)}</span></span>
                          )}
                          {evt.action === 'PRIORITY_CHANGE' && (
                            <span>
                              {' '}changed priority{' '}
                              <Badge variant="outline" className="text-[9px] mx-0.5 py-0">{evt.fromValue}</Badge>
                              <ArrowRight className="inline h-3 w-3 mx-0.5 text-muted-foreground" />
                              <Badge variant="outline" className="text-[9px] mx-0.5 py-0">{evt.toValue}</Badge>
                            </span>
                          )}
                          {evt.action === 'EFFORT_CHANGE' && (
                            <span> logged effort: {evt.fromValue}h → {evt.toValue}h</span>
                          )}
                          {evt.action === 'SENT_TO_TEST' && (
                            <span> sent to test</span>
                          )}
                          {evt.action === 'COMMENT' && evt.comment && (
                            <span>: {evt.comment}</span>
                          )}
                        </div>
                        {evt.comment && evt.action !== 'COMMENT' && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{evt.comment}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
