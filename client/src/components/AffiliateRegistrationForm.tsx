import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { CreateUserInput, CreateAffiliateInput } from '../../../server/src/schema';

interface AffiliateRegistrationFormProps {
  onSuccess: () => void;
}

export function AffiliateRegistrationForm({ onSuccess }: AffiliateRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    ewallet_type: '',
    ewallet_number: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First create user
      const userData: CreateUserInput = {
        email: formData.email,
        password_hash: 'temp_hash', // In real app, this would be properly hashed
        full_name: formData.full_name,
        phone: formData.phone || null,
        role: 'affiliate' as const
      };

      const user = await trpc.createUser.mutate(userData);

      // Then create affiliate profile
      const affiliateData: CreateAffiliateInput = {
        user_id: user.id,
        bank_name: formData.bank_name || null,
        bank_account_number: formData.bank_account_number || null,
        bank_account_name: formData.bank_account_name || null,
        ewallet_type: formData.ewallet_type || null,
        ewallet_number: formData.ewallet_number || null,
        commission_rate: 0.10 // Default 10% commission rate
      };

      await trpc.createAffiliate.mutate(affiliateData);
      onSuccess();
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please check your information and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          🤝 Affiliate Registration
        </CardTitle>
        <CardDescription>
          Join our affiliate program and start earning commissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email address *"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Input
                placeholder="Full name *"
                value={formData.full_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, full_name: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Input
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">💰 Payout Information (Optional)</h4>
              <p className="text-sm text-gray-600">You can update this information later</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Bank name"
                value={formData.bank_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, bank_name: e.target.value }))
                }
              />
              <Input
                placeholder="Account number"
                value={formData.bank_account_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, bank_account_number: e.target.value }))
                }
              />
            </div>

            <div>
              <Input
                placeholder="Account holder name"
                value={formData.bank_account_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, bank_account_name: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={formData.ewallet_type}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, ewallet_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="E-wallet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gopay">GoPay</SelectItem>
                  <SelectItem value="ovo">OVO</SelectItem>
                  <SelectItem value="dana">DANA</SelectItem>
                  <SelectItem value="linkaja">LinkAja</SelectItem>
                  <SelectItem value="shopeepay">ShopeePay</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="E-wallet number"
                value={formData.ewallet_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, ewallet_number: e.target.value }))
                }
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Registering...' : 'Register as Affiliate 🚀'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            <p>💡 After registration, please wait for admin approval</p>
            <p>📧 You'll receive confirmation via email</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}