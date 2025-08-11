import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Affiliate, AffiliateStatus, UpdateAffiliateStatusInput } from '../../../../server/src/schema';

interface AffiliateManagementProps {
  onUpdate: () => void;
}

export function AffiliateManagement({ onUpdate }: AffiliateManagementProps) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<AffiliateStatus | 'all'>('all');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  const loadAffiliates = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getAffiliates.query();
      setAffiliates(data);
      setError('');
    } catch (error) {
      console.error('Failed to load affiliates:', error);
      setError('Failed to load affiliates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAffiliates();
  }, [loadAffiliates]);

  const handleStatusUpdate = async (affiliateId: number, status: AffiliateStatus) => {
    try {
      const updateData: UpdateAffiliateStatusInput = {
        affiliate_id: affiliateId,
        status,
        approved_by: 1 // Admin user ID (hardcoded for demo)
      };

      await trpc.updateAffiliateStatus.mutate(updateData);
      await loadAffiliates();
      onUpdate();
      setSelectedAffiliate(null);
    } catch (error) {
      console.error('Failed to update affiliate status:', error);
      setError('Failed to update affiliate status. Please try again.');
    }
  };

  const getStatusColor = (status: AffiliateStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusEmoji = (status: AffiliateStatus) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'suspended': return '🚫';
      default: return '❓';
    }
  };

  const filteredAffiliates = affiliates.filter(affiliate => 
    filter === 'all' || affiliate.status === filter
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
          <h2 className="text-2xl font-bold">👥 Affiliate Management</h2>
          <p className="text-gray-600">Manage affiliate partners and their status</p>
        </div>
        
        <Select 
          value={filter} 
          onValueChange={(value: AffiliateStatus | 'all') => setFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="approved">✅ Approved</SelectItem>
            <SelectItem value="rejected">❌ Rejected</SelectItem>
            <SelectItem value="suspended">🚫 Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAffiliates.map((affiliate) => (
          <Card key={affiliate.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  Affiliate #{affiliate.id}
                </CardTitle>
                <Badge className={getStatusColor(affiliate.status)}>
                  {getStatusEmoji(affiliate.status)} {affiliate.status}
                </Badge>
              </div>
              <CardDescription>
                Referral Code: <span className="font-mono font-bold">{affiliate.referral_code}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Commission Rate</p>
                  <p className="font-semibold">{(affiliate.commission_rate * 100).toFixed(1)}%</p>
                </div>

                {affiliate.bank_name && (
                  <div>
                    <p className="text-sm text-gray-600">Bank Details</p>
                    <p className="text-sm">
                      {affiliate.bank_name} - {affiliate.bank_account_number}
                      <br />
                      {affiliate.bank_account_name}
                    </p>
                  </div>
                )}

                {affiliate.ewallet_type && (
                  <div>
                    <p className="text-sm text-gray-600">E-Wallet</p>
                    <p className="text-sm">
                      {affiliate.ewallet_type}: {affiliate.ewallet_number}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600">Registered</p>
                  <p className="text-sm">{new Date(affiliate.created_at).toLocaleDateString('id-ID')}</p>
                </div>

                {affiliate.approved_at && (
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-sm">{new Date(affiliate.approved_at).toLocaleDateString('id-ID')}</p>
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setSelectedAffiliate(affiliate)}
                    >
                      🔧 Manage Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Affiliate Status</DialogTitle>
                      <DialogDescription>
                        Change the status for Affiliate #{affiliate.id} with referral code {affiliate.referral_code}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Current Status:</p>
                        <Badge className={getStatusColor(affiliate.status)}>
                          {getStatusEmoji(affiliate.status)} {affiliate.status}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Update to:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={affiliate.status === 'approved' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(affiliate.id, 'approved')}
                            disabled={affiliate.status === 'approved'}
                          >
                            ✅ Approve
                          </Button>
                          <Button
                            variant={affiliate.status === 'rejected' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(affiliate.id, 'rejected')}
                            disabled={affiliate.status === 'rejected'}
                          >
                            ❌ Reject
                          </Button>
                          <Button
                            variant={affiliate.status === 'suspended' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(affiliate.id, 'suspended')}
                            disabled={affiliate.status === 'suspended'}
                          >
                            🚫 Suspend
                          </Button>
                          <Button
                            variant={affiliate.status === 'pending' ? 'outline' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusUpdate(affiliate.id, 'pending')}
                            disabled={affiliate.status === 'pending'}
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

      {filteredAffiliates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'No affiliates found' : `No affiliates with status "${filter}"`}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                Show All Affiliates
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}