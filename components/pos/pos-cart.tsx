'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface CartItem {
  id: string;
  inventoryItemId: string;
  sku: string;
  name: string;
  size: string;
  color: string;
  dailyRate: number;
  imageUrl?: string;
  returnDate: string;
  quantity: number;
}

interface POSCartProps {
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateReturnDate: (id: string, returnDate: string) => void;
  subtotal: number;
  total: number;
}

export function POSCart({
  cart,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateReturnDate,
  subtotal,
  total,
}: POSCartProps) {
  const calculateItemTotal = (item: CartItem) => {
    const days = Math.ceil(
      (new Date(item.returnDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return item.dailyRate * item.quantity * Math.max(1, days);
  };

  const getMinReturnDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (cart.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shopping Cart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <p>Your cart is empty</p>
            <p className="text-sm">Add items from inventory to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Shopping Cart
          <Badge variant="outline">{cart.length} items</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                {/* Item Image */}
                <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No img</span>
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.name}</h4>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">{item.size}</Badge>
                    <Badge variant="outline" className="text-xs">{item.color}</Badge>
                  </div>
                  <p className="text-sm font-medium mt-1">
                    ${item.dailyRate.toFixed(2)}/day
                  </p>
                </div>

                {/* Quantity and Controls */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-12 h-8 text-center text-sm"
                      min="1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Return Date */}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <Input
                      type="date"
                      value={item.returnDate}
                      onChange={(e) => onUpdateReturnDate(item.id, e.target.value)}
                      min={getMinReturnDate()}
                      className="h-6 text-xs"
                    />
                  </div>

                  {/* Remove Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Cart Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Rental Duration</span>
            <span>
              {cart.length > 0
                ? Math.max(
                    ...cart.map(item =>
                      Math.ceil(
                        (new Date(item.returnDate).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                      )
                    )
                  )
                : 0}{' '}
              days
            </span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}