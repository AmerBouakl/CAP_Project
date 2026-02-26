import React, { useEffect, useState } from 'react';
import { UserRound, Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { UsersAPI } from '../../services/odataClient';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Certification } from '../../types/entities';

export const ProfilePage: React.FC = () => {
  const { currentUser, switchUser } = useAuth();

  const [name, setName] = useState('');
  const [skills, setSkills] = useState('');
  const [certifications, setCertifications] = useState('');
  const [availabilityPercent, setAvailabilityPercent] = useState(100);
  const [saving, setSaving] = useState(false);
  const initials = currentUser?.name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name);
    setSkills(currentUser.skills.join(', '));
    setCertifications(currentUser.certifications.map((cert) => cert.name).join(', '));
    setAvailabilityPercent(currentUser.availabilityPercent);
  }, [currentUser]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    try {
      setSaving(true);
      await UsersAPI.update(currentUser.id, {
        name: name.trim(),
        skills: skills
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        certifications: certifications
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
          .map(
            (certName, index): Certification => ({
              id: `cert_${Date.now()}_${index}`,
              name: certName,
              issuingBody: 'N/A',
              dateObtained: new Date().toISOString().slice(0, 10),
              status: 'VALID',
            })
          ),
        availabilityPercent,
      });
      await switchUser(currentUser.id);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <PageHeader
        title="My Profile"
        subtitle="Manage personal details, skill stack, and availability"
        breadcrumbs={[{ label: 'My Profile' }]}
      />

      <div className="mx-auto grid max-w-4xl gap-6 p-6 lg:p-8">
        <Card className="bg-card/92">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-border/70">
                  <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                    {initials || <UserRound className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{currentUser.name}</CardTitle>
                  <CardDescription>{currentUser.email}</CardDescription>
                </div>
              </div>
              <Badge>{currentUser.role.replace(/_/g, ' ')}</Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-card/92">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-xl">
              <Sparkles className="h-4 w-4 text-primary" />
              Edit Profile
            </CardTitle>
            <CardDescription>Changes are stored in mock data for this frontend environment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveProfile}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" value={currentUser.email} disabled />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-skills">Skills (comma-separated)</Label>
                <Textarea
                  id="profile-skills"
                  rows={3}
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  placeholder="SAP CAP, Fiori, ABAP"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-certifications">Certifications (comma-separated)</Label>
                <Textarea
                  id="profile-certifications"
                  rows={3}
                  value={certifications}
                  onChange={(event) => setCertifications(event.target.value)}
                  placeholder="SAP Developer, AWS Architect"
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 bg-surface-2 p-4">
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor="profile-availability" className="text-muted-foreground">
                    Availability
                  </Label>
                  <span className="font-semibold text-foreground">{availabilityPercent}%</span>
                </div>
                <input
                  id="profile-availability"
                  type="range"
                  min={0}
                  max={100}
                  value={availabilityPercent}
                  onChange={(event) => setAvailabilityPercent(Number(event.target.value || 0))}
                  className="h-2 w-full cursor-pointer accent-primary"
                />
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
