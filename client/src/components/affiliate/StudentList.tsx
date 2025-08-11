import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Affiliate, StudentRegistration, RegistrationStatus } from '../../../../server/src/schema';

interface StudentListProps {
  affiliate: Affiliate;
  onUpdate: () => void;
}

export function StudentList({ affiliate, onUpdate }: StudentListProps) {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RegistrationStatus | 'all'>('all');

  const loadRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
      // Get registrations for this affiliate only
      const data = await trpc.getRegistrations.query(affiliate.id);
      setRegistrations(data);
      setError('');
    } catch (error) {
      console.error('Failed to load registrations:', error);
      setError('Failed to load student registrations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [affiliate.id]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const getStatusColor = (status: RegistrationStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusEmoji = (status: RegistrationStatus) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  };

  const formatAmount = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const filteredRegistrations = registrations.filter(registration => 
    filter === 'all' || registration.status === filter
  );

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    cancelled: registrations.filter(r => r.status === 'cancelled').length,
    totalCommission: registrations
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + r.commission_amount, 0),
    pendingCommission: registrations
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.commission_amount, 0)
  };

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
          <h2 className="text-2xl font-bold">👥 My Students</h2>
          <p className="text-gray-600">Track all students you've referred</p>
        </div>
        
        <Select 
          value={filter} 
          onValueChange={(value: RegistrationStatus | 'all') => setFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="confirmed">✅ Confirmed</SelectItem>
            <SelectItem value="cancelled">❌ Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-gray-600">Total Students</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <p className="text-sm text-gray-600">Confirmed</p>
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
              {formatAmount(stats.totalCommission)}
            </div>
            <p className="text-sm text-gray-600">Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <div className="space-y-4">
        {filteredRegistrations.map((registration) => (
          <Card key={registration.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">👤 {registration.student_name}</CardTitle>
                  <CardDescription>
                    Registration #{registration.id} • Program #{registration.program_id}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(registration.status)}>
                  {getStatusEmoji(registration.status)} {registration.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Contact Information</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm font-medium">📧 {registration.student_email}</p>
                    <p className="text-sm font-medium">📱 {registration.student_phone}</p>
                  </div>
                </div>

                {registration.student_address && (
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="text-sm mt-1">{registration.student_address}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600">Financial Details</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-500">Fee:</span>{' '}
                      <span className="font-semibold text-blue-600">
                        {formatAmount(registration.registration_fee)}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Commission:</span>{' '}
                      <span className="font-semibold text-green-600">
                        {formatAmount(registration.commission_amount)}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Timeline</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-500">Registered:</span>{' '}
                      <span className="font-medium">
                        {new Date(registration.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </p>
                    {registration.confirmed_at && (
                      <p className="text-sm">
                        <span className="text-gray-500">Confirmed:</span>{' '}
                        <span className="font-medium text-green-600">
                          {new Date(registration.confirmed_at).toLocaleDateString('id-ID')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRegistrations.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mb-4">
              {filter === 'all' ? '👥' : getStatusEmoji(filter as RegistrationStatus)}
            </div>
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? 'No students found. Start sharing your referral links to get your first referrals!' 
                : `No students with status "${filter}"`}
            </p>
            {filter !== 'all' && (
              <button 
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Show All Students
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips for Better Results */}
      {registrations.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💡 Tips for Better Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">🎯 Improve Conversion Rate:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Follow up with pending students personally</li>
                  <li>• Answer questions about programs promptly</li>
                  <li>• Share testimonials from successful students</li>
                  <li>• Offer to help with the registration process</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📈 Get More Referrals:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Ask confirmed students to refer their friends</li>
                  <li>• Share success stories on social media</li>
                  <li>• Create valuable English learning content</li>
                  <li>• Engage with English learning communities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}