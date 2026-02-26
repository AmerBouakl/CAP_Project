import React, { useEffect, useState } from 'react';
import { Save, Bell, Globe, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';

interface LocalSettings {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  weeklyDigest: boolean;
  locale: string;
}

const STORAGE_KEY = 'mockAppSettings';

const DEFAULT_SETTINGS: LocalSettings = {
  emailNotifications: true,
  desktopNotifications: true,
  weeklyDigest: true,
  locale: 'en-US',
};

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as LocalSettings;
      setSettings(parsed);
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const save = () => {
    toast.success('Settings saved', {
      description: 'Preferences are already applied and stored locally.',
    });
  };

  return (
    <div className="min-h-screen bg-transparent">
      <PageHeader
        title="Settings"
        subtitle="Personalize your workspace behavior and interface preferences"
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <div className="mx-auto grid max-w-4xl gap-6 p-6 lg:p-8">
        <Card className="bg-card/92">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <Palette className="h-4 w-4 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>Choose your visual environment.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-2 p-4">
            <div>
              <p id="settings-theme-label" className="font-semibold text-foreground">
                Theme
              </p>
              <p className="text-sm text-muted-foreground">
                Current mode: {theme === 'dark' ? 'Dark' : 'Light'}
              </p>
            </div>
            <Switch
              id="settings-theme-toggle"
              aria-labelledby="settings-theme-label"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </CardContent>
        </Card>

        <Card className="bg-card/92">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Control the way updates reach you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-2 p-4">
              <div>
                <p id="settings-email-label" className="font-semibold text-foreground">
                  Email notifications
                </p>
                <p className="text-sm text-muted-foreground">Receive direct project alerts by email.</p>
              </div>
              <Switch
                id="settings-email-toggle"
                aria-labelledby="settings-email-label"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, emailNotifications: Boolean(checked) }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-2 p-4">
              <div>
                <p id="settings-desktop-label" className="font-semibold text-foreground">
                  Desktop notifications
                </p>
                <p className="text-sm text-muted-foreground">Get real-time updates while active in the app.</p>
              </div>
              <Switch
                id="settings-desktop-toggle"
                aria-labelledby="settings-desktop-label"
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, desktopNotifications: Boolean(checked) }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-2 p-4">
              <div>
                <p id="settings-weekly-label" className="font-semibold text-foreground">
                  Weekly KPI digest
                </p>
                <p className="text-sm text-muted-foreground">Summary of performance indicators each week.</p>
              </div>
              <Switch
                id="settings-weekly-toggle"
                aria-labelledby="settings-weekly-label"
                checked={settings.weeklyDigest}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, weeklyDigest: Boolean(checked) }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/92">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <Globe className="h-4 w-4 text-primary" />
              Locale
            </CardTitle>
            <CardDescription>Select your preferred language format.</CardDescription>
          </CardHeader>
          <CardContent className="rounded-xl border border-border/70 bg-surface-2 p-4">
            <Label htmlFor="settings-locale" className="mb-1 block text-sm text-muted-foreground">
              Display language
            </Label>
            <Select
              value={settings.locale}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, locale: value }))}
            >
              <SelectTrigger id="settings-locale" className="w-full max-w-xs">
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="fr-FR">French (FR)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-border/70 bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
          Settings are stored locally for this mock frontend environment.
        </div>

        <div>
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
