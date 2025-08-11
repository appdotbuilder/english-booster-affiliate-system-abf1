import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, UserRole } from '../../server/src/schema';

// Import components
import { LoginForm } from '@/components/LoginForm';
import { AdminDashboard } from '@/components/AdminDashboard';
import { AffiliateDashboard } from '@/components/AffiliateDashboard';
import { AffiliateRegistrationForm } from '@/components/AffiliateRegistrationForm';
import { Header } from '@/components/Header';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setShowRegistration(false);
  };

  // Landing page for non-logged in users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              🚀 English Booster
            </h1>
            <p className="text-xl text-gray-600 mb-2">Affiliate Partnership Program</p>
            <p className="text-lg text-gray-500 mb-8">
              Join us and earn commissions by referring students to our English programs
            </p>
            
            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-semibold mb-4">📍 Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="font-medium">📧 Phone:</p>
                  <p className="text-blue-600">082231050500</p>
                </div>
                <div>
                  <p className="font-medium">🌐 Website:</p>
                  <p className="text-blue-600">englishbooster.id</p>
                </div>
                <div>
                  <p className="font-medium">📱 Instagram:</p>
                  <p className="text-blue-600">@kampunginggrisbooster</p>
                </div>
                <div>
                  <p className="font-medium">📍 Address:</p>
                  <p>Jl. Asparaga No.100 Tegalsari, Tulungrejo, Pare, Kediri</p>
                </div>
              </div>
            </div>
          </div>

          {/* Programs Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💻 Online Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-90">
                  Kids, Teen, TOEFL, Easy Peasy, Private General English, Speaking & Grammar Booster
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🏫 Offline (Pare)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-90">
                  2-week to 3-month packages, TOEFL RPL, Cruise Ship preparation
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👥 Group Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-90">
                  English Trip, Special English Day, Tutor Visit
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🏢 Branch Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-90">
                  Malang, Sidoarjo, Nganjuk - Programs for all ages (TK to SMA)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Login/Registration Section */}
          <div className="max-w-md mx-auto">
            {showRegistration ? (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">🤝 Become an Affiliate</h2>
                  <p className="text-gray-600">Join our partner network and start earning</p>
                </div>
                <AffiliateRegistrationForm 
                  onSuccess={() => {
                    setShowRegistration(false);
                    alert('Registration submitted! Please wait for admin approval.');
                  }}
                />
                <div className="text-center mt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowRegistration(false)}
                  >
                    ← Back to Login
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">🔐 Partner Login</h2>
                  <p className="text-gray-600">Access your affiliate dashboard</p>
                </div>
                <LoginForm onLogin={handleLogin} />
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Not an affiliate yet?
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRegistration(true)}
                    className="w-full"
                  >
                    🚀 Join as Affiliate Partner
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for logged-in users
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user.full_name}! 👋
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                  {user.role === 'admin' ? '👑 Admin' : '🤝 Affiliate'}
                </Badge>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Render appropriate dashboard */}
        {user.role === 'admin' ? (
          <AdminDashboard user={user} />
        ) : (
          <AffiliateDashboard user={user} />
        )}
      </div>
    </div>
  );
}

export default App;