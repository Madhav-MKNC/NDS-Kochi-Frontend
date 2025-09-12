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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight, Download, MessageSquare } from "lucide-react";
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { callingSevaApi, fetchConstants, type CallingSevaRead, type CallingSevaCreate, type CallingSevaUpdate } from "@/lib/api";
import { exportToCSV } from "@/utils/exportToCSV";
import { formatRecords } from "@/utils/formatRecords";

import {
  BHAGAT_NAMES,
  STATUS_OPTIONS
} from "@/lib/api";

export default function CallingSevaSection() {
  // Data and loading states
  const [records, setRecords] = useState<CallingSevaRead[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<CallingSevaRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(50);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CallingSevaRead | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<CallingSevaRead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState<Partial<CallingSevaCreate>>({
    date: "",
    address: "",
    mobile_no: "",
    status: STATUS_OPTIONS[0],
    assigned_bhagat_name: BHAGAT_NAMES[0],
    remarks: ""
  });

  // Fetch dynamic constants
  useEffect(() => {
    fetchConstants();
  }, []);

  const validateFilters = () => {
    if (!statusFilter) {
      toast.error("Please select a status filter before loading data");
      return false;
    }
    return true;
  };

  const loadData = async () => {
    if (!validateFilters()) return;

    setLoading(true);
    try {
      const data = await callingSevaApi.getAll({
        skip: (currentPage - 1) * recordsPerPage,
        limit: recordsPerPage,
        status: statusFilter === "all" ? undefined : statusFilter
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

      toast.success(`Loaded ${data.length} calling seva records`);
    } catch (error) {
      toast.error("Failed to load calling seva records");
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
      record.address?.toLowerCase().includes(term.toLowerCase()) ||
      record.mobile_no?.toLowerCase().includes(term.toLowerCase()) ||
      record.assigned_bhagat_name?.toLowerCase().includes(term.toLowerCase()) ||
      record.remarks?.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredRecords(filtered);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

  const handleExport = () => {
    const { headers, rows } = formatRecords(filteredRecords);
    exportToCSV(headers, rows, "calling-seva-records");
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
        await callingSevaApi.update(editingRecord.id, formData as CallingSevaUpdate);
        toast.success("Calling seva record updated successfully");
      } else {
        await callingSevaApi.create(formData as CallingSevaCreate);
        toast.success("Calling seva record created successfully");
      }

      setShowAddDialog(false);
      setEditingRecord(null);
      resetForm();
      if (dataLoaded) {
        await loadData(); // Reload data after successful operation
      }
    } catch (error) {
      toast.error(`Failed to ${editingRecord ? 'update' : 'create'} calling seva record`);
      setFormLoading(false); // immediate reset here
    } finally {
      setFormLoading(false); // fallback reset
    }
  };

  const handleEdit = (record: CallingSevaRead) => {
    setEditingRecord(record);
    setFormData({
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : "",
      address: record.address || "",
      mobile_no: record.mobile_no || "",
      status: record.status || "other",
      assigned_bhagat_name: record.assigned_bhagat_name || BHAGAT_NAMES[0],
      remarks: record.remarks || ""
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      await callingSevaApi.delete(id);
      toast.success("Calling seva record deleted successfully");
      if (dataLoaded) {
        await loadData(); // Reload data after successful deletion
      }
    } catch (error) {
      toast.error("Failed to delete calling seva record");
      console.error("Error deleting record:", error);
    }
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingRecord) return;

    setDeleteLoading(true);
    try {
      await callingSevaApi.delete(deletingRecord.id);
      setDeletingRecord(null);
      toast.success("Calling seva record deleted successfully");
      if (dataLoaded) {
        await loadData(); // Reload data after successful deletion
      }
    } catch (error) {
      toast.error("Failed to delete calling seva record");
      console.error("Error deleting record:", error);
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingRecord, loadData, dataLoaded]);

  const resetForm = () => {
    setFormData({
      date: "",
      address: "",
      mobile_no: "",
      status: "other",
      assigned_bhagat_name: BHAGAT_NAMES[0],
      remarks: ""
    });
  };

  const openAddDialog = () => {
    setEditingRecord(null);
    resetForm();
    setShowAddDialog(true);
  };

  const handleWhatsApp = (record: CallingSevaRead) => {
    const phone = record.mobile_no?.replace(/[^0-9]/g, "");
    const message = `Hello ${record.assigned_bhagat_name}, regarding your seva request at ${record.address} on ${record.date ? new Date(record.date).toLocaleDateString() : ""}.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calling Seva</h1>
          <p className="text-muted-foreground">Manage calling seva records</p>
        </div>
        <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Calling Seva
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Set filters before loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status === "Interested (ज्ञान में रुची है)" ? (
                        <Badge className="bg-green-200 text-green-800 border border-green-400">
                          Interested (ज्ञान में रुची है)
                        </Badge>
                      ) : (
                        status.charAt(0).toUpperCase() + status.slice(1)
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Filter className="w-4 h-4 mr-2" />
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
                placeholder="Search calling seva records..."
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
                  <CardTitle>Calling Seva Records</CardTitle>
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
                      <TableHead>Address</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Bhagat</TableHead>
                      <TableHead>Remarks</TableHead>
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
                        <TableCell className="max-w-xs truncate">
                          {record.address}
                        </TableCell>
                        <TableCell>{record.mobile_no}</TableCell>
                        <TableCell>
                          {record.status === "Interested (ज्ञान में रुची है)" ? (
                            <Badge className="bg-green-200 text-green-800 border border-green-400">
                              Interested (ज्ञान में रुची है)
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-200 text-black-800 border border-black-100">
                              {record.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{record.assigned_bhagat_name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.remarks || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleWhatsApp(record)}
                              className="text-green-500 hover:text-green-600"
                              aria-label="WhatsApp"
                            >
                              <IconBrandWhatsapp className="w-4 h-4" />
                            </Button>
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
                                  aria-label={`Delete calling seva record`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Calling Seva Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this calling seva record for <strong>{record.address}</strong>? This action cannot be undone.
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
              Please select a status and click "Load Data" to view calling-seva records.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Calling Seva Record' : 'Add New Calling Seva Record'}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? 'Update the calling seva record details.' : 'Enter the details for the new calling seva record.'}
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
                <Label htmlFor="mobile_no">Mobile Number *</Label>
                <Input
                  id="mobile_no"
                  value={formData.mobile_no}
                  onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                  placeholder="+911234567890"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter complete address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_bhagat_name">Assigned Bhagat *</Label>
                <Select
                  value={formData.assigned_bhagat_name}
                  onValueChange={(value) => setFormData({ ...formData, assigned_bhagat_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BHAGAT_NAMES.map(name => (
                      <SelectItem key={name} value={name}>
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional remarks"
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
