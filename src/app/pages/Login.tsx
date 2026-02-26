import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, Briefcase, FileSearch, FolderKanban, GitBranch, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import inetumLogoDark from '@/assets/inetum-logo-dark.svg';
import inetumLogoLight from '@/assets/inetum-logo.svg';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;

  const handleLogin = async (userEmail: string, userPass: string) => {
    setLoading(true);

    try {
      await login(userEmail, userPass);
      toast.success('Welcome back', { description: 'Session started successfully.' });
      navigate(fromPath || '/dashboard', { replace: true });
    } catch (error) {
      toast.error('Authentication failed', {
        description: 'Please verify your credentials and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleLogin(email, password);
  };

  const quickRoles = [
    {
      email: 'jean.dupont@company.com',
      role: 'Administrator',
      icon: ShieldCheck,
    },
    {
      email: 'marie.martin@company.com',
      role: 'Manager',
      icon: Briefcase,
    },
    {
      email: 'pierre.dubois@company.com',
      role: 'Technical Consultant',
      icon: Wrench,
    },
    {
      email: 'sophie.bernard@company.com',
      role: 'Functional Consultant',
      icon: FileSearch,
    },
    {
      email: 'karim.benali@company.com',
      role: 'Project Manager',
      icon: FolderKanban,
    },
    {
      email: 'nadia.cherradi@company.com',
      role: 'Dev Coordinator',
      icon: GitBranch,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-40 top-[-120px] h-[420px] w-[420px] rounded-full bg-primary/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-[-80px] h-[360px] w-[360px] rounded-full bg-accent-foreground/35 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:gap-5">
          <Card className="hidden border-border/80 bg-surface-1 lg:flex lg:flex-col lg:justify-between">
            <CardHeader className="space-y-8">
              <div>
                <div>
                  <img src={inetumLogoDark} alt="Inetum" className="h-8 w-auto dark:hidden" />
                  <img src={inetumLogoLight} alt="Inetum" className="hidden h-8 w-auto dark:block" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  SAP Performance Management
                </p>
                <CardTitle className="text-4xl leading-tight">Performance Hub</CardTitle>
                <p className="max-w-sm text-sm text-muted-foreground">Sign in to continue.</p>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="rounded-xl border border-border/70 bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
                Secure role-based workspace.
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card className="border-border/80 bg-card">
              <CardHeader className="space-y-4">
                <div>
                  <img src={inetumLogoDark} alt="Inetum" className="h-8 w-auto dark:hidden" />
                  <img src={inetumLogoLight} alt="Inetum" className="hidden h-8 w-auto dark:block lg:hidden" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Account Access
                  </p>
                  <CardTitle className="text-2xl">Sign in</CardTitle>
                  <p className="text-sm text-muted-foreground">Use your work account.</p>
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@company.com"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Demo password: demo</p>
                  </div>

                  <Button className="w-full" size="lg" type="submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Enter Platform'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="pb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Demo access
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {quickRoles.map((role) => {
                  const RoleIcon = role.icon;

                  return (
                    <button
                      key={role.email}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        if (loading) return;
                        setEmail(role.email);
                        setPassword('demo');
                        toast.info(`Logging as ${role.role}`);
                        void handleLogin(role.email, 'demo');
                      }}
                      className="group w-full rounded-lg border border-border/80 bg-surface-2 p-3 text-left transition-colors hover:border-primary/55 hover:bg-accent/45 disabled:opacity-60"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/20 text-primary">
                          <RoleIcon className="h-4 w-4" />
                        </div>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {role.role}
                        </p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
