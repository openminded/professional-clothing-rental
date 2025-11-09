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
} from 'recharts';
import {
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

interface RentalData {
  rentals: Array<{
    id: string;
    status: string;
    rentalDate: string;
    expectedReturnDate: string;
    actualReturnDate?: string;
    customerName: string;
    cashierName: string;
    itemCount: number;
    subtotal: string;
    totalAmount: string;
  }>;
  summary: {
    total: number;
  };
}

interface ReportPeriod {
  from: Date;
  to: Date;
}

export function RentalActivityReport({ period }: { period: ReportPeriod }) {
  const [data, setData] = useState<RentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRentalData();
  }, [period, statusFilter]);

  const fetchRentalData = async () => {
    setLoading(true);
    try {
      let url = `/api/rentals?limit=100`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching rental data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'active':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const isOverdue = (rental: any) => {
    return rental.status === 'active' && new Date(rental.expectedReturnDate) < new Date();
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
            No rental data available for the selected period.
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusCounts = data.rentals.reduce((acc, rental) => {
    const status = isOverdue(rental) ? 'overdue' : rental.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
  }));

  const overdueRentals = data.rentals.filter(isOverdue);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rentals</p>
                <p className="text-2xl font-bold">{data.summary.total || data.rentals.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rentals</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.rentals.filter(r => r.status === 'active').length}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.rentals.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueRentals.length}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        <Badge variant="outline">
          <Calendar className="h-3 w-3 mr-1" />
          {format(period.from, 'MMM dd')} - {format(period.to, 'MMM dd')}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Rental Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Rental Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Rental Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.rentals
                    .reduce((acc, rental) => {
                      const date = format(new Date(rental.rentalDate), 'MM/dd');
                      const existing = acc.find(item => item.date === date);
                      if (existing) {
                        existing.count++;
                        existing.revenue += parseFloat(rental.totalAmount);
                      } else {
                        acc.push({
                          date,
                          count: 1,
                          revenue: parseFloat(rental.totalAmount),
                        });
                      }
                      return acc;
                    }, [] as Array<{ date: string; count: number; revenue: number }>)
                    .slice(-14)} // Last 14 days
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Rentals Alert */}
      {overdueRentals.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Rentals ({overdueRentals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {overdueRentals.map((rental) => (
                  <div key={rental.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="font-medium">{rental.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {rental.itemCount} items • Due {format(new Date(rental.expectedReturnDate), 'MMM dd')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {Math.ceil(
                          (new Date().getTime() - new Date(rental.expectedReturnDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                        )} days overdue
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Rentals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rental Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rental Date</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rentals
                  .filter(rental => statusFilter === 'all' || rental.status === statusFilter)
                  .map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell className="font-medium">{rental.customerName}</TableCell>
                      <TableCell>{rental.cashierName}</TableCell>
                      <TableCell>{rental.itemCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(isOverdue(rental) ? 'overdue' : rental.status)}
                          <Badge className={getStatusColor(isOverdue(rental) ? 'overdue' : rental.status)}>
                            {isOverdue(rental) ? 'Overdue' : rental.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(rental.rentalDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(rental.expectedReturnDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">${parseFloat(rental.totalAmount).toFixed(2)}</TableCell>
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