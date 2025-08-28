"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Phone, PhoneCall, Edit, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  callingSevaApi,
  authApi,
  type CallingSevaRead,
  type CallingSevaCreate,
  type CallingSevaUpdate,
  type CallingSevaStatus,
  type BhagatName,
  type User,
  BHAGAT_NAMES,
  ApiServiceError,
  apiUtils
} from "@/lib/api";

export default function CallingSevaSection() {
  const [callingSevas, setCallingSevas] = useState<CallingSevaRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CallingSevaStatus>("all");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CallingSevaRead | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<CallingSevaCreate>({
    date: new Date().toISOString().slice(0, 16),
    address: "",
    mobile_no: "",
    status: "interested",
    assigned_bhagat_name: "santoshi das",
    remarks: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  // Delete states
  const [deletingItem, setDeletingItem] = useState<CallingSevaRead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      if (error instanceof ApiServiceError && error.status === 401) {
        return;
      }
    }
  }, []);

  const fetchCallingSevas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callingSevaApi.getAll();
      setCallingSevas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch calling sevas:", error);
      if (error instanceof ApiServiceError) {
        if (error.status !== 401) {
          toast.error("Failed to load calling sevas: " + error.message);
        }
      } else {
        toast.error("Failed to load calling sevas");
      }
      setCallingSevas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiUtils.isAuthenticated()) {
      fetchCurrentUser();
      fetchCallingSevas();
    }
  }, [fetchCurrentUser, fetchCallingSevas]);

  const filteredCallingSevas = useMemo(() => {
    return callingSevas.filter((item) => {
      const matchesSearch = searchQuery === "" || 
        item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mobile_no.includes(searchQuery) ||
        item.assigned_bhagat_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.remarks && item.remarks.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = statusFilter === "all" || item.status === statusFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [callingSevas, searchQuery, statusFilter]);

  const validateForm = useCallback((data: CallingSevaCreate): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!data.date) errors.date = "Date is required";
    if (!data.address.trim()) errors.address = "Address is required";
    if (!data.mobile_no.trim()) {
      errors.mobile_no = "Mobile number is required";
    } else if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(data.mobile_no)) {
      errors.mobile_no = "Please enter a valid mobile number";
    }
    if (!data.status) errors.status = "Status is required";
    if (!data.assigned_bhagat_name) errors.assigned_bhagat_name = "Assigned bhagat is required";
    
    return errors;
  }, []);

  const openModal = useCallback((item?: CallingSevaRead) => {
    setEditingItem(item || null);
    
    if (item) {
      const dateValue = item.date ? new Date(item.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
      
      setFormData({
        date: dateValue,
        address: item.address,
        mobile_no: item.mobile_no,
        status: item.status,
        assigned_bhagat_name: item.assigned_bhagat_name,
        remarks: item.remarks || "",
      });
    } else {
      setFormData({
        date: new Date().toISOString().slice(0, 16),
        address: "",
        mobile_no: "",
        status: "interested",
        assigned_bhagat_name: "santoshi das",
        remarks: "",
      });
    }
    
    setFormErrors({});
    setServerError("");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      date: new Date().toISOString().slice(0, 16),
      address: "",
      mobile_no: "",
      status: "interested",
      assigned_bhagat_name: "santoshi das",
      remarks: "",
    });
    setFormErrors({});
    setServerError("");
  }, []);

  const handleFormChange = useCallback((field: keyof CallingSevaCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    }
  }, [formErrors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setModalLoading(true);
    setServerError("");

    try {
      const payload: CallingSevaCreate = {
        ...formData,
        date: new Date(formData.date).toISOString(),
      };

      if (editingItem) {
        const updatePayload: CallingSevaUpdate = payload;
        await callingSevaApi.update(editingItem.id, updatePayload);
        toast.success("Calling seva updated successfully");
      } else {
        await callingSevaApi.create(payload);
        toast.success("Calling seva created successfully");
      }

      closeModal();
      fetchCallingSevas();
    } catch (error) {
      if (error instanceof ApiServiceError) {
        setServerError(apiUtils.formatError(error));
      } else {
        setServerError("An unexpected error occurred");
      }
    } finally {
      setModalLoading(false);
    }
  }, [formData, editingItem, validateForm, closeModal, fetchCallingSevas]);

  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;

    setDeleteLoading(true);
    try {
      await callingSevaApi.delete(deletingItem.id);
      setDeletingItem(null);
      fetchCallingSevas();
    } catch (error) {
      if (error instanceof ApiServiceError) {
        toast.error("Failed to delete calling seva: " + error.message);
      } else {
        toast.error("Failed to delete calling seva");
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingItem, fetchCallingSevas]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const formatMobileNumber = useCallback((mobile: string) => {
    // Format mobile number for display
    if (mobile.length === 10) {
      return `${mobile.slice(0, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6)}`;
    }
    return mobile;
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Calling Seva</h1>
          <p className="text-muted-foreground">Manage calling seva records and follow-ups</p>
        </div>
        <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
          <Phone className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by address, mobile, bhagat, or remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: "all" | CallingSevaStatus) => setStatusFilter(value)}>
          <SelectTrigger className="w-40 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="not interested">Not Interested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredCallingSevas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="mb-2">No calling sevas found</CardTitle>
            <CardDescription className="mb-4">
              {callingSevas.length === 0 ? "Get started by adding your first calling seva record." : "No records match your search criteria."}
            </CardDescription>
            {callingSevas.length === 0 && (
              <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
                <Phone className="h-4 w-4 mr-2" />
                Add First Calling Seva
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/30">
                    <TableHead className="font-medium text-muted-foreground">Date</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Address</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Mobile No</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Assigned Bhagat</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Remarks</TableHead>
                    <TableHead className="font-medium text-muted-foreground w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCallingSevas.map((item) => (
                    <TableRow key={item.id} className="border-b border-border hover:bg-muted/20">
                      <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.address}</TableCell>
                      <TableCell className="font-mono">{formatMobileNumber(item.mobile_no)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                          item.status === "interested"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">{item.assigned_bhagat_name}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.remarks || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal(item)}
                            aria-label={`Edit calling seva record`}
                            className="h-8 w-8 p-0 hover:bg-muted"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingItem(item)}
                                aria-label={`Delete calling seva record`}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Calling Seva Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the calling seva record for <strong>{item.mobile_no}</strong>? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  disabled={deleteLoading}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {deleteLoading ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Calling Seva" : "Add New Calling Seva"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the calling seva record details." : "Fill in the details for the new calling seva record."}
            </DialogDescription>
          </DialogHeader>
          
          {serverError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  className={formErrors.date ? "border-destructive" : ""}
                />
                {formErrors.date && <p className="text-sm text-destructive">{formErrors.date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_no">Mobile Number *</Label>
                <Input
                  id="mobile_no"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.mobile_no}
                  onChange={(e) => handleFormChange("mobile_no", e.target.value)}
                  className={formErrors.mobile_no ? "border-destructive" : ""}
                />
                {formErrors.mobile_no && <p className="text-sm text-destructive">{formErrors.mobile_no}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter the complete address"
                  value={formData.address}
                  onChange={(e) => handleFormChange("address", e.target.value)}
                  className={formErrors.address ? "border-destructive" : ""}
                  rows={3}
                />
                {formErrors.address && <p className="text-sm text-destructive">{formErrors.address}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value: CallingSevaStatus) => handleFormChange("status", value)}>
                  <SelectTrigger className={formErrors.status ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="not interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.status && <p className="text-sm text-destructive">{formErrors.status}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_bhagat_name">Assigned Bhagat *</Label>
                <Select value={formData.assigned_bhagat_name} onValueChange={(value: BhagatName) => handleFormChange("assigned_bhagat_name", value)}>
                  <SelectTrigger className={formErrors.assigned_bhagat_name ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BHAGAT_NAMES.map((bhagatName) => (
                      <SelectItem key={bhagatName} value={bhagatName} className="capitalize">
                        {bhagatName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.assigned_bhagat_name && <p className="text-sm text-destructive">{formErrors.assigned_bhagat_name}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  placeholder="Any additional notes or comments..."
                  value={formData.remarks}
                  onChange={(e) => handleFormChange("remarks", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeModal} disabled={modalLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={modalLoading} className="bg-primary hover:bg-primary/90">
                {modalLoading ? "Saving..." : editingItem ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}