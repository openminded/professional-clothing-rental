'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Plus, Phone, Mail, MapPin, FileText } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  address?: string;
  idNumber?: string;
  notes?: string;
  isActive: boolean;
}

interface CustomerFormProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
}

export function CustomerForm({ selectedCustomer, onCustomerSelect }: CustomerFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    idNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchCustomers();
    }
  }, [searchQuery]);

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.data || []);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phoneNumber) {
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });

      if (response.ok) {
        const data = await response.json();
        onCustomerSelect(data.data);
        setShowNewCustomerForm(false);
        setNewCustomer({
          name: '',
          email: '',
          phoneNumber: '',
          address: '',
          idNumber: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Customer</TabsTrigger>
            <TabsTrigger value="new">New Customer</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            {/* Selected Customer Display */}
            {selectedCustomer ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-800">{selectedCustomer.name}</h3>
                    <p className="text-sm text-green-600">
                      <Phone className="inline h-3 w-3 mr-1" />
                      {selectedCustomer.phoneNumber}
                    </p>
                    {selectedCustomer.email && (
                      <p className="text-sm text-green-600">
                        <Mail className="inline h-3 w-3 mr-1" />
                        {selectedCustomer.email}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCustomerSelect(null as any)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <ScrollArea className="h-[300px]">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No customers found. Try a different search or create a new customer.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customers.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => onCustomerSelect(customer)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{customer.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  <Phone className="inline h-3 w-3 mr-1" />
                                  {customer.phoneNumber}
                                </p>
                                {customer.email && (
                                  <p className="text-sm text-muted-foreground">
                                    <Mail className="inline h-3 w-3 mr-1" />
                                    {customer.email}
                                  </p>
                                )}
                              </div>
                              <Button size="sm">Select</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    value={newCustomer.phoneNumber}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  id="idNumber"
                  value={newCustomer.idNumber}
                  onChange={(e) => setNewCustomer({ ...newCustomer, idNumber: e.target.value })}
                  placeholder="ID123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Additional notes about the customer..."
                  rows={3}
                />
              </div>

              <Button
                onClick={createCustomer}
                disabled={!newCustomer.name || !newCustomer.phoneNumber}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Customer
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}