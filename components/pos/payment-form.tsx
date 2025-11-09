'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, DollarSign, Smartphone, Receipt, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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

interface PaymentFormProps {
  cart: CartItem[];
  customer: Customer;
  subtotal: number;
  total: number;
  onPaymentComplete: () => void;
}

export function PaymentForm({ cart, customer, subtotal, total, onPaymentComplete }: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState(total.toString());
  const [transactionReference, setTransactionReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [createdRental, setCreatedRental] = useState<any>(null);

  const changeAmount = parseFloat(amountReceived) - total;
  const isFullyPaid = parseFloat(amountReceived) >= total;

  const processPayment = async () => {
    if (!isFullyPaid && paymentMethod !== 'card') {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setProcessing(true);

    try {
      // First create the rental
      const rentalData = {
        customerId: customer.id,
        rentalDuration: Math.max(...cart.map(item => {
          const days = Math.ceil(
            (new Date(item.returnDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return Math.max(1, days);
        })),
        notes: `Payment method: ${paymentMethod}`,
        items: cart.map(item => ({
          inventoryItemId: item.inventoryItemId,
          returnDate: item.returnDate,
        })),
      };

      const rentalResponse = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rentalData),
      });

      if (!rentalResponse.ok) {
        throw new Error('Failed to create rental');
      }

      const rentalResult = await rentalResponse.json();
      const rental = rentalResult.data;

      // Then process the payment
      const paymentData = {
        rentalId: rental.id,
        amount: total,
        method: paymentMethod,
        transactionReference: transactionReference || undefined,
        notes: paymentMethod === 'cash' ? `Cash payment: $${amountReceived}` : undefined,
      };

      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to process payment');
      }

      const paymentResult = await paymentResponse.json();

      setCreatedRental({ ...rental, payment: paymentResult.data });
      setShowReceipt(true);
      toast.success('Payment processed successfully!');
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'transfer':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  if (showReceipt && createdRental) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Rental Receipt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Receipt Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">PROFESSIONAL CLOTHING RENTAL</h2>
              <p className="text-sm text-muted-foreground">Rental Invoice</p>
              <p className="text-xs text-muted-foreground">
                Invoice #{createdRental.id.slice(-8)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </p>
            </div>

            <Separator />

            {/* Customer Information */}
            <div className="space-y-2">
              <h3 className="font-semibold">Customer Information</h3>
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {customer.name}</p>
                <p><strong>Phone:</strong> {customer.phoneNumber}</p>
                {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
                {customer.address && <p><strong>Address:</strong> {customer.address}</p>}
              </div>
            </div>

            <Separator />

            {/* Rental Items */}
            <div className="space-y-2">
              <h3 className="font-semibold">Rented Items</h3>
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const days = Math.ceil(
                    (new Date(item.returnDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const itemTotal = item.dailyRate * item.quantity * days;

                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.sku} • {item.size} • {item.color} • {item.quantity}x • {days} days
                        </p>
                      </div>
                      <div className="text-right">
                        <p>${itemTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-2">
              <h3 className="font-semibold">Payment Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="capitalize">{paymentMethod}</span>
                </div>
                {paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between">
                      <span>Amount Received:</span>
                      <span>${parseFloat(amountReceived).toFixed(2)}</span>
                    </div>
                    {changeAmount > 0 && (
                      <div className="flex justify-between font-semibold">
                        <span>Change:</span>
                        <span>${changeAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total Paid:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rental Details */}
            <div className="space-y-2">
              <h3 className="font-semibold">Rental Details</h3>
              <div className="text-sm space-y-1">
                <p><strong>Rental ID:</strong> {createdRental.id}</p>
                <p><strong>Expected Return:</strong> {Math.max(...cart.map(item => new Date(item.returnDate).toLocaleDateString()))}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Please keep this receipt for your records. Items must be returned in good condition.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => window.print()} className="flex-1">
                <Receipt className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={onPaymentComplete} variant="outline" className="flex-1">
                New Rental
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Items:</span>
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
            </div>
            <div className="flex justify-between">
              <span>Rental Period:</span>
              <span>
                {Math.max(...cart.map(item => {
                  const days = Math.ceil(
                    (new Date(item.returnDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return Math.max(1, days);
                }))} days
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <Label>Payment Method</Label>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                <DollarSign className="h-4 w-4" />
                <span>Cash</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer">
              <RadioGroupItem value="transfer" id="transfer" />
              <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                <Smartphone className="h-4 w-4" />
                <span>Bank Transfer</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-4 w-4" />
                <span>Credit/Debit Card</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Payment Details */}
        {paymentMethod === 'cash' && (
          <div className="space-y-3">
            <Label htmlFor="amountReceived">Amount Received</Label>
            <Input
              id="amountReceived"
              type="number"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              step="0.01"
            />
            {parseFloat(amountReceived) > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Change to give:</span>
                  <span className={`font-semibold ${changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(changeAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {(paymentMethod === 'transfer' || paymentMethod === 'card') && (
          <div className="space-y-3">
            <Label htmlFor="transactionReference">Transaction Reference (Optional)</Label>
            <Input
              id="transactionReference"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="Enter transaction ID or reference"
            />
          </div>
        )}

        {!isFullyPaid && paymentMethod !== 'card' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please enter the full payment amount to continue.
            </AlertDescription>
          </Alert>
        )}

        {/* Process Payment Button */}
        <Button
          onClick={processPayment}
          disabled={processing || (!isFullyPaid && paymentMethod !== 'card')}
          className="w-full"
          size="lg"
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {getPaymentIcon(paymentMethod)}
              Process Payment - ${total.toFixed(2)}
            </div>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          By processing this payment, you confirm that the customer has agreed to the rental terms and conditions.
        </div>
      </CardContent>
    </Card>
  );
}