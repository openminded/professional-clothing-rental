'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Download,
  Shirt,
  Washing,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface InventoryData {
  summary: {
    total: number;
    available: number;
    rented: number;
    inLaundry: number;
    damaged: number;
    unavailable: number;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    available: number;
    rented: number;
  }>;
  detailedItems?: Array<{
    id: string;
    sku: string;
    size: string;
    color: string;
    status: string;
    condition: string;
    modelName: string;
    modelCategory: string;
    brand: string;
    dailyRate: string;
    rentalCount: number;
    lastRentalDate: string | null;
  }>;
  laundryItems?: Array<{
    id: string;
    sku: string;
    size: string;
    color: string;
    modelName: string;
    daysInLaundry: number;
    isOverdue: boolean;
  }>;
}

export function InventoryReport() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    fetchInventoryData();
  }, [reportType]);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/inventory?type=${reportType}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'in_laundry':
        return 'bg-yellow-100 text-yellow-800';
      case 'damaged':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rented':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'in_laundry':
        return <Washing className="h-4 w-4 text-yellow-600" />;
      case 'damaged':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#eab308', '#ef4444', '#6b7280'];

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
            No inventory data available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{data.summary.total}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.available}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Rented</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.rented}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shirt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Laundry</p>
                <p className="text-2xl font-bold text-yellow-600">{data.summary.inLaundry}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Washing className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Damaged</p>
                <p className="text-2xl font-bold text-red-600">{data.summary.damaged}</p>
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
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary Report</SelectItem>
              <SelectItem value="detailed">Detailed Inventory</SelectItem>
              <SelectItem value="laundry">Laundry Status</SelectItem>
              <SelectItem value="utilization">Utilization</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Available', value: data.summary.available },
                      { name: 'Rented', value: data.summary.rented },
                      { name: 'In Laundry', value: data.summary.inLaundry },
                      { name: 'Damaged', value: data.summary.damaged },
                      { name: 'Unavailable', value: data.summary.unavailable },
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Available', value: data.summary.available },
                      { name: 'Rented', value: data.summary.rented },
                      { name: 'In Laundry', value: data.summary.inLaundry },
                      { name: 'Damaged', value: data.summary.damaged },
                      { name: 'Unavailable', value: data.summary.unavailable },
                    ]
                      .filter(item => item.value > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8884d8" />
                  <Bar dataKey="available" fill="#10b981" />
                  <Bar dataKey="rented" fill="#3b82f6" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Items Table */}
      {reportType === 'detailed' && data.detailedItems && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Rentals</TableHead>
                    <TableHead>Last Rental</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.detailedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.modelName}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.sku} • {item.size} • {item.color}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.modelCategory}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.condition}</Badge>
                      </TableCell>
                      <TableCell>${parseFloat(item.dailyRate).toFixed(2)}</TableCell>
                      <TableCell>{item.rentalCount}</TableCell>
                      <TableCell>
                        {item.lastRentalDate
                          ? format(new Date(item.lastRentalDate), 'MMM dd, yyyy')
                          : 'Never'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Laundry Status */}
      {reportType === 'laundry' && data.laundryItems && (
        <Card>
          <CardHeader>
            <CardTitle>Laundry Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Days in Laundry</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.laundryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.modelName}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.sku} • {item.size} • {item.color}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{item.daysInLaundry} days</span>
                          <Progress value={Math.min((item.daysInLaundry / 3) * 100, 100)} className="w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.isOverdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}