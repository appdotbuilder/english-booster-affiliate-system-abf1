import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Affiliate, Program } from '../../../../server/src/schema';

interface ReferralToolsProps {
  affiliate: Affiliate;
}

export function ReferralTools({ affiliate }: ReferralToolsProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState('');

  const loadPrograms = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getPrograms.query();
      setPrograms(data.filter(p => p.is_active));
      setError('');
    } catch (error) {
      console.error('Failed to load programs:', error);
      setError('Failed to load programs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const generateReferralLink = (programId?: number) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      ref: affiliate.referral_code,
      ...(programId && { program: programId.toString() })
    });
    return `${baseUrl}/register?${params.toString()}`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'online': return '💻';
      case 'offline_pare': return '🏫';
      case 'group': return '👥';
      case 'branch': return '🏢';
      default: return '📚';
    }
  };

  const calculateCommission = (price: number) => {
    return price * affiliate.commission_rate;
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
      <div>
        <h2 className="text-2xl font-bold mb-2">🔗 Referral Tools</h2>
        <p className="text-gray-600">Generate referral links and share them to earn commissions</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* General Referral Link */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌟 General Referral Link
          </CardTitle>
          <CardDescription>
            Universal link for all programs - Students can choose any program
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={generateReferralLink()}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(generateReferralLink(), 'general')}
                variant={copiedLink === 'general' ? 'default' : 'outline'}
              >
                {copiedLink === 'general' ? '✅ Copied!' : '📋 Copy'}
              </Button>
            </div>
            
            <div className="bg-blue-100 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">📢 How to use this link:</h4>
              <ul className="text-sm space-y-1 text-blue-800">
                <li>• Share on social media (WhatsApp, Instagram, Facebook)</li>
                <li>• Send to friends and family via email or text</li>
                <li>• Students will see all available programs</li>
                <li>• Your referral code will be automatically applied</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program-Specific Links */}
      <div>
        <h3 className="text-xl font-semibold mb-4">📚 Program-Specific Referral Links</h3>
        <p className="text-gray-600 mb-6">
          Direct links to specific programs - Higher conversion rates for targeted promotion
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getCategoryEmoji(program.category)} {program.name}
                  </CardTitle>
                  <Badge variant="outline">
                    {program.location}
                  </Badge>
                </div>
                {program.description && (
                  <CardDescription>{program.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        {formatPrice(program.price)}
                      </p>
                      <p className="text-sm text-gray-600">
                        💰 Your commission: {formatPrice(calculateCommission(program.price))}
                      </p>
                    </div>
                    {program.duration_weeks && (
                      <Badge variant="secondary">
                        {program.duration_weeks} weeks
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={generateReferralLink(program.id)}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generateReferralLink(program.id), `program-${program.id}`)}
                      variant={copiedLink === `program-${program.id}` ? 'default' : 'outline'}
                    >
                      {copiedLink === `program-${program.id}` ? '✅' : '📋'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Marketing Tips */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Marketing Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">📱 Social Media Strategy:</h4>
              <ul className="text-sm space-y-1">
                <li>• Share success stories and testimonials</li>
                <li>• Post about English learning tips</li>
                <li>• Use relevant hashtags (#EnglishBooster, #LearnEnglish)</li>
                <li>• Create engaging content about programs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">👥 Personal Network:</h4>
              <ul className="text-sm space-y-1">
                <li>• Share with friends who want to learn English</li>
                <li>• Talk to colleagues and family members</li>
                <li>• Join English learning communities</li>
                <li>• Attend networking events</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Share Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Quick Share
          </CardTitle>
          <CardDescription>
            Share your general referral link on popular platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = `🚀 Belajar Bahasa Inggris di English Booster! Program berkualitas dengan instruktur berpengalaman. Daftar sekarang: ${generateReferralLink()}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }}
            >
              📱 WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = `🚀 English Booster - Program Bahasa Inggris Terbaik! ${generateReferralLink()}`;
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generateReferralLink())}&quote=${encodeURIComponent(text)}`, '_blank');
              }}
            >
              📘 Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = `🚀 Belajar Bahasa Inggris di English Booster! ${generateReferralLink()}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
              }}
            >
              🐦 Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const subject = 'English Booster - Program Bahasa Inggris Terbaik';
                const body = `Halo!\n\nAku mau share program keren nih untuk belajar bahasa Inggris di English Booster.\n\nMereka punya berbagai program mulai dari online, offline di Pare, group class, sampai program di cabang Malang, Sidoarjo, dan Nganjuk.\n\nKalo kamu tertarik, bisa langsung daftar di: ${generateReferralLink()}\n\nSemoga bermanfaat!`;
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
              }}
            >
              📧 Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}