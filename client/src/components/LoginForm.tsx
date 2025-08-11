import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User } from '../../../server/src/schema';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await trpc.getUserByEmail.query(email);
      if (user) {
        onLogin(user);
      } else {
        setError('User not found. Please check your email or register as an affiliate.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          🔐 Login
        </CardTitle>
        <CardDescription>
          Enter your email to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <Button type="submit" disabled={isLoading || !email} className="w-full">
            {isLoading ? 'Signing in...' : 'Sign In 🚀'}
          </Button>
        </form>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 font-medium mb-2">📝 Demo Accounts:</p>
          <div className="space-y-1 text-xs text-blue-600">
            <p><strong>Admin:</strong> admin@englishbooster.id</p>
            <p><strong>Affiliate:</strong> affiliate@example.com</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}