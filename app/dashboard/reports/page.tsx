'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  CalendarIcon,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Download,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { FinancialReport } from '@/components/reports/financial-report';
import { InventoryReport } from '@/components/reports/inventory-report';
import { RentalActivityReport } from '@/components/reports/rental-activity-report';

interface ReportPeriod {
  from: Date;
  to: Date;
}

interface DashboardStats {
  totalRevenue: number;
  activeRentals: number;
  totalCustomers: number;
  lowStockItems: number;
  overdueRentals: number;
  totalTransactions: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardStats();
  }, [period]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Fetch inventory report for basic stats
      const inventoryResponse = await fetch('/api/reports/inventory?type=summary');
      const inventoryData = await inventoryResponse.json();

      // Fetch financial report for revenue stats
      const financialResponse = await fetch(
        `/api/reports/financial?type=summary&startDate=${period.from.toISOString()}&endDate=${period.to.toISOString()}`
      );
      const financialData = await financialResponse.json();

      // Fetch overdue rentals
      const overdueResponse = await fetch('/api/rentals?status=active&limit=100');
      const overdueData = await overdueResponse.json();
      const overdueRentals = overdueData.data?.filter((rental: any) =>
        new Date(rental.expectedReturnDate) < new Date()
      ) || [];

      // Fetch total customers
      const customersResponse = await fetch('/api/customers?isActive=true&limit=1');
      const customersData = await customersResponse.json();

      setStats({
        totalRevenue: financialData.data?.totalRevenue || 0,
        activeRentals: overdueData.data?.filter((r: any) => r.status === 'active')?.length || 0,
        totalCustomers: customersData.pagination?.total || 0,
        lowStockItems: inventoryData.data?.available || 0,
        overdueRentals: overdueRentals.length,
        totalTransactions: financialData.data?.transactionCount || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && trendValue && (
              <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-3 w-3 mr-1 ${trend === 'down' ? 'rotate-180' : ''}`} />
                {trendValue}
              </div>
            )}
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(period.from, 'MMM dd')} - {format(period.to, 'MMM dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-2">
                <div>
                  <Label>From Date</Label>
                  <Calendar
                    mode="single"
                    selected={period.from}
                    onSelect={(date) => date && setPeriod({ ...period, from: date })}
                    initialFocus
                  />
                </div>
                <Separator />
                <div>
                  <Label>To Date</Label>
                  <Calendar
                    mode="single"
                    selected={period.to}
                    onSelect={(date) => date && setPeriod({ ...period, to: date })}
                    initialFocus
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Select
            value="30days"
            onValueChange={(value) => {
              const days = parseInt(value);
              setPeriod({
                from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                to: new Date(),
              });
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="365days">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stats && (
              <>
                <StatCard
                  title="Total Revenue"
                  value={`$${stats.totalRevenue.toLocaleString()}`}
                  icon={DollarSign}
                  trend="up"
                  trendValue="12.5%"
                />
                <StatCard
                  title="Active Rentals"
                  value={stats.activeRentals}
                  icon={Package}
                  trend="up"
                  trendValue="8.2%"
                />
                <StatCard
                  title="Total Customers"
                  value={stats.totalCustomers}
                  icon={Users}
                  trend="up"
                  trendValue="5.1%"
                />
                <StatCard
                  title="Available Items"
                  value={stats.lowStockItems}
                  icon={Package}
                />
                <StatCard
                  title="Overdue Returns"
                  value={stats.overdueRentals}
                  icon={AlertTriangle}
                  trend={stats.overdueRentals > 0 ? 'down' : 'up'}
                />
                <StatCard
                  title="Transactions"
                  value={stats.totalTransactions}
                  icon={TrendingUp}
                  trend="up"
                  trendValue="18.3%"
                />
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Cash', value: 45, fill: '#8884d8' },
                          { name: 'Transfer', value: 30, fill: '#82ca9d' },
                          { name: 'Card', value: 25, fill: '#ffc658' },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {[
                          { name: 'Cash', value: 45, fill: '#8884d8' },
                          { name: 'Transfer', value: 30, fill: '#82ca9d' },
                          { name: 'Card', value: 25, fill: '#ffc658' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New rental created</p>
                      <p className="text-xs text-muted-foreground">John Doe rented Business Suit</p>
                    </div>
                    <span className="text-xs text-muted-foreground">2 min ago</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payment received</p>
                      <p className="text-xs text-muted-foreground">$150.00 cash payment</p>
                    </div>
                    <span className="text-xs text-muted-foreground">15 min ago</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Item returned</p>
                      <p className="text-xs text-muted-foreground">Evening Gown returned to laundry</p>
                    </div>
                    <span className="text-xs text-muted-foreground">1 hour ago</span>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <FinancialReport period={period} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryReport />
        </TabsContent>

        <TabsContent value="rentals">
          <RentalActivityReport period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}