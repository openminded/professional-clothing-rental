'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Minus, User, Package, Calendar, CreditCard, Receipt } from 'lucide-react';
import { POSCart } from '@/components/pos/pos-cart';
import { InventorySearch } from '@/components/pos/inventory-search';
import { CustomerForm } from '@/components/pos/customer-form';
import { PaymentForm } from '@/components/pos/payment-form';
import { RentalSummary } from '@/components/pos/rental-summary';

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

interface Customer {
  id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  address?: string;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.dailyRate * item.quantity), 0);
  const rentalDuration = 1; // Default to 1 day, will be calculated based on return dates
  const total = subtotal * rentalDuration;

  const addToCart = (item: any) => {
    const existingItem = cart.find(cartItem => cartItem.inventoryItemId === item.id);

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.inventoryItemId === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        inventoryItemId: item.id,
        sku: item.sku,
        name: item.modelName,
        size: item.size,
        color: item.color,
        dailyRate: parseFloat(item.dailyRate),
        imageUrl: item.imageUrl,
        returnDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        quantity: 1,
      };
      setCart([...cart, newItem]);
    }
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter(item => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCart(cart.map(item =>
        item.id === cartItemId ? { ...item, quantity } : item
      ));
    }
  };

  const updateReturnDate = (cartItemId: string, returnDate: string) => {
    setCart(cart.map(item =>
      item.id === cartItemId ? { ...item, returnDate } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setActiveTab('items');
  };

  const canProceedToPayment = cart.length > 0 && selectedCustomer;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Point of Sale</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {cart.length} items
          </Badge>
          {selectedCustomer && (
            <Badge variant="secondary" className="text-sm">
              <User className="w-3 h-3 mr-1" />
              {selectedCustomer.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="payment" disabled={!canProceedToPayment}>
                Payment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              <InventorySearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddToCart={addToCart}
                cartItems={cart}
              />
            </TabsContent>

            <TabsContent value="customer" className="space-y-4">
              <CustomerForm
                selectedCustomer={selectedCustomer}
                onCustomerSelect={setSelectedCustomer}
              />
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              {canProceedToPayment ? (
                <PaymentForm
                  cart={cart}
                  customer={selectedCustomer}
                  subtotal={subtotal}
                  total={total}
                  onPaymentComplete={clearCart}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Please add items to cart and select a customer to proceed to payment.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right side - Cart and Summary */}
        <div className="space-y-6">
          <POSCart
            cart={cart}
            onRemoveItem={removeFromCart}
            onUpdateQuantity={updateQuantity}
            onUpdateReturnDate={updateReturnDate}
            subtotal={subtotal}
            total={total}
          />

          {cart.length > 0 && (
            <RentalSummary
              cart={cart}
              customer={selectedCustomer}
              subtotal={subtotal}
              total={total}
            />
          )}
        </div>
      </div>
    </div>
  );
}