import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '../../../server/src/schema';

interface HeaderProps {
  user?: User;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <div>
                <h1 className="text-xl font-bold text-blue-600">English Booster</h1>
                <p className="text-xs text-gray-500">Affiliate System</p>
              </div>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{user.full_name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'default'} className="text-xs">
                    {user.role === 'admin' ? '👑 Admin' : '🤝 Affiliate'}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}