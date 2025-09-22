"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Search, Calendar, ChevronLeft, ChevronRight, Filter, Download } from "lucide-react";
import { bookSevaApi, type BookSevaRead, type BookSevaCreate, type BookSevaUpdate } from "@/lib/api";
import { exportToCSV } from "@/utils/exportToCSV";
import { formatRecords } from "@/utils/formatRecords";

import {
  BOOK_NAMES,
  BookName,
  COORDINATOR_NAME,
  DRIVER_NAME,
  fetchConstants
} from "@/lib/api";

export default function BookSevaSection() {
  // Data and loading states
  const [records, setRecords] = useState<BookSevaRead[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BookSevaRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Filter states
  const today = new Date().toISOString().split("T")[0];
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(oneMonthAgoStr);
  const [toDate, setToDate] = useState(today);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(100);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
const [editingRecord, setEditingRecord] = useState<BookSevaRead | null>(null);
const [formLoading, setFormLoading] = useState(false);
const [deletingRecord, setDeletingRecord] = useState<BookSevaRead | null>(null);
const [deleteLoading, setDeleteLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState<Partial<BookSevaCreate>>({
    date: "",
    seva_place: "",
    sevadar_name: "",
    book_name: BOOK_NAMES[0],
    book_type: "free",
    quantity: 1,
    coordinator_name: COORDINATOR_NAME,
    driver_name: DRIVER_NAME
  });

  // Fetch dynamic constants for coordinator and driver
  useEffect(() => {
    fetchConstants();
  }, []);

  const handleExport = () => {
    const { headers, rows } = formatRecords(filteredRecords);
    exportToCSV(headers, rows, "book-seva-records");
  };


  const validateFilters = () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both From Date and To Date before loading data");
      return false;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error("From Date cannot be later than To Date");
      return false;
    }
    return true;
  };

  const loadData = async () => {
    if (!validateFilters()) return;

    setLoading(true);
    try {
      const data = await bookSevaApi.getAll({
        skip: (currentPage - 1) * recordsPerPage,
        limit: recordsPerPage,
        from_date: fromDate,
        to_date: toDate
      });

      setRecords(data);
      setFilteredRecords(data);
      setDataLoaded(true);

      // Calculate total pages (approximate since we don't get total count from API)
      if (data.length < recordsPerPage) {
        setTotalPages(currentPage);
      } else {
        setTotalPages(currentPage + 1); // We don't know exact total, so we show next page option
      }

      toast.success(`Loaded ${data.length} book seva records`);
    } catch (error) {
      toast.error("Failed to load book seva records");
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredRecords(records);
      return;
    }

    const filtered = records.filter(record =>
      record.seva_place?.toLowerCase().includes(term.toLowerCase()) ||
      record.sevadar_name?.toLowerCase().includes(term.toLowerCase()) ||
      record.book_name?.toLowerCase().includes(term.toLowerCase()) ||
      record.coordinator_name?.toLowerCase().includes(term.toLowerCase()) ||
      record.driver_name?.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredRecords(filtered);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Note: We need to reload data when page changes
    // This will be handled automatically when the page state changes and we call loadData
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Load data when pagination changes
  const reloadWithPagination = async () => {
    if (!dataLoaded || !validateFilters()) return;
    await loadData();
  };

  // Reload data when page or records per page changes
  useEffect(() => {
    if (dataLoaded) {
      reloadWithPagination();
    }
  }, [currentPage, recordsPerPage]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingRecord) {
        await bookSevaApi.update(editingRecord.id, formData as BookSevaUpdate);
        toast.success("Book seva record updated successfully");
      } else {
        await bookSevaApi.create(formData as BookSevaCreate);
        toast.success("Book seva record created successfully");
      }

      setShowAddDialog(false);
      setEditingRecord(null);
      resetForm();
      if (dataLoaded) {
        await loadData(); // Reload data after successful operation
      }
    } catch (error) {
      toast.error(`Failed to ${editingRecord ? 'update' : 'create'} book seva record`);
      setFormLoading(false); // immediate reset here
    } finally {
      setFormLoading(false); // fallback reset
    }
  };

  const handleEdit = (record: BookSevaRead) => {
    setEditingRecord(record);
    setFormData({
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : "",
      seva_place: record.seva_place || "",
      sevadar_name: record.sevadar_name || "",
      book_name: record.book_name || BOOK_NAMES[0],
      book_type: record.book_type || "free",
      quantity: record.quantity || 1,
      coordinator_name: record.coordinator_name || COORDINATOR_NAME,
      driver_name: record.driver_name || DRIVER_NAME
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      await bookSevaApi.delete(id);
      toast.success("Book seva record deleted successfully");
      if (dataLoaded) {
        await loadData(); // Reload data after successful deletion
      }
    } catch (error) {
      toast.error("Failed to delete book seva record");
      console.error("Error deleting record:", error);
    }
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingRecord) return;

    setDeleteLoading(true);
    try {
      await bookSevaApi.delete(deletingRecord.id);
      setDeletingRecord(null);
      toast.success("Book seva record deleted successfully");
      if (dataLoaded) {
        await loadData(); // Reload data after successful deletion
      }
    } catch (error) {
      toast.error("Failed to delete book seva record");
      console.error("Error deleting record:", error);
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingRecord, loadData, dataLoaded]);

  const resetForm = () => {
    setFormData({
      date: "",
      seva_place: "",
      sevadar_name: "",
      book_name: BOOK_NAMES[0],
      book_type: "free",
      quantity: 1,
      coordinator_name: COORDINATOR_NAME,
      driver_name: DRIVER_NAME
    });
  };

  const openAddDialog = () => {
    setEditingRecord(null);
    resetForm();
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Book Seva</h1>
          <p className="text-muted-foreground">Manage book distribution records</p>
        </div>
        <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Book Seva
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Set filters before loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="fromDate">
                From: {fromDate && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(fromDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                )}
              </Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">
                To: {toDate && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(toDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                )}
              </Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={loadData}
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Load Data
                </>
              )}
            </Button>
            <Button variant={"outline"} onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Data Section - Only show after data is loaded */}
      {dataLoaded && (
        <>
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search book seva records..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Book Seva Records</CardTitle>
                  <CardDescription>
                    Showing {filteredRecords.length} records
                  </CardDescription>
                </div>

                {/* Records per page selector */}
                <div className="flex items-center space-x-2">
                  <Label>Records per page:</Label>
                  <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Sevadar</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Coordinator</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {/* {record.date ? new Date(record.date).toLocaleDateString() : 'N/A'} */}
                          {record.date ? new Date(record.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          }) : 'N/A'}
                        </TableCell>
                        <TableCell>{record.seva_place}</TableCell>
                        <TableCell>{record.sevadar_name}</TableCell>
                        <TableCell>{record.book_name}</TableCell>
                        <TableCell>
                          {record.quantity}
                          <Badge variant={record.book_type === 'paid' ? 'default' : 'secondary'} className="ml-4">
                            {record.book_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.driver_name}</TableCell>
                        <TableCell>{record.coordinator_name}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(record)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setDeletingRecord(record)}
      className="text-destructive hover:text-destructive"
      aria-label={`Delete book seva record`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Book Seva Record</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete this book seva record for <strong>{record.seva_place}</strong>? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeleteConfirm}
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

              {/* Pagination */}
              {records.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    {/* Page numbers */}
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, currentPage - 2) + i;
                          if (pageNum > totalPages) return null;

                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={records.length < recordsPerPage}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* No Data Loaded State */}
      {!dataLoaded && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="mb-2">Load Data</CardTitle>
            <CardDescription>
              Please select a date range and click "Load Data" to view book-seva records.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Book Seva Record' : 'Add New Book Seva Record'}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? 'Update the book seva record details.' : 'Enter the details for the new book seva record.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                {formData.date && (
                  <p className="text-sm text-muted-foreground">
                    Selected Date: {new Date(formData.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seva_place">Seva Place *</Label>
                <Input
                  id="seva_place"
                  value={formData.seva_place}
                  onChange={(e) => setFormData({ ...formData, seva_place: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sevadar_name">Sevadar Name *</Label>
                <Input
                  id="sevadar_name"
                  value={formData.sevadar_name}
                  onChange={(e) => setFormData({ ...formData, sevadar_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="book_name">Book Name *</Label>
                <Select
                  value={formData.book_name}
                  onValueChange={(value) => setFormData({ ...formData, book_name: value as BookName })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOK_NAMES.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="book_type">Book Type *</Label>
                <Select
                  value={formData.book_type}
                  onValueChange={(value) => setFormData({ ...formData, book_type: value as 'free' | 'paid' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coordinator_name">Coordinator Name</Label>
                <Input
                  id="coordinator_name"
                  value={formData.coordinator_name}
                  onChange={(e) => setFormData({ ...formData, coordinator_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_name">Driver Name</Label>
                <Input
                  id="driver_name"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingRecord ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingRecord ? 'Update Record' : 'Create Record'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
