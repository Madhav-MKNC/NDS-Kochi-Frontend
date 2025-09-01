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
import { BookOpen, BookText, ChevronUp, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  bookSevaApi,
  authApi,
  type BookSevaRead,
  type BookSevaCreate,
  type BookSevaUpdate,
  type BookName,
  type BookType,
  type User,
  BOOK_NAMES,
  ApiServiceError,
  apiUtils
} from "@/lib/api";

export default function BookSevaSection() {
  const [bookSevas, setBookSevas] = useState<BookSevaRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookTypeFilter, setBookTypeFilter] = useState<"all" | BookType>("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BookSevaRead | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState<BookSevaCreate>({
    date: new Date().toISOString().slice(0, 16),
    seva_place: "",
    sevadar_name: "",
    book_name: "" as BookName,
    book_type: "free",
    quantity: 1,
    coordinator_name: "",
    driver_name: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  // Delete states
  const [deletingItem, setDeletingItem] = useState<BookSevaRead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      if (error instanceof ApiServiceError && error.status === 401) {
        // User is not authenticated, this will be handled by the auth interceptor
        return;
      }
    }
  }, []);

  const fetchBookSevas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await bookSevaApi.getAll();
      setBookSevas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch book sevas:", error);
      if (error instanceof ApiServiceError) {
        if (error.status !== 401) { // Don't show error for auth issues
          toast.error("Failed to load book sevas: " + error.message);
        }
      } else {
        toast.error("Failed to load book sevas");
      }
      setBookSevas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiUtils.isAuthenticated()) {
      // fetchCurrentUser();
      fetchBookSevas();
    }
  }, [
    // fetchCurrentUser,
    fetchBookSevas
  ]);

  const filteredBookSevas = useMemo(() => {
    return bookSevas.filter((item) => {
      const matchesSearch = searchQuery === "" ||
        item.sevadar_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.book_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seva_place.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = bookTypeFilter === "all" || item.book_type === bookTypeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [bookSevas, searchQuery, bookTypeFilter]);

  const validateForm = useCallback((data: BookSevaCreate): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.date) errors.date = "Date is required";
    if (!data.seva_place.trim()) errors.seva_place = "Seva place is required";
    if (!data.sevadar_name.trim()) errors.sevadar_name = "Sevadar name is required";
    if (!data.book_name) errors.book_name = "Book name is required";
    if (!data.book_type) errors.book_type = "Book type is required";
    if (!data.quantity || data.quantity < 1) errors.quantity = "Quantity must be at least 1";
    if (!data.coordinator_name.trim()) errors.coordinator_name = "Coordinator name is required";
    if (!data.driver_name.trim()) errors.driver_name = "Driver name is required";

    return errors;
  }, []);

  const openModal = useCallback((item?: BookSevaRead) => {
    setEditingItem(item || null);

    if (item) {
      // Convert ISO string to datetime-local format
      const dateValue = item.date ? new Date(item.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);

      setFormData({
        date: dateValue,
        seva_place: item.seva_place,
        sevadar_name: item.sevadar_name,
        book_name: item.book_name,
        book_type: item.book_type,
        quantity: item.quantity,
        coordinator_name: item.coordinator_name,
        driver_name: item.driver_name,
      });
    } else {
      setFormData({
        date: new Date().toISOString().slice(0, 16),
        seva_place: "",
        sevadar_name: "",
        book_name: "" as BookName,
        book_type: "free",
        quantity: 1,
        coordinator_name: currentUser?.name || "",
        driver_name: "",
      });
    }

    setFormErrors({});
    setServerError("");
    setIsModalOpen(true);
  }, [currentUser]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      date: new Date().toISOString().slice(0, 16),
      seva_place: "",
      sevadar_name: "",
      book_name: "" as BookName,
      book_type: "free",
      quantity: 1,
      coordinator_name: currentUser?.name || "",
      driver_name: "",
    });
    setFormErrors({});
    setServerError("");
  }, [currentUser]);

  const handleFormChange = useCallback((field: keyof BookSevaCreate, value: string | number) => {
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
      const payload: BookSevaCreate = {
        ...formData,
        date: new Date(formData.date).toISOString(),
      };

      if (editingItem) {
        const updatePayload: BookSevaUpdate = payload;
        await bookSevaApi.update(editingItem.id, updatePayload);
        toast.success("Book seva updated successfully");
      } else {
        await bookSevaApi.create(payload);
        toast.success("Book seva created successfully");
      }

      closeModal();
      fetchBookSevas();
    } catch (error) {
      if (error instanceof ApiServiceError) {
        setServerError(apiUtils.formatError(error));
      } else {
        setServerError("An unexpected error occurred");
      }
    } finally {
      setModalLoading(false);
    }
  }, [formData, editingItem, validateForm, closeModal, fetchBookSevas]);

  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;

    setDeleteLoading(true);
    try {
      await bookSevaApi.delete(deletingItem.id);
      setDeletingItem(null);
      fetchBookSevas();
    } catch (error) {
      if (error instanceof ApiServiceError) {
        toast.error("Failed to delete book seva: " + error.message);
      } else {
        toast.error("Failed to delete book seva");
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingItem, fetchBookSevas]);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);
  // const formatDate = (dateString: string) => {
  // const date = new Date(dateString);
  // return date.toLocaleDateString('en-IN'); // Indian format DD/MM/YYYY
  // };
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Book Seva</h1>
          <p className="text-muted-foreground">Manage book distribution records</p>
        </div>
        <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
          <BookOpen className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by sevadar, book name, or seva place"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card"
          />
        </div>
        <Select value={bookTypeFilter} onValueChange={(value: "all" | BookType) => setBookTypeFilter(value)}>
          <SelectTrigger className="w-32 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredBookSevas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="mb-2">No book sevas found</CardTitle>
            <CardDescription className="mb-4">
              {bookSevas.length === 0 ? "Get started by adding your first book seva record." : "No records match your search criteria."}
            </CardDescription>
            {bookSevas.length === 0 && (
              <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
                <BookOpen className="h-4 w-4 mr-2" />
                Add First Book Seva
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
                    <TableHead className="font-medium text-muted-foreground">Place</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Sevadar</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Book Name</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Qty</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Coordinator</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Driver</TableHead>
                    <TableHead className="font-medium text-muted-foreground w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookSevas.map((item) => (
                    <TableRow key={item.id} className="border-b border-border hover:bg-muted/20">
                      <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                      <TableCell>{item.seva_place}</TableCell>
                      <TableCell>{item.sevadar_name}</TableCell>
                      <TableCell className="capitalize">{item.book_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${item.book_type === "free"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                          {item.book_type}
                        </span>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.coordinator_name}</TableCell>
                      <TableCell>{item.driver_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal(item)}
                            aria-label={`Edit ${item.sevadar_name} record`}
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
                                aria-label={`Delete ${item.sevadar_name} record`}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Book Seva Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the book seva record for <strong>{item.sevadar_name}</strong> at <strong>{item.seva_place}</strong>? This action cannot be undone.
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
            <DialogTitle>{editingItem ? "Edit Book Seva" : "Add New Book Seva"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the book seva record details." : "Fill in the details for the new book seva record."}
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
                  type="date"
                  value={formData.date} // keep as YYYY-MM-DD
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  className={formErrors.date ? "border-destructive" : ""}
                />
                {formData.date && (
                  <p className="text-sm text-muted-foreground">
                    Selected Date: {formatDate(formData.date)}
                  </p>
                )}
                {formErrors.date && <p className="text-sm text-destructive">{formErrors.date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seva_place">Seva Place *</Label>
                <Input
                  id="seva_place"
                  value={formData.seva_place}
                  onChange={(e) => handleFormChange("seva_place", e.target.value)}
                  className={formErrors.seva_place ? "border-destructive" : ""}
                />
                {formErrors.seva_place && <p className="text-sm text-destructive">{formErrors.seva_place}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sevadar_name">Sevadar Name *</Label>
                <Input
                  id="sevadar_name"
                  value={formData.sevadar_name}
                  onChange={(e) => handleFormChange("sevadar_name", e.target.value)}
                  className={formErrors.sevadar_name ? "border-destructive" : ""}
                />
                {formErrors.sevadar_name && <p className="text-sm text-destructive">{formErrors.sevadar_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="book_name">Book Name *</Label>
                <Select value={formData.book_name} onValueChange={(value: BookName) => handleFormChange("book_name", value)}>
                  <SelectTrigger className={formErrors.book_name ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select book name" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOK_NAMES.map((bookName) => (
                      <SelectItem key={bookName} value={bookName}>
                        {bookName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.book_name && <p className="text-sm text-destructive">{formErrors.book_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="book_type">Book Type *</Label>
                <Select value={formData.book_type} onValueChange={(value: BookType) => handleFormChange("book_type", value)}>
                  <SelectTrigger className={formErrors.book_type ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.book_type && <p className="text-sm text-destructive">{formErrors.book_type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleFormChange("quantity", parseInt(e.target.value) || 1)}
                  className={formErrors.quantity ? "border-destructive" : ""}
                />
                {formErrors.quantity && <p className="text-sm text-destructive">{formErrors.quantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="coordinator_name">Coordinator Name *</Label>
                <Input
                  id="coordinator_name"
                  value={formData.coordinator_name}
                  onChange={(e) => handleFormChange("coordinator_name", e.target.value)}
                  className={formErrors.coordinator_name ? "border-destructive" : ""}
                />
                {formErrors.coordinator_name && <p className="text-sm text-destructive">{formErrors.coordinator_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_name">Driver Name *</Label>
                <Input
                  id="driver_name"
                  value={formData.driver_name}
                  onChange={(e) => handleFormChange("driver_name", e.target.value)}
                  className={formErrors.driver_name ? "border-destructive" : ""}
                />
                {formErrors.driver_name && <p className="text-sm text-destructive">{formErrors.driver_name}</p>}
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