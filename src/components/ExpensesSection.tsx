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
import { Receipt, DollarSign, Edit, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  expensesApi,
  authApi,
  type ExpenseRead,
  type ExpenseCreate,
  type ExpenseUpdate,
  type ExpenseCategory,
  type User,
  ApiServiceError,
  apiUtils
} from "@/lib/api";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "seva", label: "Seva" },
  { value: "naamdaan", label: "Naamdaan" }
];

export default function ExpensesSection() {
  const [expenses, setExpenses] = useState<ExpenseRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ExpenseCategory>("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseRead | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState<ExpenseCreate>({
    item_name: "",
    item_price: 0,
    quantity: 1,
    total_amount: 0,
    category: "seva",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  // Delete states
  const [deletingItem, setDeletingItem] = useState<ExpenseRead | null>(null);
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

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await expensesApi.getAll();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      if (error instanceof ApiServiceError) {
        if (error.status !== 401) {
          toast.error("Failed to load expenses: " + error.message);
        }
      } else {
        toast.error("Failed to load expenses");
      }
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiUtils.isAuthenticated()) {
      // fetchCurrentUser();
      fetchExpenses();
    }
  }, [
    // fetchCurrentUser, 
    fetchExpenses
  ]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesSearch = searchQuery === "" ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesFilter;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);
  }, [filteredExpenses]);

  const validateForm = useCallback((data: ExpenseCreate): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.item_name.trim()) errors.item_name = "Item name is required";
    if (!data.item_price || data.item_price <= 0) errors.item_price = "Item price must be greater than 0";
    if (!data.quantity || data.quantity < 1) errors.quantity = "Quantity must be at least 1";
    if (!data.total_amount || data.total_amount <= 0) errors.total_amount = "Total amount must be greater than 0";
    if (!data.category) errors.category = "Category is required";

    return errors;
  }, []);

  const openModal = useCallback((item?: ExpenseRead) => {
    setEditingItem(item || null);

    if (item) {
      setFormData({
        item_name: item.item_name,
        item_price: item.item_price,
        quantity: item.quantity,
        total_amount: item.total_amount,
        category: item.category,
      });
    } else {
      setFormData({
        item_name: "",
        item_price: 0,
        quantity: 1,
        total_amount: 0,
        category: "seva",
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
      item_name: "",
      item_price: 0,
      quantity: 1,
      total_amount: 0,
      category: "seva",
    });
    setFormErrors({});
    setServerError("");
  }, []);

  const handleFormChange = useCallback((field: keyof ExpenseCreate, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-calculate total amount when price or quantity changes
      if (field === "item_price" || field === "quantity") {
        const price = field === "item_price" ? Number(value) : newData.item_price;
        const quantity = field === "quantity" ? Number(value) : newData.quantity;
        newData.total_amount = price * quantity;
      }

      return newData;
    });

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
      if (editingItem) {
        const updatePayload: ExpenseUpdate = formData;
        await expensesApi.update(editingItem.id, updatePayload);
        toast.success("Expense updated successfully");
      } else {
        await expensesApi.create(formData);
        toast.success("Expense created successfully");
      }

      closeModal();
      fetchExpenses();
    } catch (error) {
      if (error instanceof ApiServiceError) {
        setServerError(apiUtils.formatError(error));
      } else {
        setServerError("An unexpected error occurred");
      }
    } finally {
      setModalLoading(false);
    }
  }, [formData, editingItem, validateForm, closeModal, fetchExpenses]);

  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;

    setDeleteLoading(true);
    try {
      await expensesApi.delete(deletingItem.id);
      setDeletingItem(null);
      fetchExpenses();
    } catch (error) {
      if (error instanceof ApiServiceError) {
        toast.error("Failed to delete expense: " + error.message);
      } else {
        toast.error("Failed to delete expense");
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingItem, fetchExpenses]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">Track and manage expense records</p>
        </div>
        <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
          <Receipt className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Summary Card */}
      {filteredExpenses.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
                <p className="text-sm text-muted-foreground">{filteredExpenses.length} items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by item name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value: "all" | ExpenseCategory) => setCategoryFilter(value)}>
          <SelectTrigger className="w-40 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="mb-2">No expenses found</CardTitle>
            <CardDescription className="mb-4">
              {expenses.length === 0 ? "Get started by adding your first expense record." : "No records match your search criteria."}
            </CardDescription>
            {expenses.length === 0 && (
              <Button onClick={() => openModal()} className="bg-primary hover:bg-primary/90">
                <Receipt className="h-4 w-4 mr-2" />
                Add First Expense
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
                    <TableHead className="font-medium text-muted-foreground">Item Name</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Price</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Quantity</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Total Amount</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Category</TableHead>
                    <TableHead className="font-medium text-muted-foreground w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((item) => (
                    <TableRow key={item.id} className="border-b border-border hover:bg-muted/20">
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{formatCurrency(item.item_price)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.total_amount)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md capitalize ${item.category === "seva"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}>
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal(item)}
                            aria-label={`Edit ${item.item_name} expense`}
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
                                aria-label={`Delete ${item.item_name} expense`}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the expense record for <strong>{item.item_name}</strong> worth <strong>{formatCurrency(item.total_amount)}</strong>? This action cannot be undone.
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
            <DialogTitle>{editingItem ? "Edit Expense" : "Add New Expense"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the expense record details." : "Fill in the details for the new expense record."}
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  placeholder="Enter item name"
                  value={formData.item_name}
                  onChange={(e) => handleFormChange("item_name", e.target.value)}
                  className={formErrors.item_name ? "border-destructive" : ""}
                />
                {formErrors.item_name && <p className="text-sm text-destructive">{formErrors.item_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_price">Item Price *</Label>
                <Input
                  id="item_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.item_price || ""}
                  onChange={(e) => handleFormChange("item_price", parseFloat(e.target.value) || 0)}
                  className={formErrors.item_price ? "border-destructive" : ""}
                />
                {formErrors.item_price && <p className="text-sm text-destructive">{formErrors.item_price}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.quantity || ""}
                  onChange={(e) => handleFormChange("quantity", parseInt(e.target.value) || 1)}
                  className={formErrors.quantity ? "border-destructive" : ""}
                />
                {formErrors.quantity && <p className="text-sm text-destructive">{formErrors.quantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.total_amount || ""}
                  onChange={(e) => handleFormChange("total_amount", parseFloat(e.target.value) || 0)}
                  className={formErrors.total_amount ? "border-destructive" : ""}
                />
                {formErrors.total_amount && <p className="text-sm text-destructive">{formErrors.total_amount}</p>}
                <p className="text-xs text-muted-foreground">
                  Auto-calculated: {formatCurrency((formData.item_price || 0) * (formData.quantity || 1))}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value: ExpenseCategory) => handleFormChange("category", value)}>
                  <SelectTrigger className={formErrors.category ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.category && <p className="text-sm text-destructive">{formErrors.category}</p>}
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