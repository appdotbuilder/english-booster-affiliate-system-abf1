import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Affiliate, Program, StudentRegistration, CommissionPayout } from '../../../server/src/schema';

// Import admin components
import { ProgramManagement } from '@/components/admin/ProgramManagement';
import { AffiliateManagement } from '@/components/admin/AffiliateManagement';
import { RegistrationManagement } from '@/components/admin/RegistrationManagement';
import { PayoutManagement } from '@/components/admin/PayoutManagement';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    pendingAffiliates: 0,
    totalPrograms: 0,
    totalRegistrations: 0,
    pendingRegistrations: 0,
    pendingPayouts: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [affiliates, programs, registrations, payouts] = await Promise.all([
        trpc.getAffiliates.query(),
        trpc.getPrograms.query(),
        trpc.getRegistrations.query(),
        trpc.getCommissionPayouts.query()
      ]);

      setStats({
        totalAffiliates: affiliates.length,
        pendingAffiliates: affiliates.filter(a => a.status === 'pending').length,
        totalPrograms: programs.length,
        totalRegistrations: registrations.length,
        pendingRegistrations: registrations.filter(r => r.status === 'pending').length,
        pendingPayouts: payouts.filter(p => p.status === 'pending').length
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-8">
      {/* Admin Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              👥 Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAffiliates}</div>
            {stats.pendingAffiliates > 0 && (
              <Badge variant="secondary" className="mt-2">
                {stats.pendingAffiliates} pending approval
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              📚 Programs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPrograms}</div>
            <p className="text-sm opacity-90">Active programs</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              📝 Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRegistrations}</div>
            {stats.pendingRegistrations > 0 && (
              <Badge variant="secondary" className="mt-2">
                {stats.pendingRegistrations} pending
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              💰 Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingPayouts}</div>
            <p className="text-sm opacity-90">Pending payouts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              📊 Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={loadStats}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Loading...' : '🔄 Refresh Stats'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="programs">📚 Programs</TabsTrigger>
          <TabsTrigger value="affiliates">
            👥 Affiliates
            {stats.pendingAffiliates > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {stats.pendingAffiliates}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="registrations">
            📝 Registrations
            {stats.pendingRegistrations > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {stats.pendingRegistrations}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payouts">
            💰 Payouts
            {stats.pendingPayouts > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {stats.pendingPayouts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          <ProgramManagement onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="affiliates">
          <AffiliateManagement onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="registrations">
          <RegistrationManagement onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="payouts">
          <PayoutManagement onUpdate={loadStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}