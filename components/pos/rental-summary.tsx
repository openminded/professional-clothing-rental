'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface CartItem {
  id: string;
  inventoryItemId: string;
  sku: string;
  name: string;
  size: string;
  color: string;
  dailyRate: number;
  returnDate: string;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  address?: string;
}

interface RentalSummaryProps {
  cart: CartItem[];
  customer: Customer | null;
  subtotal: number;
  total: number;
}

export function RentalSummary({ cart, customer, subtotal, total }: RentalSummaryProps) {
  const maxReturnDate = cart.length > 0
    ? new Date(Math.max(...cart.map(item => new Date(item.returnDate).getTime())))
    : null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const longestRentalDays = maxReturnDate
    ? Math.ceil((maxReturnDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Rental Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4" />
            Customer
          </div>
          {customer ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800">{customer.name}</div>
              <div className="text-sm text-green-600">{customer.phoneNumber}</div>
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">No customer selected</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Rental Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Rental Period
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Start Date:</span>
              <span>{format(new Date(), 'MMM dd, yyyy')}</span>
            </div>
            {maxReturnDate && (
              <div className="flex justify-between">
                <span>Return Date:</span>
                <span>{format(maxReturnDate, 'MMM dd, yyyy')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{longestRentalDays} days</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Items Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Items Summary
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Items:</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Unique Items:</span>
              <span>{cart.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Daily Rate:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Top Items Preview */}
          {cart.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-2">Items in cart:</div>
              <div className="space-y-1">
                {cart.slice(0, 3).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs px-1">
                        {item.quantity}x
                      </Badge>
                      <span className="truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {item.size} • {item.color}
                    </span>
                  </div>
                ))}
                {cart.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{cart.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Total Amount
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Daily Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Duration:</span>
              <span>{longestRentalDays} days</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={customer ? 'default' : 'secondary'}>
            {customer ? 'Customer Selected' : 'No Customer'}
          </Badge>
          <Badge variant={cart.length > 0 ? 'default' : 'secondary'}>
            {cart.length > 0 ? `${cart.length} Items` : 'Empty Cart'}
          </Badge>
          <Badge variant="outline">
            {longestRentalDays} Days
          </Badge>
        </div>

        {/* Ready for Payment Status */}
        <div className="text-center">
          {cart.length > 0 && customer ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800 font-medium">Ready for Payment</div>
              <div className="text-green-600 text-sm">
                Proceed to payment tab to complete rental
              </div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-yellow-800 font-medium">Information Needed</div>
              <div className="text-yellow-600 text-sm">
                {!cart.length && 'Add items to cart'}
                {cart.length > 0 && !customer && 'Select a customer'}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}