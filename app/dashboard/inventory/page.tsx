'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Package, Filter, RefreshCw } from 'lucide-react';

interface InventoryItem {
  id: string;
  modelId: string;
  sku: string;
  size: string;
  color: string;
  status: string;
  condition: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  modelName: string;
  modelCategory: string;
  modelBrand: string;
  dailyRate: string;
  imageUrl?: string;
}

interface ClothingModel {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  dailyRate: string;
  lateFeeRate: string;
  imageUrl?: string;
  isActive: boolean;
  totalItems: number;
  availableItems: number;
}

export default function InventoryManagementPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [models, setModels] = useState<ClothingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('items');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    if (activeTab === 'items') {
      fetchItems();
    } else {
      fetchModels();
    }
  }, [activeTab, searchQuery, statusFilter, categoryFilter, pagination.page]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/inventory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
        setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        limit: '50',
      });

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(`/api/models?${params}`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clothing models:', error);
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

  const handleQuickStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchItems(); // Refresh the data
      }
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const StatsCard = ({ title, value, color }: { title: string; value: string | number; color: string }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Package className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => activeTab === 'items' ? fetchItems() : fetchModels()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
              </DialogHeader>
              {/* Add item form would go here */}
              <div className="text-center py-8 text-muted-foreground">
                Add item form coming soon...
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="models">Clothing Models</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {items.length > 0 && (
              <>
                <StatsCard
                  title="Total Items"
                  value={items.length}
                  color="bg-blue-500"
                />
                <StatsCard
                  title="Available"
                  value={items.filter(i => i.status === 'available').length}
                  color="bg-green-500"
                />
                <StatsCard
                  title="Rented"
                  value={items.filter(i => i.status === 'rented').length}
                  color="bg-blue-500"
                />
                <StatsCard
                  title="In Laundry"
                  value={items.filter(i => i.status === 'in_laundry').length}
                  color="bg-yellow-500"
                />
                <StatsCard
                  title="Damaged"
                  value={items.filter(i => i.status === 'damaged').length}
                  color="bg-red-500"
                />
              </>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by SKU, name, size, color..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="in_laundry">In Laundry</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Suits">Suits</SelectItem>
                    <SelectItem value="Dresses">Dresses</SelectItem>
                    <SelectItem value="Shirts">Shirts</SelectItem>
                    <SelectItem value="Pants">Pants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items found matching your criteria.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Daily Rate</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.modelName}
                                    className="w-full h-full object-cover rounded-md"
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{item.modelName}</div>
                                <div className="text-sm text-muted-foreground">{item.modelBrand}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{item.size}</Badge>
                              <Badge variant="outline">{item.color}</Badge>
                              <Badge variant="outline">{item.condition}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.status}
                              onValueChange={(value) => handleQuickStatusUpdate(item.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue>
                                  <Badge className={getStatusColor(item.status)}>
                                    {item.status.replace('_', ' ')}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="rented">Rented</SelectItem>
                                <SelectItem value="in_laundry">In Laundry</SelectItem>
                                <SelectItem value="unavailable">Unavailable</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>${parseFloat(item.dailyRate).toFixed(2)}</TableCell>
                          <TableCell>
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clothing Models</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : models.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No clothing models found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Daily Rate</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                {model.imageUrl ? (
                                  <img
                                    src={model.imageUrl}
                                    alt={model.name}
                                    className="w-full h-full object-cover rounded-md"
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{model.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {model.description?.slice(0, 50)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{model.category}</TableCell>
                          <TableCell>{model.brand || '-'}</TableCell>
                          <TableCell>${parseFloat(model.dailyRate).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{model.availableItems} / {model.totalItems} available</div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{
                                    width: `${model.totalItems > 0 ? (model.availableItems / model.totalItems) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={model.isActive ? 'default' : 'secondary'}>
                              {model.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}