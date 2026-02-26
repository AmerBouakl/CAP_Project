import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { useAuth } from '../../context/AuthContext';
import { DeliverablesAPI, NotificationsAPI, ProjectsAPI } from '../../services/odataClient';
import { Deliverable, Project, ValidationStatus } from '../../types/entities';

interface UploadForm {
  projectId: string;
  type: string;
  name: string;
  fileRef: string;
}

const EMPTY_UPLOAD_FORM: UploadForm = {
  projectId: '',
  type: 'Functional Specification',
  name: '',
  fileRef: '',
};

const getStatusBadge = (status: ValidationStatus) => {
  switch (status) {
    case 'APPROVED':
      return {
        tone: 'bg-primary/12 text-primary',
        icon: CheckCircle,
      };
    case 'CHANGES_REQUESTED':
      return {
        tone: 'bg-destructive/12 text-destructive',
        icon: XCircle,
      };
    case 'PENDING':
      return {
        tone: 'bg-muted text-muted-foreground',
        icon: Clock,
      };
  }
};

export const Deliverables: React.FC = () => {
  const { currentUser } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [comment, setComment] = useState('');
  const [uploadForm, setUploadForm] = useState<UploadForm>(EMPTY_UPLOAD_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  useEffect(() => {
    void loadDeliverables();
  }, []);

  const loadDeliverables = async () => {
    setLoading(true);
    try {
      const [data, projectData] = await Promise.all([
        DeliverablesAPI.getAll(),
        ProjectsAPI.getAll(),
      ]);
      setDeliverables(data);
      setProjects(projectData);
    } finally {
      setLoading(false);
    }
  };

  const closeReviewDialog = () => {
    setSelectedDeliverable(null);
    setComment('');
  };

  const updateValidationStatus = async (
    id: string,
    status: ValidationStatus,
    functionalComment?: string
  ) => {
    try {
      setIsReviewSubmitting(true);
      const updated = await DeliverablesAPI.update(id, {
        validationStatus: status,
        functionalComment,
      });
      setDeliverables((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));

      const project = projects.find((entry) => entry.id === updated.projectId);
      if (project) {
        await NotificationsAPI.create({
          userId: project.managerId,
          type: 'DELIVERABLE_REVIEWED',
          title: 'Deliverable Reviewed',
          message: `"${updated.name}" moved to ${status}.`,
          read: false,
        });
      }

      toast.success('Deliverable status updated');
      closeReviewDialog();
    } catch (error) {
      toast.error('Failed to update deliverable');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const createSpecification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;
    if (!uploadForm.projectId || !uploadForm.name.trim() || !uploadForm.type.trim()) {
      toast.error('Project, name and type are required');
      return;
    }

    try {
      setIsUploading(true);
      const created = await DeliverablesAPI.create({
        projectId: uploadForm.projectId,
        type: uploadForm.type.trim(),
        name: uploadForm.name.trim(),
        fileRef: uploadForm.fileRef.trim() || undefined,
        validationStatus: 'PENDING',
        functionalComment: '',
      });
      setDeliverables((prev) => [created, ...prev]);

      const project = projects.find((entry) => entry.id === uploadForm.projectId);
      if (project) {
        await NotificationsAPI.create({
          userId: project.managerId,
          type: 'DELIVERABLE_SUBMITTED',
          title: 'New Functional Specification',
          message: `${currentUser.name} submitted "${created.name}" for review.`,
          read: false,
        });
      }

      setUploadForm(EMPTY_UPLOAD_FORM);
      toast.success('Specification submitted for validation');
    } catch (error) {
      toast.error('Failed to submit specification');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Deliverables Validation"
        subtitle="Deposit functional specifications and validate project deliverables"
        breadcrumbs={[
          { label: 'Home', path: '/consultant-func/dashboard' },
          { label: 'Deliverables' },
        ]}
      />

      <div className="space-y-6 p-6 lg:p-8">
        <Card className="bg-card/92">
          <CardHeader>
            <CardTitle className="text-lg">Deposit Functional Specification (Mock)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSpecification} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deliverable-project">Project</Label>
                <Select
                  value={uploadForm.projectId}
                  onValueChange={(value) => setUploadForm((prev) => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger id="deliverable-project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliverable-type">Type</Label>
                <Input
                  id="deliverable-type"
                  value={uploadForm.type}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, type: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliverable-name">Document Name</Label>
                <Input
                  id="deliverable-name"
                  value={uploadForm.name}
                  onChange={(event) => setUploadForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Functional scope definition v1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliverable-file-ref">File Reference (optional)</Label>
                <Input
                  id="deliverable-file-ref"
                  value={uploadForm.fileRef}
                  onChange={(event) =>
                    setUploadForm((prev) => ({ ...prev, fileRef: event.target.value }))
                  }
                  placeholder="SharePoint/Teams link or file code"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? 'Submitting...' : 'Submit for Validation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="bg-card/92">
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading deliverables...
            </CardContent>
          </Card>
        ) : deliverables.length === 0 ? (
          <Card className="bg-card/92">
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">No deliverables</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No deliverables to review at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {deliverables.map((deliverable) => {
              const badge = getStatusBadge(deliverable.validationStatus);
              const StatusIcon = badge.icon;
              const projectName =
                projects.find((project) => project.id === deliverable.projectId)?.name ??
                deliverable.projectId;

              return (
                <Card key={deliverable.id} className="bg-card/92">
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/12 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <Badge className={badge.tone}>
                        <StatusIcon className="mr-1 h-3.5 w-3.5" />
                        {deliverable.validationStatus}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground">{deliverable.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{deliverable.type}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Project: {projectName}</p>
                    </div>

                    {deliverable.functionalComment && (
                      <div className="rounded-md border border-border/70 bg-surface-2 p-3 text-sm text-muted-foreground">
                        {deliverable.functionalComment}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(deliverable.createdAt).toLocaleDateString()}
                    </p>

                    {deliverable.validationStatus === 'PENDING' && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          setSelectedDeliverable(deliverable);
                          setComment(deliverable.functionalComment || '');
                        }}
                      >
                        Review
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={selectedDeliverable !== null} onOpenChange={(open) => !open && closeReviewDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Deliverable</DialogTitle>
            <DialogDescription>
              Validate the deliverable and provide actionable feedback.
            </DialogDescription>
          </DialogHeader>

          {selectedDeliverable && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="review-deliverable-name">Name</Label>
                <Input id="review-deliverable-name" value={selectedDeliverable.name} disabled />
              </div>

              <div>
                <Label htmlFor="review-deliverable-type">Type</Label>
                <Input id="review-deliverable-type" value={selectedDeliverable.type} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="review-comment">Functional Comments</Label>
                <Textarea
                  id="review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  placeholder="Add your comments or feedback..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeReviewDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedDeliverable || isReviewSubmitting}
              onClick={() =>
                selectedDeliverable &&
                void updateValidationStatus(selectedDeliverable.id, 'APPROVED', comment)
              }
            >
              <CheckCircle className="h-4 w-4" />
              {isReviewSubmitting ? 'Saving...' : 'Approve'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!selectedDeliverable || isReviewSubmitting}
              onClick={() =>
                selectedDeliverable &&
                void updateValidationStatus(selectedDeliverable.id, 'CHANGES_REQUESTED', comment)
              }
            >
              <XCircle className="h-4 w-4" />
              {isReviewSubmitting ? 'Saving...' : 'Request Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
