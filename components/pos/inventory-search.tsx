'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, Eye, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  sku: string;
  size: string;
  color: string;
  status: string;
  condition: string;
  modelName: string;
  modelCategory: string;
  modelBrand: string;
  dailyRate: string;
  imageUrl?: string;
}

interface InventorySearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddToCart: (item: InventoryItem) => void;
  cartItems: any[];
}

export function InventorySearch({ searchQuery, onSearchChange, onAddToCart, cartItems }: InventorySearchProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('available');

  useEffect(() => {
    fetchItems();
  }, [searchQuery, category, status]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        status,
        limit: '50',
      });

      if (category !== 'all') {
        params.append('category', category);
      }

      const response = await fetch(`/api/inventory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const isInCart = (itemId: string) => {
    return cartItems.some(cartItem => cartItem.inventoryItemId === itemId);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Search
        </CardTitle>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU, name, size, color..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Suits">Suits</SelectItem>
              <SelectItem value="Dresses">Dresses</SelectItem>
              <SelectItem value="Shirts">Shirts</SelectItem>
              <SelectItem value="Pants">Pants</SelectItem>
              <SelectItem value="Accessories">Accessories</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="all">All Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || category !== 'all' || status !== 'available'
                ? 'No items found matching your criteria.'
                : 'No available items in inventory.'}
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-4 p-4 border rounded-lg transition-colors hover:bg-muted/50",
                    isInCart(item.id) && "bg-muted/50 border-muted-foreground/20"
                  )}
                >
                  {/* Image */}
                  <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.modelName}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{item.modelName}</h3>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.size}</Badge>
                          <Badge variant="outline">{item.color}</Badge>
                          <Badge variant="outline">{item.condition}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${parseFloat(item.dailyRate).toFixed(2)}/day</div>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {item.modelBrand && (
                      <p className="text-sm text-muted-foreground">{item.modelBrand}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => onAddToCart(item)}
                      disabled={item.status !== 'available' || isInCart(item.id)}
                    >
                      {isInCart(item.id) ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          In Cart
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}