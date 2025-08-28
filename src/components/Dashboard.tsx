"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartNoAxesCombined, LayoutDashboard, ChartBar, ChartPie } from 'lucide-react';
import { toast } from 'sonner';

interface BookSevaRead {
  id: string;
  date: string;
  book_type: 'free' | 'paid';
  quantity: number;
}

interface CallingSevaRead {
  id: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface ExpenseRead {
  id: string;
  date: string;
  item_name: string;
  item_price: number;
  quantity: number;
  total_amount: number;
  category: string;
}

interface DashboardData {
  books: BookSevaRead[];
  calls: CallingSevaRead[];
  expenses: ExpenseRead[];
}

interface SeriesData {
  date: string;
  books: number;
  calls: number;
  expenses: number;
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  breakdown: { label: string; value: string | number }[];
  icon: React.ReactNode;
  sparklineData?: number[];
}

function SummaryCard({ title, value, breakdown, icon, sparklineData = [] }: SummaryCardProps) {
  const maxValue = Math.max(...sparklineData, 1);
  
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-2">{value}</div>
        <div className="space-y-1 mb-3">
          {breakdown.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="text-foreground font-medium">{item.value}</span>
            </div>
          ))}
        </div>
        {sparklineData.length > 0 && (
          <div className="h-8 w-full" role="img" aria-label={`Sparkline chart for ${title}`}>
            <svg width="100%" height="100%" viewBox="0 0 100 32" className="text-primary">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                points={sparklineData
                  .map((value, index) => 
                    `${(index / (sparklineData.length - 1)) * 100},${32 - (value / maxValue) * 28}`
                  )
                  .join(' ')}
              />
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TrendChartProps {
  data: SeriesData[];
  metric: 'books' | 'calls' | 'expenses';
  title: string;
}

function TrendChart({ data, metric, title }: TrendChartProps) {
  const values = data.map(d => d[metric]);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="h-64 w-full" role="img" aria-label={`Trend chart for ${title}`}>
        <svg width="100%" height="100%" viewBox="0 0 400 200" className="border rounded-md bg-card">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i}>
              <line 
                x1="40" 
                y1={40 + (i * 32)} 
                x2="380" 
                y2={40 + (i * 32)} 
                stroke="currentColor" 
                strokeWidth="0.5" 
                className="text-border"
              />
              <text 
                x="35" 
                y={44 + (i * 32)} 
                fontSize="10" 
                textAnchor="end" 
                className="text-muted-foreground fill-current"
              >
                {Math.round(maxValue - (i * range / 4))}
              </text>
            </g>
          ))}
          
          {/* Bars */}
          {data.map((point, index) => {
            const barHeight = ((point[metric] - minValue) / range) * 128;
            const x = 50 + (index * 24);
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={168 - barHeight}
                  width="16"
                  height={barHeight}
                  className="fill-primary"
                />
                <text
                  x={x + 8}
                  y="185"
                  fontSize="8"
                  textAnchor="middle"
                  className="text-muted-foreground fill-current"
                >
                  {new Date(point.date).getDate()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Accessible table fallback */}
      <table className="sr-only">
        <caption>{title} data</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point, index) => (
            <tr key={index}>
              <td>{new Date(point.date).toLocaleDateString()}</td>
              <td>{point[metric]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '14' | '30'>('14');
  const [selectedMetric, setSelectedMetric] = useState<'books' | 'calls' | 'expenses'>('books');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [booksResponse, callsResponse, expensesResponse] = await Promise.all([
        fetch('/api/book-seva'),
        fetch('/api/calling-seva'),
        fetch('/api/expenses')
      ]);

      const books = booksResponse.ok ? await booksResponse.json() : [];
      const calls = callsResponse.ok ? await callsResponse.json() : [];
      const expenses = expensesResponse.ok ? await expensesResponse.json() : [];

      if (!booksResponse.ok || !callsResponse.ok || !expensesResponse.ok) {
        throw new Error('Some data could not be loaded');
      }

      setData({ books, calls, expenses });
      toast.success('Dashboard refreshed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast.error('Failed to refresh dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summaryData = useMemo(() => {
    if (!data) return null;

    const totalBooks = data.books.reduce((sum, book) => sum + book.quantity, 0);
    const booksByType = data.books.reduce((acc, book) => {
      acc[book.book_type] = (acc[book.book_type] || 0) + book.quantity;
      return acc;
    }, {} as Record<string, number>);

    const totalCalls = data.calls.length;
    const callsByStatus = data.calls.reduce((acc, call) => {
      acc[call.status] = (acc[call.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.total_amount, 0);
    const expensesByCategory = data.expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalBooks,
      booksByType,
      totalCalls,
      callsByStatus,
      totalExpenses,
      expensesByCategory
    };
  }, [data]);

  const seriesData = useMemo(() => {
    if (!data) return [];

    const days = parseInt(dateRange);
    const series: SeriesData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayBooks = data.books
        .filter(book => book.date.startsWith(dateStr))
        .reduce((sum, book) => sum + book.quantity, 0);
      
      const dayCalls = data.calls
        .filter(call => call.date.startsWith(dateStr))
        .length;
      
      const dayExpenses = data.expenses
        .filter(expense => expense.date.startsWith(dateStr))
        .reduce((sum, expense) => sum + expense.total_amount, 0);

      series.push({
        date: dateStr,
        books: dayBooks,
        calls: dayCalls,
        expenses: dayExpenses
      });
    }

    return series;
  }, [data, dateRange]);

  const sparklineData = useMemo(() => {
    if (!seriesData.length) return [];
    return seriesData.slice(-7).map(d => d.books);
  }, [seriesData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-card">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <Button onClick={fetchData} variant="outline">
            Retry
          </Button>
        </div>
        <Card className="bg-card border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summaryData) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(value: '7' | '14' | '30') => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Books Processed"
          value={summaryData.totalBooks.toLocaleString()}
          breakdown={[
            { label: 'Free', value: summaryData.booksByType.free || 0 },
            { label: 'Paid', value: summaryData.booksByType.paid || 0 }
          ]}
          icon={<LayoutDashboard className="h-4 w-4" />}
          sparklineData={sparklineData}
        />

        <SummaryCard
          title="Total Calls Made"
          value={summaryData.totalCalls.toLocaleString()}
          breakdown={[
            { label: 'Completed', value: summaryData.callsByStatus.completed || 0 },
            { label: 'Pending', value: summaryData.callsByStatus.pending || 0 },
            { label: 'Failed', value: summaryData.callsByStatus.failed || 0 }
          ]}
          icon={<ChartBar className="h-4 w-4" />}
        />

        <SummaryCard
          title="Total Expenses"
          value={`₹${summaryData.totalExpenses.toLocaleString()}`}
          breakdown={Object.entries(summaryData.expensesByCategory)
            .slice(0, 3)
            .map(([category, amount]) => ({
              label: category,
              value: `₹${amount.toLocaleString()}`
            }))}
          icon={<ChartPie className="h-4 w-4" />}
        />

        <SummaryCard
          title="Recent Activity"
          value={`${seriesData.slice(-1)[0]?.books || 0} books`}
          breakdown={[
            { label: 'Today calls', value: seriesData.slice(-1)[0]?.calls || 0 },
            { label: 'Today expenses', value: `₹${seriesData.slice(-1)[0]?.expenses || 0}` }
          ]}
          icon={<ChartNoAxesCombined className="h-4 w-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Books Processed Trend</CardTitle>
            <CardDescription className="text-muted-foreground">
              Daily book processing for the last {dateRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={seriesData}
              metric="books"
              title="Books Processed"
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
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
            <TrendChart
              data={seriesData}
              metric={selectedMetric}
              title={selectedMetric === 'books' ? 'Books' : selectedMetric === 'calls' ? 'Calls' : 'Expenses (₹)'}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}