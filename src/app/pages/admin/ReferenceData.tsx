import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/common/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { ReferenceDataAPI } from '../../services/odataClient';
import { ReferenceData } from '../../types/entities';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

type ReferenceType = ReferenceData['type'] | 'ALL';

const EMPTY_FORM: Omit<ReferenceData, 'id'> = {
  type: 'TASK_STATUS',
  code: '',
  label: '',
  active: true,
  order: 1,
};

export const ReferenceDataManagement: React.FC = () => {
  const [items, setItems] = useState<ReferenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ReferenceType>('ALL');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Omit<ReferenceData, 'id'>>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemPendingDelete, setItemPendingDelete] = useState<ReferenceData | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ReferenceDataAPI.getAll();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
        const query = search.trim().toLowerCase();
        if (!query) return matchesType;
        return (
          matchesType &&
          (item.code.toLowerCase().includes(query) || item.label.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
        return a.label.localeCompare(b.label);
      });
  }, [items, search, typeFilter]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.code.trim() || !form.label.trim()) {
      toast.error('Code and label are required');
      return;
    }
    if ((form.order ?? 1) < 1) {
      toast.error('Order must be at least 1');
      return;
    }

    const normalizedCode = form.code.trim().toUpperCase();
    const duplicate = items.find(
      (item) =>
        item.type === form.type &&
        item.code.toUpperCase() === normalizedCode &&
        item.id !== editingId
    );
    if (duplicate) {
      toast.error('A reference item with this type and code already exists');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        const updated = await ReferenceDataAPI.update(editingId, {
          ...form,
          code: normalizedCode,
          label: form.label.trim(),
        });
        setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
        toast.success('Reference item updated');
      } else {
        const created = await ReferenceDataAPI.create({
          ...form,
          code: normalizedCode,
          label: form.label.trim(),
        });
        setItems((prev) => [created, ...prev]);
        toast.success('Reference item created');
      }
      resetForm();
    } catch (error) {
      toast.error('Failed to save reference item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (item: ReferenceData) => {
    setEditingId(item.id);
    setForm({
      type: item.type,
      code: item.code,
      label: item.label,
      active: item.active,
      order: item.order ?? 1,
    });
  };

  const toggleActive = async (item: ReferenceData) => {
    try {
      const updated = await ReferenceDataAPI.update(item.id, { active: !item.active });
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? updated : entry)));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const removeItem = async (id: string) => {
    try {
      await ReferenceDataAPI.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success('Reference item deleted');
      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      toast.error('Failed to delete reference item');
    } finally {
      setItemPendingDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Reference Data Management"
        subtitle="Manage task statuses, priorities, project types and skills"
        breadcrumbs={[
          { label: 'Home', path: '/admin/dashboard' },
          { label: 'Reference Data' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-3 lg:p-8">
        <Card className="h-fit bg-card/92 xl:col-span-1">
          <CardContent className="pt-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {editingId ? 'Edit Reference Item' : 'Create Reference Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reference-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      type: val as ReferenceData['type'],
                    }))
                  }
                >
                  <SelectTrigger id="reference-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TASK_STATUS">Task Status</SelectItem>
                    <SelectItem value="PRIORITY">Priority</SelectItem>
                    <SelectItem value="PROJECT_TYPE">Project Type</SelectItem>
                    <SelectItem value="SKILL">Skill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference-code">Code</Label>
                <Input
                  id="reference-code"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  placeholder="EX: IN_PROGRESS"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference-label">Label</Label>
                <Input
                  id="reference-label"
                  value={form.label}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                  placeholder="Ex: In Progress"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference-order">Order</Label>
                <Input
                  id="reference-order"
                  type="number"
                  min={1}
                  value={form.order ?? 1}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, order: Number(event.target.value || 1) }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border/70 bg-surface-2 p-3">
                <Label htmlFor="reference-active">Active</Label>
                <Switch
                  id="reference-active"
                  checked={form.active}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, active: Boolean(checked) }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-card/92 xl:col-span-2">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row">
              <div className="space-y-1 md:flex-1">
                <Label htmlFor="reference-search" className="sr-only">
                  Search reference data
                </Label>
                <Input
                  id="reference-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code or label..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reference-type-filter" className="sr-only">
                  Filter by type
                </Label>
                <Select
                  value={typeFilter}
                  onValueChange={(val) => setTypeFilter(val as ReferenceType)}
                >
                  <SelectTrigger id="reference-type-filter" className="w-full md:w-[220px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="TASK_STATUS">Task Status</SelectItem>
                    <SelectItem value="PRIORITY">Priority</SelectItem>
                    <SelectItem value="PROJECT_TYPE">Project Type</SelectItem>
                    <SelectItem value="SKILL">Skill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader className="bg-muted/65">
                <TableRow>
                  <TableHead className="px-4">Type</TableHead>
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Label</TableHead>
                  <TableHead className="px-4">Order</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading reference data...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No reference entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-accent/40">
                      <TableCell className="px-4 py-3 text-sm">{item.type}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-mono">{item.code}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{item.label}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{item.order ?? '-'}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`reference-active-${item.id}`}
                            checked={item.active}
                            aria-label={`Toggle active status for ${item.label}`}
                            onCheckedChange={() => void toggleActive(item)}
                          />
                          <Badge variant="secondary">{item.active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(item)}
                            aria-label={`Edit ${item.label}`}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit {item.label}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setItemPendingDelete(item)}
                            aria-label={`Delete ${item.label}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={itemPendingDelete !== null} onOpenChange={(open) => !open && setItemPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reference item</AlertDialogTitle>
            <AlertDialogDescription>
              {itemPendingDelete
                ? `Delete "${itemPendingDelete.label}" (${itemPendingDelete.code}) from reference data?`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => itemPendingDelete && void removeItem(itemPendingDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
