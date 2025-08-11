import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { CommissionPayout, PayoutStatus, UpdatePayoutStatusInput } from '../../../../server/src/schema';

interface PayoutManagementProps {
  onUpdate: () => void;
}

export function PayoutManagement({ onUpdate }: PayoutManagementProps) {
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<PayoutStatus | 'all'>('all');
  const [selectedPayout, setSelectedPayout] = useState<CommissionPayout | null>(null);
  const [updateNotes, setUpdateNotes] = useState('');

  const loadPayouts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getCommissionPayouts.query();
      setPayouts(data);
      setError('');
    } catch (error) {
      console.error('Failed to load payouts:', error);
      setError('Failed to load payouts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const handleStatusUpdate = async (payoutId: number, status: PayoutStatus, notes?: string) => {
    try {
      const updateData: UpdatePayoutStatusInput = {
        payout_id: payoutId,
        status,
        processed_by: 1, // Admin user ID (hardcoded for demo)
        notes: notes || null
      };

      await trpc.updatePayoutStatus.mutate(updateData);
      await loadPayouts();
      onUpdate();
      setSelectedPayout(null);
      setUpdateNotes('');
    } catch (error) {
      console.error('Failed to update payout status:', error);
      setError('Failed to update payout status. Please try again.');
    }
  };

  const getStatusColor = (status: PayoutStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusEmoji = (status: PayoutStatus) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getMethodEmoji = (method: string) => {
    switch (method) {
      case 'bank_transfer': return '🏦';
      case 'ewallet': return '📱';
      default: return '💳';
    }
  };

  const formatAmount = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const filteredPayouts = payouts.filter(payout => 
    filter === 'all' || payout.status === filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">💰 Commission Payouts</h2>
          <p className="text-gray-600">Manage affiliate commission payments</p>
        </div>
        
        <Select 
          value={filter} 
          onValueChange={(value: PayoutStatus | 'all') => setFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="processing">🔄 Processing</SelectItem>
            <SelectItem value="completed">✅ Completed</SelectItem>
            <SelectItem value="failed">❌ Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPayouts.map((payout) => (
          <Card key={payout.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  💸 Payout #{payout.id}
                </CardTitle>
                <Badge className={getStatusColor(payout.status)}>
                  {getStatusEmoji(payout.status)} {payout.status}
                </Badge>
              </div>
              <CardDescription>
                Affiliate #{payout.affiliate_id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatAmount(payout.amount)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="text-sm font-medium">
                    {getMethodEmoji(payout.method)} {payout.method === 'bank_transfer' ? 'Bank Transfer' : 'E-Wallet'}
                  </p>
                </div>

                {payout.bank_details && (
                  <div>
                    <p className="text-sm text-gray-600">Bank Details</p>
                    <p className="text-sm bg-gray-50 p-2 rounded text-xs">
                      {payout.bank_details}
                    </p>
                  </div>
                )}

                {payout.ewallet_details && (
                  <div>
                    <p className="text-sm text-gray-600">E-Wallet Details</p>
                    <p className="text-sm bg-gray-50 p-2 rounded text-xs">
                      {payout.ewallet_details}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600">Requested</p>
                  <p className="text-sm">{new Date(payout.created_at).toLocaleString('id-ID')}</p>
                </div>

                {payout.processed_at && (
                  <div>
                    <p className="text-sm text-gray-600">Processed</p>
                    <p className="text-sm">{new Date(payout.processed_at).toLocaleString('id-ID')}</p>
                  </div>
                )}

                {payout.notes && (
                  <div>
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-sm bg-gray-50 p-2 rounded">
                      {payout.notes}
                    </p>
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedPayout(payout);
                        setUpdateNotes(payout.notes || '');
                      }}
                    >
                      🔧 Update Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Payout Status</DialogTitle>
                      <DialogDescription>
                        Update status for Payout #{payout.id} - {formatAmount(payout.amount)}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Current Status:</p>
                        <Badge className={getStatusColor(payout.status)}>
                          {getStatusEmoji(payout.status)} {payout.status}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">Payment Details:</p>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <p><strong>Method:</strong> {getMethodEmoji(payout.method)} {payout.method}</p>
                          {payout.bank_details && <p><strong>Bank:</strong> {payout.bank_details}</p>}
                          {payout.ewallet_details && <p><strong>E-Wallet:</strong> {payout.ewallet_details}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Processing Notes (Optional)</label>
                        <Textarea
                          placeholder="Add notes about the payout processing..."
                          value={updateNotes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUpdateNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Update Status:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={payout.status === 'processing' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(payout.id, 'processing', updateNotes)}
                            disabled={payout.status === 'processing'}
                          >
                            🔄 Processing
                          </Button>
                          <Button
                            variant={payout.status === 'completed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(payout.id, 'completed', updateNotes)}
                            disabled={payout.status === 'completed'}
                          >
                            ✅ Complete
                          </Button>
                          <Button
                            variant={payout.status === 'failed' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(payout.id, 'failed', updateNotes)}
                            disabled={payout.status === 'failed'}
                          >
                            ❌ Failed
                          </Button>
                          <Button
                            variant={payout.status === 'pending' ? 'outline' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(payout.id, 'pending', updateNotes)}
                            disabled={payout.status === 'pending'}
                          >
                            ⏳ Pending
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayouts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'No payouts found' : `No payouts with status "${filter}"`}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                Show All Payouts
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}