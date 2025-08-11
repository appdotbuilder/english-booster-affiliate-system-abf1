import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Affiliate, AffiliateStats, StudentRegistration, CommissionPayout } from '../../../server/src/schema';

// Import affiliate components
import { ReferralTools } from '@/components/affiliate/ReferralTools';
import { EarningsOverview } from '@/components/affiliate/EarningsOverview';
import { StudentList } from '@/components/affiliate/StudentList';
import { PayoutHistory } from '@/components/affiliate/PayoutHistory';

interface AffiliateDashboardProps {
  user: User;
}

export function AffiliateDashboard({ user }: AffiliateDashboardProps) {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAffiliateData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get all affiliates and find the one for this user
      const affiliates = await trpc.getAffiliates.query();
      const userAffiliate = affiliates.find(a => a.user_id === user.id);
      
      if (!userAffiliate) {
        setError('Affiliate profile not found. Please contact support.');
        return;
      }

      setAffiliate(userAffiliate);

      // Get affiliate stats
      const affiliateStats = await trpc.getAffiliateStats.query({
        affiliate_id: userAffiliate.id
      });

      setStats(affiliateStats);
      setError('');
    } catch (error) {
      console.error('Failed to load affiliate data:', error);
      setError('Failed to load affiliate data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadAffiliateData();
  }, [loadAffiliateData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your affiliate dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !affiliate) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error || 'Unable to load affiliate data.'}
          <Button variant="outline" size="sm" className="mt-2" onClick={loadAffiliateData}>
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Check affiliate status
  if (affiliate.status === 'pending') {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              ⏳ Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Your affiliate application is currently under review. Please wait for admin approval.
            </p>
            <p className="text-sm text-gray-500">
              You'll receive an email notification once your account is approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (affiliate.status === 'rejected') {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertDescription>
          Your affiliate application has been rejected. Please contact support for more information.
        </AlertDescription>
      </Alert>
    );
  }

  if (affiliate.status === 'suspended') {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertDescription>
          Your affiliate account has been suspended. Please contact support for assistance.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* Affiliate Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              👥 Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_registrations || 0}</div>
            <p className="text-sm opacity-90">
              {stats?.confirmed_registrations || 0} confirmed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              💰 Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              Rp {(stats?.total_commission_earned || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-sm opacity-90">Total commissions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              💸 Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              Rp {(stats?.available_for_payout || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-sm opacity-90">Ready for payout</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              ⏳ Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.pending_registrations || 0}
            </div>
            <p className="text-sm opacity-90">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Display */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔗 Your Referral Code
          </CardTitle>
          <CardDescription>
            Share this code with potential students to earn commissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              value={affiliate.referral_code}
              readOnly
              className="font-mono text-lg font-bold bg-white"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(affiliate.referral_code);
                alert('Referral code copied to clipboard!');
              }}
            >
              📋 Copy
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            💡 Commission Rate: {(affiliate.commission_rate * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="referral" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="referral">🔗 Referral Tools</TabsTrigger>
          <TabsTrigger value="earnings">💰 Earnings</TabsTrigger>
          <TabsTrigger value="students">👥 My Students</TabsTrigger>
          <TabsTrigger value="payouts">💸 Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="referral">
          <ReferralTools affiliate={affiliate} />
        </TabsContent>

        <TabsContent value="earnings">
          <EarningsOverview affiliate={affiliate} stats={stats} />
        </TabsContent>

        <TabsContent value="students">
          <StudentList affiliate={affiliate} onUpdate={loadAffiliateData} />
        </TabsContent>

        <TabsContent value="payouts">
          <PayoutHistory affiliate={affiliate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}