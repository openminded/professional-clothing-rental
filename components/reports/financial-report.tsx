'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Users,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';

interface FinancialData {
  summary: {
    totalRevenue: number;
    transactionCount: number;
    cashRevenue: number;
    transferRevenue: number;
    cardRevenue: number;
  };
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    transactionCount: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalRevenue: number;
    rentalCount: number;
  }>;
}

interface ReportPeriod {
  from: Date;
  to: Date;
}

export function FinancialReport({ period }: { period: ReportPeriod }) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    fetchFinancialData();
  }, [period, reportType]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/reports/financial?type=${reportType}&startDate=${period.from.toISOString()}&endDate=${period.to.toISOString()}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    // Implement CSV export functionality
    if (!data) return;

    const csvContent = [
      ['Customer', 'Revenue', 'Rental Count'],
      ...(data.topCustomers || []).map(customer => [
        customer.customerName,
        customer.totalRevenue.toString(),
        customer.rentalCount.toString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No financial data available for the selected period.
          </div>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${data.summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{data.summary.transactionCount}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Transaction</p>
                <p className="text-2xl font-bold">
                  ${data.summary.transactionCount > 0
                    ? (data.summary.totalRevenue / data.summary.transactionCount).toFixed(2)
                    : '0.00'
                  }
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Customer</p>
                <p className="text-lg font-bold truncate">
                  {data.topCustomers?.[0]?.customerName || 'N/A'}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary Report</SelectItem>
              <SelectItem value="transactions">Transaction Details</SelectItem>
              <SelectItem value="cashier-performance">Cashier Performance</SelectItem>
              <SelectItem value="revenue-breakdown">Revenue Breakdown</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        <Badge variant="outline">
          <Calendar className="h-3 w-3 mr-1" />
          {format(period.from, 'MMM dd')} - {format(period.to, 'MMM dd')}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ fill: '#8884d8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Cash', value: data.summary.cashRevenue },
                      { name: 'Transfer', value: data.summary.transferRevenue },
                      { name: 'Card', value: data.summary.cardRevenue },
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Cash', value: data.summary.cashRevenue },
                      { name: 'Transfer', value: data.summary.transferRevenue },
                      { name: 'Card', value: data.summary.cardRevenue },
                    ]
                      .filter(item => item.value > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Rentals</TableHead>
                  <TableHead>Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topCustomers?.map((customer, index) => (
                  <TableRow key={customer.customerId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                          {index + 1}
                        </div>
                        {customer.customerName}
                      </div>
                    </TableCell>
                    <TableCell>${customer.totalRevenue.toLocaleString()}</TableCell>
                    <TableCell>{customer.rentalCount}</TableCell>
                    <TableCell>
                      ${(customer.totalRevenue / customer.rentalCount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}