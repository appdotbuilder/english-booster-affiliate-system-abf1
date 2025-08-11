import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Affiliate, CommissionPayout, PayoutStatus, CreateCommissionPayoutInput } from '../../../../server/src/schema';

interface PayoutHistoryProps {
  affiliate: Affiliate;
}

export function PayoutHistory({ affiliate }: PayoutHistoryProps) {
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<PayoutStatus | 'all'>('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');

  const loadPayouts = useCallback(async () => {
    try {
      setIsLoading(true);
      // Get payouts for this affiliate only
      const data = await trpc.getCommissionPayouts.query(affiliate.id);
      setPayouts(data);
      setError('');
    } catch (error) {
      console.error('Failed to load payouts:', error);
      setError('Failed to load payout history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [affiliate.id]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(requestAmount);
    
    if (amount < 100000) {
      setError('Minimum payout amount is Rp 100,000');
      return;
    }

    try {
      const payoutData: CreateCommissionPayoutInput = {
        affiliate_id: affiliate.id,
        amount,
        method: affiliate.bank_name ? 'bank_transfer' : 'ewallet',
        bank_details: affiliate.bank_name ? 
          `${affiliate.bank_name} - ${affiliate.bank_account_number} - ${affiliate.bank_account_name}` : null,
        ewallet_details: affiliate.ewallet_type ? 
          `${affiliate.ewallet_type} - ${affiliate.ewallet_number}` : null,
        notes: null
      };

      await trpc.createCommissionPayout.mutate(payoutData);
      setShowRequestForm(false);
      setRequestAmount('');
      await loadPayouts();
    } catch (error) {
      console.error('Failed to request payout:', error);
      setError('Failed to request payout. Please try again.');
    }
  };

  const getStatusColor = (status: PayoutStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const stats = {
    total: payouts.length,
    totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
    completed: payouts.filter(p => p.status === 'completed').length,
    completedAmount: payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pending: payouts.filter(p => p.status === 'pending' || p.status === 'processing').length
  };

  const canRequestPayout = affiliate.bank_name || affiliate.ewallet_type;

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
          <h2 className="text-2xl font-bold">💸 Payout History</h2>
          <p className="text-gray-600">Track your commission withdrawals</p>
        </div>
        
        <div className="flex gap-2">
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

          {canRequestPayout && (
            <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
              <DialogTrigger asChild>
                <Button>💸 Request Payout</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Commission Payout</DialogTitle>
                  <DialogDescription>
                    Request a withdrawal of your earned commissions
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handlePayoutRequest} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Amount (IDR)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount (min. 100,000)"
                      value={requestAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequestAmount(e.target.value)}
                      min="100000"
                      step="1000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum payout amount is Rp 100,000
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Payment Method:</p>
                    {affiliate.bank_name && (
                      <div className="text-sm">
                        <p>🏦 <strong>Bank Transfer</strong></p>
                        <p>{affiliate.bank_name} - {affiliate.bank_account_number}</p>
                        <p>{affiliate.bank_account_name}</p>
                      </div>
                    )}
                    {affiliate.ewallet_type && (
                      <div className="text-sm mt-2">
                        <p>📱 <strong>E-Wallet</strong></p>
                        <p>{affiliate.ewallet_type} - {affiliate.ewallet_number}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">Request Payout</Button>
                    <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!canRequestPayout && (
        <Alert>
          <AlertDescription>
            Please add your bank account or e-wallet details in your profile to request payouts.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-gray-600">Total Requests</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-gray-600">Pending</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-xl font-bold text-green-700">
              {formatAmount(stats.completedAmount)}
            </div>
            <p className="text-sm text-gray-600">Total Received</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout List */}
      <div className="space-y-4">
        {filteredPayouts.map((payout) => (
          <Card key={payout.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">💸 Payout #{payout.id}</CardTitle>
                  <CardDescription>
                    {formatAmount(payout.amount)} via {getMethodEmoji(payout.method)} {payout.method}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(payout.status)}>
                  {getStatusEmoji(payout.status)} {payout.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatAmount(payout.amount)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Payment Details</p>
                  <div className="text-sm mt-1">
                    {payout.bank_details && (
                      <p className="bg-gray-50 p-2 rounded text-xs">
                        🏦 {payout.bank_details}
                      </p>
                    )}
                    {payout.ewallet_details && (
                      <p className="bg-gray-50 p-2 rounded text-xs">
                        📱 {payout.ewallet_details}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Timeline</p>
                  <div className="text-sm mt-1 space-y-1">
                    <p>
                      <span className="text-gray-500">Requested:</span>{' '}
                      {new Date(payout.created_at).toLocaleDateString('id-ID')}
                    </p>
                    {payout.processed_at && (
                      <p>
                        <span className="text-gray-500">Processed:</span>{' '}
                        <span className="text-green-600 font-medium">
                          {new Date(payout.processed_at).toLocaleDateString('id-ID')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {payout.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Admin Notes:</p>
                  <p className="text-sm">{payout.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayouts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mb-4">💸</div>
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? 'No payout requests yet. Once you earn commissions, you can request withdrawals here.' 
                : `No payouts with status "${filter}"`}
            </p>
            {filter !== 'all' && (
              <button 
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Show All Payouts
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout Information */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ℹ️ Payout Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">💰 Payout Details:</h4>
              <ul className="text-sm space-y-2">
                <li className="flex justify-between">
                  <span>Minimum Amount:</span>
                  <span className="font-semibold">Rp 100,000</span>
                </li>
                <li className="flex justify-between">
                  <span>Processing Time:</span>
                  <span className="font-semibold">1-3 business days</span>
                </li>
                <li className="flex justify-between">
                  <span>Available Methods:</span>
                  <span className="font-semibold">Bank & E-Wallet</span>
                </li>
                <li className="flex justify-between">
                  <span>Processing Days:</span>
                  <span className="font-semibold">Monday - Friday</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">🔔 Important Notes:</h4>
              <ul className="text-sm space-y-1">
                <li>• Payouts are processed during business hours</li>
                <li>• Ensure your payment details are correct</li>
                <li>• Failed payouts will be automatically retried</li>
                <li>• Contact support for payout issues</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}