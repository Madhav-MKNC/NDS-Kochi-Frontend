"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

interface Expense {
  id: number;
  item_name: string;
  item_price: number;
  quantity: number;
  total_amount?: number;
  category: "seva" | "naamdaan";
  date?: string;
  created_at?: string;
}

interface ExpenseFormData {
  item_name: string;
  item_price: string;
  quantity: string;
  total_amount: string;
  category: "seva" | "naamdaan" | "";
  date: string;
}

const initialFormData: ExpenseFormData = {
  item_name: "",
  item_price: "",
  quantity: "1",
  total_amount: "",
  category: "",
  date: new Date().toISOString().split("T")[0],
};

export default function ExpensesSection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "seva" | "naamdaan">("all");
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<ExpenseFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("https://localhost:8000/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredExpenses = expenses.filter(expense => 
    categoryFilter === "all" || expense.category === categoryFilter
  );

  const grandTotal = filteredExpenses.reduce((sum, expense) => {
    const total = expense.total_amount ?? (expense.item_price * expense.quantity);
    return sum + total;
  }, 0);

  const validateForm = (data: ExpenseFormData): Partial<ExpenseFormData> => {
    const errors: Partial<ExpenseFormData> = {};

    if (!data.item_name.trim()) {
      errors.item_name = "Item name is required";
    }

    const price = parseFloat(data.item_price);
    if (!data.item_price || isNaN(price) || price <= 0) {
      errors.item_price = "Valid price greater than 0 is required";
    }

    const quantity = parseInt(data.quantity);
    if (!data.quantity || isNaN(quantity) || quantity < 1) {
      errors.quantity = "Quantity must be at least 1";
    }

    if (!data.category) {
      errors.category = "Category is required";
    }

    return errors;
  };

  const handleFormChange = (field: keyof ExpenseFormData, value: string) => {
    const newData = { ...formData, [field]: value };

    // Auto-calculate total amount when price or quantity changes
    if (field === "item_price" || field === "quantity") {
      const price = parseFloat(newData.item_price) || 0;
      const quantity = parseInt(newData.quantity) || 0;
      if (price > 0 && quantity > 0) {
        newData.total_amount = (price * quantity).toFixed(2);
      }
    }

    setFormData(newData);

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      const payload = {
        item_name: formData.item_name.trim(),
        item_price: parseFloat(formData.item_price),
        quantity: parseInt(formData.quantity),
        total_amount: parseFloat(formData.total_amount),
        category: formData.category,
        ...(formData.date && { date: formData.date }),
      };

      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save expense");
      }

      toast.success(editingExpense ? "Expense updated successfully" : "Expense created successfully");
      setIsModalOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      setApiError(error instanceof Error ? error.message : "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setApiError("");
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      item_name: expense.item_name,
      item_price: expense.item_price.toString(),
      quantity: expense.quantity.toString(),
      total_amount: (expense.total_amount ?? (expense.item_price * expense.quantity)).toString(),
      category: expense.category,
      date: expense.date || expense.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/expenses/${deletingExpense.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete expense");

      toast.success("Expense deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (expense: Expense) => {
    setDeletingExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4">
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? "Edit Expense" : "Add New Expense"}
                </DialogTitle>
                <DialogDescription>
                  {editingExpense ? "Update the expense details below." : "Enter the details for the new expense."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="item_name">Item Name *</Label>
                    <Input
                      id="item_name"
                      value={formData.item_name}
                      onChange={(e) => handleFormChange("item_name", e.target.value)}
                      placeholder="Enter item name"
                      aria-describedby={formErrors.item_name ? "item_name_error" : undefined}
                    />
                    {formErrors.item_name && (
                      <p id="item_name_error" className="text-sm text-destructive mt-1">
                        {formErrors.item_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="item_price">Item Price *</Label>
                    <Input
                      id="item_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.item_price}
                      onChange={(e) => handleFormChange("item_price", e.target.value)}
                      placeholder="0.00"
                      aria-describedby={formErrors.item_price ? "item_price_error" : undefined}
                    />
                    {formErrors.item_price && (
                      <p id="item_price_error" className="text-sm text-destructive mt-1">
                        {formErrors.item_price}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => handleFormChange("quantity", e.target.value)}
                      placeholder="1"
                      aria-describedby={formErrors.quantity ? "quantity_error" : undefined}
                    />
                    {formErrors.quantity && (
                      <p id="quantity_error" className="text-sm text-destructive mt-1">
                        {formErrors.quantity}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="total_amount">Total Amount</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.total_amount}
                      onChange={(e) => handleFormChange("total_amount", e.target.value)}
                      placeholder="Auto-calculated"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleFormChange("category", value)}
                    >
                      <SelectTrigger aria-describedby={formErrors.category ? "category_error" : undefined}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seva">Seva</SelectItem>
                        <SelectItem value="naamdaan">Naamdaan</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.category && (
                      <p id="category_error" className="text-sm text-destructive mt-1">
                        {formErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleFormChange("date", e.target.value)}
                    />
                  </div>
                </div>

                {apiError && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                    {apiError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : editingExpense ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Badge variant="secondary" className="gap-1">
            <Receipt className="h-3 w-3" />
            Total: ${grandTotal.toFixed(2)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="category-filter" className="text-sm font-medium">
            Filter:
          </Label>
          <Select
            value={categoryFilter}
            onValueChange={(value: "all" | "seva" | "naamdaan") => setCategoryFilter(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="seva">Seva</SelectItem>
              <SelectItem value="naamdaan">Naamdaan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
              <p className="text-muted-foreground mb-4">
                {categoryFilter === "all" 
                  ? "Get started by adding your first expense."
                  : `No ${categoryFilter} expenses found. Try a different filter or add a new expense.`
                }
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Expense
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => {
                    const computedTotal = expense.item_price * expense.quantity;
                    const displayTotal = expense.total_amount ?? computedTotal;
                    
                    return (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {expense.date || expense.created_at?.split("T")[0] || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {expense.item_name}
                        </TableCell>
                        <TableCell>${expense.item_price.toFixed(2)}</TableCell>
                        <TableCell>{expense.quantity}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>${displayTotal.toFixed(2)}</span>
                            {expense.total_amount && expense.total_amount !== computedTotal && (
                              <span className="text-xs text-muted-foreground">
                                (computed: ${computedTotal.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={expense.category === "seva" ? "default" : "secondary"}>
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(expense)}
                              aria-label={`Edit ${expense.item_name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(expense)}
                              aria-label={`Delete ${expense.item_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Sticky Footer with Grand Total */}
              <div className="sticky bottom-0 bg-card border-t mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredExpenses.length} expenses
                  </span>
                  <div className="text-lg font-semibold">
                    Grand Total: ${grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingExpense?.item_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}