import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { StudentRegistration, RegistrationStatus, UpdateRegistrationStatusInput } from '../../../../server/src/schema';

interface RegistrationManagementProps {
  onUpdate: () => void;
}

export function RegistrationManagement({ onUpdate }: RegistrationManagementProps) {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RegistrationStatus | 'all'>('all');

  const loadRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getRegistrations.query();
      setRegistrations(data);
      setError('');
    } catch (error) {
      console.error('Failed to load registrations:', error);
      setError('Failed to load registrations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const handleStatusUpdate = async (registrationId: number, status: RegistrationStatus) => {
    try {
      const updateData: UpdateRegistrationStatusInput = {
        registration_id: registrationId,
        status,
        confirmed_by: 1 // Admin user ID (hardcoded for demo)
      };

      await trpc.updateRegistrationStatus.mutate(updateData);
      await loadRegistrations();
      onUpdate();
    } catch (error) {
      console.error('Failed to update registration status:', error);
      setError('Failed to update registration status. Please try again.');
    }
  };

  const getStatusColor = (status: RegistrationStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const filteredRegistrations = registrations.filter(registration => 
    filter === 'all' || registration.status === filter
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
          <h2 className="text-2xl font-bold">📝 Student Registrations</h2>
          <p className="text-gray-600">Manage student registrations and confirmations</p>
        </div>
        
        <Select 
          value={filter} 
          onValueChange={(value: RegistrationStatus | 'all') => setFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRegistrations.map((registration) => (
          <Card key={registration.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  👤 {registration.student_name}
                </CardTitle>
                <Badge className={getStatusColor(registration.status)}>
                  {getStatusEmoji(registration.status)} {registration.status}
                </Badge>
              </div>
              <CardDescription>
                Registration #{registration.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm font-medium">{registration.student_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-sm font-medium">{registration.student_phone}</p>
                  </div>
                </div>

                {registration.student_address && (
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="text-sm">{registration.student_address}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Referral Code</p>
                    <p className="text-sm font-mono font-bold">{registration.referral_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Program ID</p>
                    <p className="text-sm font-medium">#{registration.program_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Registration Fee</p>
                    <p className="text-sm font-bold text-blue-600">
                      {formatPrice(registration.registration_fee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commission</p>
                    <p className="text-sm font-bold text-green-600">
                      {formatPrice(registration.commission_amount)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Registered</p>
                  <p className="text-sm">{new Date(registration.created_at).toLocaleString('id-ID')}</p>
                </div>

                {registration.confirmed_at && (
                  <div>
                    <p className="text-sm text-gray-600">Confirmed</p>
                    <p className="text-sm">{new Date(registration.confirmed_at).toLocaleString('id-ID')}</p>
                  </div>
                )}

                {registration.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(registration.id, 'confirmed')}
                      className="flex-1"
                    >
                      ✅ Confirm
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStatusUpdate(registration.id, 'cancelled')}
                      className="flex-1"
                    >
                      ❌ Cancel
                    </Button>
                  </div>
                )}

                {registration.status !== 'pending' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        🔧 Change Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Registration Status</DialogTitle>
                        <DialogDescription>
                          Change status for {registration.student_name}'s registration
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Current Status:</p>
                          <Badge className={getStatusColor(registration.status)}>
                            {getStatusEmoji(registration.status)} {registration.status}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Update to:</p>
                          <div className="flex gap-2">
                            <Button
                              variant={registration.status === 'confirmed' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleStatusUpdate(registration.id, 'confirmed')}
                              disabled={registration.status === 'confirmed'}
                            >
                              ✅ Confirm
                            </Button>
                            <Button
                              variant={registration.status === 'cancelled' ? 'destructive' : 'outline'}
                              size="sm"
                              onClick={() => handleStatusUpdate(registration.id, 'cancelled')}
                              disabled={registration.status === 'cancelled'}
                            >
                              ❌ Cancel
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(registration.id, 'pending')}
                            >
                              ⏳ Reset to Pending
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRegistrations.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'No registrations found' : `No registrations with status "${filter}"`}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                Show All Registrations
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}