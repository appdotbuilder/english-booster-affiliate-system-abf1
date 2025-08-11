import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Affiliate, AffiliateStats } from '../../../../server/src/schema';

interface EarningsOverviewProps {
  affiliate: Affiliate;
  stats: AffiliateStats | null;
}

export function EarningsOverview({ affiliate, stats }: EarningsOverviewProps) {
  const formatAmount = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const minPayoutAmount = 100000; // IDR 100,000 minimum payout
  const payoutProgress = stats ? Math.min((stats.available_for_payout / minPayoutAmount) * 100, 100) : 0;
  const canRequestPayout = (stats?.available_for_payout || 0) >= minPayoutAmount;

  const conversionRate = stats && stats.total_registrations > 0 
    ? (stats.confirmed_registrations / stats.total_registrations) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">💰 Earnings Overview</h2>
        <p className="text-gray-600">Track your commission earnings and performance</p>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">💵 Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats?.total_commission_earned || 0)}
            </div>
            <p className="text-sm opacity-90 mt-1">All-time commissions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">💸 Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats?.available_for_payout || 0)}
            </div>
            <p className="text-sm opacity-90 mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">⏳ Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats?.pending_commission || 0)}
            </div>
            <p className="text-sm opacity-90 mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">📊 Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats?.total_commission_paid || 0)}
            </div>
            <p className="text-sm opacity-90 mt-1">Successfully withdrawn</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 Performance Metrics
            </CardTitle>
            <CardDescription>
              Your referral performance statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Referrals</p>
                  <p className="text-2xl font-bold">{stats?.total_registrations || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Confirmed</p>
                  <p className="text-lg font-semibold text-green-600">
                    {stats?.confirmed_registrations || 0}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-sm font-semibold">
                    {conversionRate.toFixed(1)}%
                  </p>
                </div>
                <Progress value={conversionRate} className="h-2" />
              </div>

              <div>
                <p className="text-sm text-gray-600">Commission Rate</p>
                <Badge variant="secondary" className="text-lg font-bold">
                  {(affiliate.commission_rate * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💳 Payout Status
            </CardTitle>
            <CardDescription>
              Track your withdrawal eligibility and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-600">Payout Progress</p>
                  <p className="text-sm font-semibold">
                    {formatAmount(stats?.available_for_payout || 0)} / {formatAmount(minPayoutAmount)}
                  </p>
                </div>
                <Progress value={payoutProgress} className="h-3" />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum payout: {formatAmount(minPayoutAmount)}
                </p>
              </div>

              <div className="space-y-3">
                {canRequestPayout ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600">✅</span>
                      <p className="font-semibold text-green-800">Ready for Payout!</p>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      You can request a payout for {formatAmount(stats?.available_for_payout || 0)}
                    </p>
                    <Button size="sm" className="w-full">
                      💸 Request Payout
                    </Button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600">⏳</span>
                      <p className="font-semibold text-yellow-800">Payout Not Available</p>
                    </div>
                    <p className="text-sm text-yellow-700">
                      You need {formatAmount(minPayoutAmount - (stats?.available_for_payout || 0))} more to request a payout
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Method Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-sm mb-2">💳 Payment Methods</p>
                <div className="space-y-2 text-sm">
                  {affiliate.bank_name && (
                    <div className="flex justify-between">
                      <span>🏦 Bank Transfer:</span>
                      <span>{affiliate.bank_name}</span>
                    </div>
                  )}
                  {affiliate.ewallet_type && (
                    <div className="flex justify-between">
                      <span>📱 E-Wallet:</span>
                      <span>{affiliate.ewallet_type}</span>
                    </div>
                  )}
                  {!affiliate.bank_name && !affiliate.ewallet_type && (
                    <p className="text-gray-500 italic">
                      No payment methods configured. Please update your profile.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Tips */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Earning Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">🎯 Maximize Your Earnings:</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Target specific programs with higher commissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Share authentic testimonials and success stories</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Focus on quality referrals for better conversion</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Follow up with potential students personally</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">📊 Commission Breakdown:</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Your Rate:</span>
                  <span className="font-semibold">{(affiliate.commission_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Min. Payout:</span>
                  <span className="font-semibold">{formatAmount(minPayoutAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Methods:</span>
                  <span className="font-semibold">Bank & E-Wallet</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Time:</span>
                  <span className="font-semibold">1-3 business days</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}