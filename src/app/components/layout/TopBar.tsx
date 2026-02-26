import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationsAPI } from '../../services/odataClient';
import { Notification } from '../../types/entities';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

interface TopBarProps {
  mobileOpen: boolean;
  sidebarCollapsed: boolean;
  onMenuToggle: () => void;
  onToggleCollapse: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mobileOpen,
  sidebarCollapsed,
  onMenuToggle,
  onToggleCollapse,
}) => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const displayName = currentUser?.name ?? 'Guest';

  const initials = useMemo(() => {
    if (!displayName.trim()) return 'G';
    const parts = displayName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return `${first}${second}`.toUpperCase();
  }, [displayName]);

  useEffect(() => {
    if (!currentUser) return;

    const load = async () => {
      try {
        const notificationData = await NotificationsAPI.getByUser(currentUser.id);
        setNotifications(notificationData.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      } catch (error) {
        toast.error('Failed to load notifications');
      }
    };

    void load();
  }, [currentUser]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await NotificationsAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface-1">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
          aria-expanded={mobileOpen}
          aria-controls="app-mobile-navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle navigation</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={onToggleCollapse}
          aria-pressed={sidebarCollapsed}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className="h-4 w-4" />
          <span className="sr-only">Toggle sidebar width</span>
        </Button>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            SAP Performance Management
          </p>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{displayName}</p>
        </div>

        <div className="relative ml-auto hidden w-full max-w-sm lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="topbar-search"
            aria-label="Search projects, users, and tickets"
            className="border-border/70 bg-surface-2 pl-9 focus-visible:ring-2"
            placeholder="Search projects, users, tickets..."
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={toggleTheme}
          aria-pressed={theme === 'dark'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Open notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px]">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">No notifications</p>
            ) : (
              notifications.slice(0, 8).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => void markNotificationAsRead(notification.id)}
                  className="flex cursor-pointer flex-col items-start gap-1"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="font-medium text-foreground">{notification.title}</span>
                    {!notification.read && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{notification.message}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-full px-2" aria-label="Open account menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-1">
              <p className="font-semibold text-foreground">{currentUser?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{currentUser?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/profile')}>
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                // Prevent Radix from closing the menu and interfering
                e.preventDefault();
                logout();
                // Navigate after state has cleared
                queueMicrotask(() => navigate('/login', { replace: true }));
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
