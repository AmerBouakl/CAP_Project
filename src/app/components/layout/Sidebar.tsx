import React from 'react';
import { useLocation, NavLink } from 'react-router';
import {
  BarChart3,
  Clock,
  FolderKanban,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  TriangleAlert,
  UserRound,
  Users,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Award,
  CalendarDays,
  BookOpenText,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/entities';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';

const APP_NAME = 'Performance Hub';
const BRAND_NAME = 'Inetum';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  section: string;
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: Shield,
    roles: ['ADMIN'],
    section: 'Administration',
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: Users,
    roles: ['ADMIN'],
    section: 'Administration',
  },
  {
    label: 'Reference Data',
    path: '/admin/reference-data',
    icon: SlidersHorizontal,
    roles: ['ADMIN'],
    section: 'Administration',
  },
  {
    label: 'Performance',
    path: '/manager/dashboard',
    icon: BarChart3,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Projects',
    path: '/manager/projects',
    icon: FolderKanban,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Team',
    path: '/manager/team',
    icon: Users,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Allocations',
    path: '/manager/allocations',
    icon: LayoutDashboard,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Risks',
    path: '/manager/risks',
    icon: TriangleAlert,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Tickets',
    path: '/manager/tickets',
    icon: Ticket,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Objects',
    path: '/manager/objects',
    icon: BookOpenText,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'WRICEF',
    path: '/manager/wricef',
    icon: FileSpreadsheet,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Certifications',
    path: '/manager/certifications',
    icon: Award,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Leave',
    path: '/manager/leave',
    icon: CalendarDays,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Imputations',
    path: '/manager/imputations',
    icon: Clock,
    roles: ['MANAGER'],
    section: 'Manager',
  },
  {
    label: 'Dashboard',
    path: '/consultant-tech/dashboard',
    icon: Gauge,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Projects',
    path: '/consultant-tech/projects',
    icon: FolderKanban,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Tickets',
    path: '/consultant-tech/tickets',
    icon: Ticket,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Objects',
    path: '/consultant-tech/objects',
    icon: BookOpenText,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'WRICEF',
    path: '/consultant-tech/wricef',
    icon: FileSpreadsheet,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Performance',
    path: '/consultant-tech/performance',
    icon: BarChart3,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Certifications',
    path: '/consultant-tech/certifications',
    icon: Award,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Leave',
    path: '/consultant-tech/leave',
    icon: CalendarDays,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Imputations',
    path: '/consultant-tech/imputations',
    icon: Clock,
    roles: ['CONSULTANT_TECHNIQUE'],
    section: 'Tech Consultant',
  },
  {
    label: 'Dashboard',
    path: '/consultant-func/dashboard',
    icon: Gauge,
    roles: ['CONSULTANT_FONCTIONNEL'],
    section: 'Functional Consultant',
  },
  {
    label: 'Projects',
    path: '/consultant-func/projects',
    icon: FolderKanban,
    roles: ['CONSULTANT_FONCTIONNEL'],
    section: 'Functional Consultant',
  },
  {
    label: 'Deliverables',
    path: '/consultant-func/deliverables',
    icon: Wrench,
    roles: ['CONSULTANT_FONCTIONNEL'],
    section: 'Functional Consultant',
  },
  {
    label: 'Tickets',
    path: '/consultant-func/tickets',
    icon: Ticket,
    roles: ['CONSULTANT_FONCTIONNEL'],
    section: 'Functional Consultant',
  },
  {
    label: 'Objects',
    path: '/consultant-func/objects',
    icon: BookOpenText,
    roles: ['CONSULTANT_FONCTIONNEL'],
    section: 'Functional Consultant',
  },
  {
    label: 'WRICEF',
    path: '/consultant-func/wricef',
    icon: FileSpreadsheet,
    roles: ['CONSULTANT_FONCTIONNEL'],
    section: 'Functional Consultant',
  },
  // ---- Project Manager ----
  {
    label: 'Dashboard',
    path: '/project-manager/dashboard',
    icon: Gauge,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  {
    label: 'Projects',
    path: '/project-manager/projects',
    icon: FolderKanban,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  {
    label: 'Tickets',
    path: '/project-manager/tickets',
    icon: Ticket,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  {
    label: 'Objects',
    path: '/project-manager/objects',
    icon: BookOpenText,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  {
    label: 'WRICEF',
    path: '/project-manager/wricef',
    icon: FileSpreadsheet,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  {
    label: 'Allocations',
    path: '/project-manager/allocations',
    icon: LayoutDashboard,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  {
    label: 'Team',
    path: '/project-manager/team',
    icon: Users,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  {
    label: 'Imputations',
    path: '/project-manager/imputations',
    icon: Clock,
    roles: ['PROJECT_MANAGER'],
    section: 'Project Manager',
  },
  // ---- Dev Coordinator ----
  {
    label: 'Dashboard',
    path: '/dev-coordinator/dashboard',
    icon: Gauge,
    roles: ['DEV_COORDINATOR'],
    section: 'Dev Coordinator',
  },
  {
    label: 'Tickets',
    path: '/dev-coordinator/tickets',
    icon: Ticket,
    roles: ['DEV_COORDINATOR'],
    section: 'Dev Coordinator',
  },
  {
    label: 'Objects',
    path: '/dev-coordinator/objects',
    icon: BookOpenText,
    roles: ['DEV_COORDINATOR'],
    section: 'Dev Coordinator',
  },
  {
    label: 'WRICEF',
    path: '/dev-coordinator/wricef',
    icon: FileSpreadsheet,
    roles: ['DEV_COORDINATOR'],
    section: 'Dev Coordinator',
  },
  {
    label: 'AI Dispatch',
    path: '/dev-coordinator/ai-dispatch',
    icon: Sparkles,
    roles: ['DEV_COORDINATOR'],
    section: 'Dev Coordinator',
  },
  {
    label: 'Workload',
    path: '/dev-coordinator/workload',
    icon: BarChart3,
    roles: ['DEV_COORDINATOR'],
    section: 'Dev Coordinator',
  },
  {
    label: 'Imputations',
    path: '/dev-coordinator/imputations',
    icon: Clock,
    roles: ['DEV_COORDINATOR'],
    section: 'Dev Coordinator',
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}

const roleLabel: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  PROJECT_MANAGER: 'Project Manager',
  DEV_COORDINATOR: 'Dev Coordinator',
  CONSULTANT_TECHNIQUE: 'Technical Consultant',
  CONSULTANT_FONCTIONNEL: 'Functional Consultant',
};

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  const items = navigationItems.filter((item) => item.roles.includes(currentUser.role));

  const sections = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {});

  const renderSidebarContent = (mobile = false) => {
    const compact = !mobile && collapsed;

    return (
      <div className="flex h-full flex-col bg-sidebar">
        <div
          className={cn(
            'flex h-16 items-center border-b border-sidebar-border px-4',
            compact ? 'justify-center' : 'justify-between'
          )}
        >
          <div className={cn('flex items-center gap-3', compact && 'justify-center')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            {!compact && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {BRAND_NAME}
                </p>
                <p className="text-sm font-semibold text-sidebar-foreground">{APP_NAME}</p>
              </div>
            )}
          </div>

          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {Object.entries(sections).map(([sectionName, sectionItems]) => (
            <div key={sectionName} className="mb-5 last:mb-0">
              {!compact && (
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {sectionName}
                </p>
              )}
              <div className="space-y-1.5">
                {sectionItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={compact ? item.label : undefined}
                      onClick={() => mobile && onCloseMobile()}
                      className={({ isActive }) =>
                        cn(
                          'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
                          compact && 'justify-center'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isActive ? 'text-primary' : 'text-sidebar-foreground/70'
                            )}
                          />
                          {!compact && <span className="truncate font-medium">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={cn('border-t border-sidebar-border p-3', collapsed && !mobile ? 'px-2' : 'px-3')}>
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg bg-surface-2 p-2',
              collapsed && !mobile && 'justify-center'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            {(!collapsed || mobile) && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{currentUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">{roleLabel[currentUser.role]}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 border-r border-sidebar-border transition-[width] duration-300 md:block',
          collapsed ? 'w-[92px]' : 'w-[280px]'
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onCloseMobile()}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          {renderSidebarContent(true)}
        </SheetContent>
      </Sheet>
    </>
  );
};
