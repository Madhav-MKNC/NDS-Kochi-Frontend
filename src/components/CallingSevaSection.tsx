"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CircleX } from 'lucide-react';
import { toast } from 'sonner';

interface CallingSevaRead {
  id: string;
  date: string;
  address: string;
  mobile_no: string;
  status: 'interested' | 'not interested';
  assigned_bhagat_name: 'santoshi das' | 'chhaya das';
  remarks?: string;
}

interface CallingSevaCreate {
  date: string;
  address: string;
  mobile_no: string;
  status: 'interested' | 'not interested';
  assigned_bhagat_name: 'santoshi das' | 'chhaya das';
  remarks?: string;
}

type FilterStatus = 'all' | 'interested' | 'not interested';

export default function CallingSevaSection() {
  const [entries, setEntries] = useState<CallingSevaRead[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<CallingSevaRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CallingSevaRead | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<CallingSevaCreate>({
    date: new Date().toISOString().slice(0, 16),
    address: '',
    mobile_no: '',
    status: 'interested',
    assigned_bhagat_name: 'santoshi das',
    remarks: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CallingSevaCreate, string>>>({});

  // Delete states
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/calling-seva', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch calling seva entries');
      }
      
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter entries based on search and status
  useEffect(() => {
    let filtered = entries;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.address.toLowerCase().includes(query) ||
        entry.mobile_no.toLowerCase().includes(query) ||
        (entry.remarks && entry.remarks.toLowerCase().includes(query))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }
    
    setFilteredEntries(filtered);
  }, [entries, searchQuery, statusFilter]);

  // Load entries on mount
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors: Partial<Record<keyof CallingSevaCreate, string>> = {};
    
    if (!formData.date.trim()) {
      errors.date = 'Date is required';
    }
    
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }
    
    if (!formData.mobile_no.trim()) {
      errors.mobile_no = 'Mobile number is required';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.mobile_no)) {
      errors.mobile_no = 'Please enter a valid mobile number';
    }
    
    if (!formData.status) {
      errors.status = 'Status is required';
    }
    
    if (!formData.assigned_bhagat_name) {
      errors.assigned_bhagat_name = 'Assigned Bhagat is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const url = editingEntry 
        ? `/api/calling-seva/${editingEntry.id}`
        : '/api/calling-seva';
      
      const method = editingEntry ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date).toISOString()
        })
      });
      
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save entry');
      }
      
      toast.success(editingEntry ? 'Entry updated successfully' : 'Entry created successfully');
      setIsModalOpen(false);
      resetForm();
      fetchEntries();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      
      const response = await fetch(`/api/calling-seva/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }
      
      toast.success('Entry deleted successfully');
      fetchEntries();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 16),
      address: '',
      mobile_no: '',
      status: 'interested',
      assigned_bhagat_name: 'santoshi das',
      remarks: ''
    });
    setFormErrors({});
    setEditingEntry(null);
  };

  // Open edit modal
  const handleEdit = (entry: CallingSevaRead) => {
    setEditingEntry(entry);
    setFormData({
      date: new Date(entry.date).toISOString().slice(0, 16),
      address: entry.address,
      mobile_no: entry.mobile_no,
      status: entry.status,
      assigned_bhagat_name: entry.assigned_bhagat_name,
      remarks: entry.remarks || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open add modal
  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isFormValid = Object.keys(formErrors).length === 0 && 
    formData.date && formData.address && formData.mobile_no && 
    formData.status && formData.assigned_bhagat_name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Calling Seva</h1>
          <p className="text-muted-foreground">Manage calling seva assignments and track status</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Add New Entry
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px] bg-card">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">
                {editingEntry ? 'Edit Entry' : 'Add New Entry'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <CircleX className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-card-foreground">
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={formErrors.date ? 'border-destructive' : ''}
                    aria-describedby={formErrors.date ? 'date-error' : undefined}
                  />
                  {formErrors.date && (
                    <p id="date-error" className="text-xs text-destructive">
                      {formErrors.date}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-card-foreground">
                    Status *
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'interested' | 'not interested') => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className={formErrors.status ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.status && (
                    <p className="text-xs text-destructive">{formErrors.status}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-card-foreground">
                  Address *
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter full address"
                  className={formErrors.address ? 'border-destructive' : ''}
                  aria-describedby={formErrors.address ? 'address-error' : undefined}
                />
                {formErrors.address && (
                  <p id="address-error" className="text-xs text-destructive">
                    {formErrors.address}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-card-foreground">
                    Mobile Number *
                  </Label>
                  <Input
                    id="mobile"
                    value={formData.mobile_no}
                    onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                    placeholder="+91 12345 67890"
                    className={formErrors.mobile_no ? 'border-destructive' : ''}
                    aria-describedby={formErrors.mobile_no ? 'mobile-error' : undefined}
                  />
                  {formErrors.mobile_no && (
                    <p id="mobile-error" className="text-xs text-destructive">
                      {formErrors.mobile_no}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bhagat" className="text-card-foreground">
                    Assigned Bhagat *
                  </Label>
                  <Select
                    value={formData.assigned_bhagat_name}
                    onValueChange={(value: 'santoshi das' | 'chhaya das') => 
                      setFormData({ ...formData, assigned_bhagat_name: value })
                    }
                  >
                    <SelectTrigger className={formErrors.assigned_bhagat_name ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="santoshi das">Santoshi Das</SelectItem>
                      <SelectItem value="chhaya das">Chhaya Das</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.assigned_bhagat_name && (
                    <p className="text-xs text-destructive">{formErrors.assigned_bhagat_name}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-card-foreground">
                  Remarks
                </Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional notes or comments"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {submitting ? 'Saving...' : editingEntry ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by address, mobile number, or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="not interested">Not Interested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {error && !loading && (
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 text-destructive">
                <CircleX className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Mobile No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Bhagat</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? 'No entries match your search criteria' 
                        : 'No calling seva entries found'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>{entry.address}</TableCell>
                      <TableCell>{entry.mobile_no}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          entry.status === 'interested' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.status === 'interested' ? 'Interested' : 'Not Interested'}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">{entry.assigned_bhagat_name}</TableCell>
                      <TableCell className="max-w-32 truncate" title={entry.remarks}>
                        {entry.remarks || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            disabled={deletingId === entry.id}
                          >
                            Edit
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deletingId === entry.id}
                                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                {deletingId === entry.id ? '...' : 'Delete'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this calling seva entry? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(entry.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}