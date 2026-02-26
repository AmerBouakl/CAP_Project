// React Router configuration with role-based routing

import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { getDefaultRouteForRole, useAuth } from './context/AuthContext';
import { UserRole } from './types/entities';

// Lazy-loaded page components for code splitting
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement').then(m => ({ default: m.UsersManagement })));
const ReferenceDataManagement = lazy(() => import('./pages/admin/ReferenceData').then(m => ({ default: m.ReferenceDataManagement })));

const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const Projects = lazy(() => import('./pages/manager/ProjectsEnhanced').then(m => ({ default: m.ProjectsEnhanced })));
const ProjectDetails = lazy(() => import('./pages/manager/ProjectDetails').then(m => ({ default: m.ProjectDetails })));
const TeamPerformance = lazy(() => import('./pages/manager/TeamPerformance').then(m => ({ default: m.TeamPerformance })));
const ResourceAllocation = lazy(() => import('./pages/manager/ResourceAllocation').then(m => ({ default: m.ResourceAllocation })));
const RisksAndCriticalTasks = lazy(() => import('./pages/manager/RisksAndCriticalTasks').then(m => ({ default: m.RisksAndCriticalTasks })));

const TechDashboard = lazy(() => import('./pages/consultant-tech/TechDashboard').then(m => ({ default: m.TechDashboard })));
const TechTickets = lazy(() => import('./pages/consultant-tech/TechTickets').then(m => ({ default: m.TechTickets })));
const MyProjects = lazy(() => import('./pages/consultant-tech/MyProjects').then(m => ({ default: m.MyProjects })));
const MyPerformance = lazy(() => import('./pages/consultant-tech/MyPerformance').then(m => ({ default: m.MyPerformance })));

const FuncDashboard = lazy(() => import('./pages/consultant-func/FuncDashboard').then(m => ({ default: m.FuncDashboard })));
const Deliverables = lazy(() => import('./pages/consultant-func/Deliverables').then(m => ({ default: m.Deliverables })));
const FuncProjects = lazy(() => import('./pages/consultant-func/Projects').then(m => ({ default: m.FuncProjects })));
const FuncTickets = lazy(() => import('./pages/consultant-func/Tickets').then(m => ({ default: m.FuncTickets })));

const ManagerTickets = lazy(() => import('./pages/manager/ManagerTickets').then(m => ({ default: m.ManagerTickets })));
const CertifiedConsultants = lazy(() => import('./pages/manager/CertifiedConsultants').then(m => ({ default: m.CertifiedConsultants })));
const GestionConges = lazy(() => import('./pages/manager/GestionConges').then(m => ({ default: m.GestionConges })));
const ImputationsEquipe = lazy(() => import('./pages/manager/ImputationsEquipe').then(m => ({ default: m.ImputationsEquipe })));

const MyCertifications = lazy(() => import('./pages/consultant-tech/MyCertifications').then(m => ({ default: m.MyCertifications })));
const MesConges = lazy(() => import('./pages/consultant-tech/MesConges').then(m => ({ default: m.MesConges })));
const MesImputations = lazy(() => import('./pages/consultant-tech/MesImputations').then(m => ({ default: m.MesImputations })));

const ProfilePage = lazy(() => import('./pages/shared/Profile').then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/shared/Settings').then(m => ({ default: m.SettingsPage })));
const DocumentationDetails = lazy(() => import('./pages/shared/DocumentationDetails').then(m => ({ default: m.DocumentationDetails })));
const DocumentationObjectsPage = lazy(() => import('./pages/shared/DocumentationObjectsPage').then(m => ({ default: m.DocumentationObjectsPage })));
const WricefObjectsPage = lazy(() => import('./pages/shared/WricefObjectsPage'));
const TicketDetail = lazy(() => import('./pages/shared/TicketDetail').then(m => ({ default: m.TicketDetail })));

// New role pages
const ProjectManagerDashboard = lazy(() => import('./pages/project-manager/ProjectManagerDashboard'));
const DevCoordinatorDashboard = lazy(() => import('./pages/dev-coordinator/DevCoordinatorDashboard'));
const AIDispatchPage = lazy(() => import('./pages/dev-coordinator/AIDispatchPage'));
const WorkloadPage = lazy(() => import('./pages/dev-coordinator/WorkloadPage'));
const PMImputations = lazy(() => import('./pages/project-manager/PMImputations').then(m => ({ default: m.PMImputations })));
const DevCoordImputations = lazy(() => import('./pages/dev-coordinator/DevCoordImputations').then(m => ({ default: m.DevCoordImputations })));

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
    Loading...
  </div>
);

