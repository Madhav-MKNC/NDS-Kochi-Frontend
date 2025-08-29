"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Phone, DollarSign, TrendingUp, Users, Activity } from "lucide-react";
import {
  bookSevaApi,
  callingSevaApi,
  expensesApi,
  authApi,
  type BookSevaRead,
  type CallingSevaRead,
  type ExpenseRead,
  type User,
  ApiServiceError,
  apiUtils
} from "@/lib/api";

interface DashboardStats {
  bookSevas: {
    total: number;
    free: number;
    paid: number;
    totalQuantity: number;
  };
  callingSevas: {
    total: number;
    interested: number;
    notInterested: number;
  };
  expenses: {
    total: number;
    totalAmount: number;
    seva: number;
    naamdaan: number;
  };
}

interface ChartData {
  date: string;
  books: number;
  calls: number;
  expenses: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookSevas, setBookSevas] = useState<BookSevaRead[]>([]);
  const [callingSevas, setCallingSevas] = useState<CallingSevaRead[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRead[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'books' | 'calls' | 'expenses'>('books');

  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      const [bookSevasData, callingSevasData, expensesData] = await Promise.allSettled([
        bookSevaApi.getAll(),
        callingSevaApi.getAll(),
        expensesApi.getAll()
      ]);

      if (bookSevasData.status === 'fulfilled') {
        setBookSevas(Array.isArray(bookSevasData.value) ? bookSevasData.value : []);
      } else {
        console.error('Failed to fetch book sevas:', bookSevasData.reason);
        setBookSevas([]);
      }

      if (callingSevasData.status === 'fulfilled') {
        setCallingSevas(Array.isArray(callingSevasData.value) ? callingSevasData.value : []);
      } else {
        console.error('Failed to fetch calling sevas:', callingSevasData.reason);
        setCallingSevas([]);
      }

      if (expensesData.status === 'fulfilled') {
        setExpenses(Array.isArray(expensesData.value) ? expensesData.value : []);
      } else {
        console.error('Failed to fetch expenses:', expensesData.reason);
        setExpenses([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiUtils.isAuthenticated()) {
      // fetchCurrentUser();
      fetchAllData();
    }
  }, [
    // fetchCurrentUser,
    fetchAllData
  ]);

  const stats: DashboardStats = useMemo(() => {
    const bookStats = {
      total: bookSevas.length,
      free: bookSevas.filter(b => b.book_type === 'free').length,
      paid: bookSevas.filter(b => b.book_type === 'paid').length,
      totalQuantity: bookSevas.reduce((sum, b) => sum + b.quantity, 0)
    };

    const callStats = {
      total: callingSevas.length,
      interested: callingSevas.filter(c => c.status === 'interested').length,
      notInterested: callingSevas.filter(c => c.status === 'not interested').length,
    };

    const expenseStats = {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.total_amount, 0),
      seva: expenses.filter(e => e.category === 'seva').length,
      naamdaan: expenses.filter(e => e.category === 'naamdaan').length,
    };

    return {
      bookSevas: bookStats,
      callingSevas: callStats,
      expenses: expenseStats
    };
  }, [bookSevas, callingSevas, expenses]);

  const chartData: ChartData[] = useMemo(() => {
    // Create a map of dates to activity counts
    const dateMap = new Map<string, { books: number; calls: number; expenses: number }>();

    // Process book sevas
    bookSevas.forEach(book => {
      const date = new Date(book.date).toLocaleDateString();
      if (!dateMap.has(date)) {
        dateMap.set(date, { books: 0, calls: 0, expenses: 0 });
      }
      dateMap.get(date)!.books += book.quantity;
    });

    // Process calling sevas
    callingSevas.forEach(call => {
      const date = new Date(call.date).toLocaleDateString();
      if (!dateMap.has(date)) {
        dateMap.set(date, { books: 0, calls: 0, expenses: 0 });
      }
      dateMap.get(date)!.calls += 1;
    });

    // Process expenses (mock date since expenses don't have date in the current schema)
    expenses.forEach(expense => {
      const date = new Date().toLocaleDateString(); // Using current date as fallback
      if (!dateMap.has(date)) {
        dateMap.set(date, { books: 0, calls: 0, expenses: 0 });
      }
      dateMap.get(date)!.expenses += 1;
    });

    // Convert to array and sort by date
    return Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Get last 7 days
  }, [bookSevas, callingSevas, expenses]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}! Here's your seva activity overview.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Books Card */}
        <Card className="border-border bg-card hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Books Distributed</p>
                <div className="text-2xl font-bold text-foreground">{stats.bookSevas.totalQuantity}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.bookSevas.free} free • {stats.bookSevas.paid} paid
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calls Card */}
        <Card className="border-border bg-card hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Calls Made</p>
                <div className="text-2xl font-bold text-foreground">{stats.callingSevas.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.callingSevas.interested} interested • {stats.callingSevas.notInterested} others
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900/20 rounded-md flex items-center justify-center">
                <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="border-border bg-card hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.expenses.totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.expenses.total} items recorded
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/20 rounded-md flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Card */}
        <Card className="border-border bg-card hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                <div className="text-2xl font-bold text-foreground">
                  {stats.bookSevas.total + stats.callingSevas.total + stats.expenses.total}
                </div>
                <p className="text-xs text-muted-foreground">
                  All seva activities
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/20 rounded-md flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-foreground">Activity Trends</CardTitle>
            <CardDescription className="text-muted-foreground">
              Track different metrics over time
            </CardDescription>
          </div>
          <Select value={selectedMetric} onValueChange={(value: 'books' | 'calls' | 'expenses') => setSelectedMetric(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="books">Books</SelectItem>
              <SelectItem value="calls">Calls</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm">Start adding records to see trends</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Last {chartData.length} days activity</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-sm"></div>
                  <span className="capitalize">{selectedMetric}</span>
                </div>
              </div>

              {/* Simple Bar Chart */}
              <div className="space-y-3">
                {chartData.map((data, index) => {
                  const value = data[selectedMetric];
                  const maxValue = Math.max(...chartData.map(d => d[selectedMetric]));
                  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-muted-foreground">
                        {data.date}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-8 text-sm font-medium text-foreground">
                          {value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Book Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Records:</span>
              <span className="font-medium">{stats.bookSevas.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Free Books:</span>
              <span className="font-medium">{stats.bookSevas.free}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Books:</span>
              <span className="font-medium">{stats.bookSevas.paid}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              Calling Seva
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Calls:</span>
              <span className="font-medium">{stats.callingSevas.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interested:</span>
              <span className="font-medium text-green-600">{stats.callingSevas.interested}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Not Interested:</span>
              <span className="font-medium text-red-600">{stats.callingSevas.notInterested}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Expense Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">{formatCurrency(stats.expenses.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seva Expenses:</span>
              <span className="font-medium">{stats.expenses.seva}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Naamdaan Expenses:</span>
              <span className="font-medium">{stats.expenses.naamdaan}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}