const SuspensePage = ({ children }: { children: ReactElement }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
    Loading session...
  </div>
);

const RequireAuth = ({ children }: { children: ReactElement }) => {
  const { currentUser, isAuthenticated, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  return children;
};

const PublicOnlyRoute = ({ children }: { children: ReactElement }) => {
  const { currentUser, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && currentUser) {
    return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />;
  }

  return children;
};

const RequireRole = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
  const { currentUser, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />;
  }

  return <Outlet />;
};

const RoleDashboardRedirect = () => {
  const { currentUser, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <Login />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },

      // Auto-redirect dashboard to role-specific dashboard
      {
        path: 'dashboard',
        element: <RoleDashboardRedirect />,
      },

      // Admin routes
      {
        path: 'admin',
        element: <RequireRole allowedRoles={['ADMIN']} />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <SuspensePage><AdminDashboard /></SuspensePage>,
          },
          {
            path: 'users',
            element: <SuspensePage><UsersManagement /></SuspensePage>,
          },
          {
            path: 'reference-data',
            element: <SuspensePage><ReferenceDataManagement /></SuspensePage>,
          },
        ],
      },

      // Manager routes
      {
        path: 'manager',
        element: <RequireRole allowedRoles={['MANAGER']} />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <SuspensePage><ManagerDashboard /></SuspensePage>,
          },
          {
            path: 'projects',
            element: <SuspensePage><Projects /></SuspensePage>,
          },
          {
            path: 'projects/:id',
            element: <SuspensePage><ProjectDetails /></SuspensePage>,
          },
          {
            path: 'team',
            element: <SuspensePage><TeamPerformance /></SuspensePage>,
          },
          {
            path: 'allocations',
            element: <SuspensePage><ResourceAllocation /></SuspensePage>,
          },
          {
            path: 'risks',
            element: <SuspensePage><RisksAndCriticalTasks /></SuspensePage>,
          },
          {
            path: 'tickets',
            element: <SuspensePage><ManagerTickets /></SuspensePage>,
          },
          {
            path: 'tickets/:ticketId',
            element: <SuspensePage><TicketDetail /></SuspensePage>,
          },
          {
            path: 'objects',
            element: <SuspensePage><DocumentationObjectsPage /></SuspensePage>,
          },
          {
            path: 'wricef',
            element: <SuspensePage><WricefObjectsPage /></SuspensePage>,
          },
          {
            path: 'ai-dispatch',
            element: <Navigate to="/manager/allocations" replace />,
          },
          {
            path: 'certifications',
            element: <SuspensePage><CertifiedConsultants /></SuspensePage>,
          },
          {
            path: 'leave',
            element: <SuspensePage><GestionConges /></SuspensePage>,
          },
          {
            path: 'imputations',
            element: <SuspensePage><ImputationsEquipe /></SuspensePage>,
          },
        ],
      },

      // Technical Consultant routes
      {
        path: 'consultant-tech',
        element: <RequireRole allowedRoles={['CONSULTANT_TECHNIQUE']} />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <SuspensePage><TechDashboard /></SuspensePage>,
          },
          {
            path: 'projects',
            element: <SuspensePage><MyProjects /></SuspensePage>,
          },
          {
            path: 'tickets',
            element: <SuspensePage><TechTickets /></SuspensePage>,
          },
          {
            path: 'tickets/:ticketId',
            element: <SuspensePage><TicketDetail /></SuspensePage>,
          },
          {
            path: 'performance',
            element: <SuspensePage><MyPerformance /></SuspensePage>,
          },
          {
            path: 'certifications',
            element: <SuspensePage><MyCertifications /></SuspensePage>,
          },
          {
            path: 'leave',
            element: <SuspensePage><MesConges /></SuspensePage>,
          },
          {
            path: 'imputations',
            element: <SuspensePage><MesImputations /></SuspensePage>,
          },
          {
            path: 'objects',
            element: <SuspensePage><DocumentationObjectsPage /></SuspensePage>,
          },
          {
            path: 'wricef',
            element: <SuspensePage><WricefObjectsPage /></SuspensePage>,
          },
        ],
      },

      // Functional Consultant routes
      {
        path: 'consultant-func',
        element: <RequireRole allowedRoles={['CONSULTANT_FONCTIONNEL']} />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <SuspensePage><FuncDashboard /></SuspensePage>,
          },
          {
            path: 'projects',
            element: <SuspensePage><FuncProjects /></SuspensePage>,
          },
          {
            path: 'deliverables',
            element: <SuspensePage><Deliverables /></SuspensePage>,
          },
          {
            path: 'tickets',
            element: <SuspensePage><FuncTickets /></SuspensePage>,
          },
          {
            path: 'tickets/:ticketId',
            element: <SuspensePage><TicketDetail /></SuspensePage>,
          },
          {
            path: 'objects',
            element: <SuspensePage><DocumentationObjectsPage /></SuspensePage>,
          },
          {
            path: 'wricef',
            element: <SuspensePage><WricefObjectsPage /></SuspensePage>,
          },
        ],
      },

      // Project Manager routes
      {
        path: 'project-manager',
        element: <RequireRole allowedRoles={['PROJECT_MANAGER']} />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <SuspensePage><ProjectManagerDashboard /></SuspensePage>,
          },
          {
            path: 'projects',
            element: <SuspensePage><Projects /></SuspensePage>,
          },
          {
            path: 'projects/:id',
            element: <SuspensePage><ProjectDetails /></SuspensePage>,
          },
          {
            path: 'tickets',
            element: <SuspensePage><ManagerTickets /></SuspensePage>,
          },
          {
            path: 'tickets/:ticketId',
            element: <SuspensePage><TicketDetail /></SuspensePage>,
          },
          {
            path: 'ai-dispatch',
            element: <Navigate to="/project-manager/allocations" replace />,
          },
          {
            path: 'objects',
            element: <SuspensePage><DocumentationObjectsPage /></SuspensePage>,
          },
          {
            path: 'wricef',
            element: <SuspensePage><WricefObjectsPage /></SuspensePage>,
          },
          {
            path: 'ticket-groups',
            element: <Navigate to="/project-manager/wricef" replace />,
          },
          {
            path: 'allocations',
            element: <SuspensePage><ResourceAllocation /></SuspensePage>,
          },
          {
            path: 'team',
            element: <SuspensePage><TeamPerformance /></SuspensePage>,
          },
          {
            path: 'imputations',
            element: <SuspensePage><PMImputations /></SuspensePage>,
          },
        ],
      },

      // Dev Coordinator routes
      {
        path: 'dev-coordinator',
        element: <RequireRole allowedRoles={['DEV_COORDINATOR']} />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <SuspensePage><DevCoordinatorDashboard /></SuspensePage>,
          },
          {
            path: 'tickets',
            element: <SuspensePage><ManagerTickets /></SuspensePage>,
          },
          {
            path: 'tickets/:ticketId',
            element: <SuspensePage><TicketDetail /></SuspensePage>,
          },
          {
            path: 'objects',
            element: <SuspensePage><DocumentationObjectsPage /></SuspensePage>,
          },
          {
            path: 'wricef',
            element: <SuspensePage><WricefObjectsPage /></SuspensePage>,
          },
          {
            path: 'ticket-groups',
            element: <Navigate to="/dev-coordinator/wricef" replace />,
          },
          {
            path: 'ai-dispatch',
            element: <SuspensePage><AIDispatchPage /></SuspensePage>,
          },
          {
            path: 'workload',
            element: <SuspensePage><WorkloadPage /></SuspensePage>,
          },
          {
            path: 'imputations',
            element: <SuspensePage><DevCoordImputations /></SuspensePage>,
          },
        ],
      },

      // Shared routes
      {
        path: 'profile',
        element: <SuspensePage><ProfilePage /></SuspensePage>,
      },
      {
        path: 'settings',
        element: <SuspensePage><SettingsPage /></SuspensePage>,
      },
      {
        path: 'shared/documentation/:id',
        element: <SuspensePage><DocumentationDetails /></SuspensePage>,
      },
      {
        path: '*',
        element: (
          <div className="p-6">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="mt-2 text-muted-foreground">
              The page you requested does not exist.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </div>
    ),
  },
]);
