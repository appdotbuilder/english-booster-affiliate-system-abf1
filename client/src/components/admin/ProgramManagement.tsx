import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Program, CreateProgramInput, ProgramCategory, ProgramLocation } from '../../../../server/src/schema';

interface ProgramManagementProps {
  onUpdate: () => void;
}

export function ProgramManagement({ onUpdate }: ProgramManagementProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateProgramInput>({
    name: '',
    description: null,
    category: 'online' as ProgramCategory,
    location: 'online' as ProgramLocation,
    price: 0,
    duration_weeks: null,
    is_active: true
  });

  const loadPrograms = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getPrograms.query();
      setPrograms(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trpc.createProgram.mutate(formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: null,
        category: 'online' as ProgramCategory,
        location: 'online' as ProgramLocation,
        price: 0,
        duration_weeks: null,
        is_active: true
      });
      await loadPrograms();
      onUpdate();
    } catch (error) {
      console.error('Failed to create program:', error);
      setError('Failed to create program. Please try again.');
    }
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const getCategoryEmoji = (category: ProgramCategory) => {
    switch (category) {
      case 'online': return '💻';
      case 'offline_pare': return '🏫';
      case 'group': return '👥';
      case 'branch': return '🏢';
      default: return '📚';
    }
  };

  const getLocationEmoji = (location: ProgramLocation) => {
    switch (location) {
      case 'online': return '🌐';
      case 'pare': return '🏫';
      case 'malang': return '🏢';
      case 'sidoarjo': return '🏢';
      case 'nganjuk': return '🏢';
      default: return '📍';
    }
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
          <h2 className="text-2xl font-bold">📚 Program Management</h2>
          <p className="text-gray-600">Manage English Booster programs and courses</p>
        </div>
        
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>➕ Add New Program</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Program</DialogTitle>
              <DialogDescription>
                Add a new program to the English Booster catalog
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Program name *"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                required
              />

              <Textarea
                placeholder="Program description (optional)"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData(prev => ({ ...prev, description: e.target.value || null }))
                }
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formData.category}
                  onValueChange={(value: ProgramCategory) =>
                    setFormData(prev => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">💻 Online</SelectItem>
                    <SelectItem value="offline_pare">🏫 Offline (Pare)</SelectItem>
                    <SelectItem value="group">👥 Group</SelectItem>
                    <SelectItem value="branch">🏢 Branch</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={formData.location}
                  onValueChange={(value: ProgramLocation) =>
                    setFormData(prev => ({ ...prev, location: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">🌐 Online</SelectItem>
                    <SelectItem value="pare">🏫 Pare</SelectItem>
                    <SelectItem value="malang">🏢 Malang</SelectItem>
                    <SelectItem value="sidoarjo">🏢 Sidoarjo</SelectItem>
                    <SelectItem value="nganjuk">🏢 Nganjuk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Price (IDR) *"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }
                  min="0"
                  step="1000"
                  required
                />

                <Input
                  type="number"
                  placeholder="Duration (weeks)"
                  value={formData.duration_weeks || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) || null }))
                  }
                  min="1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <span className="text-sm">Program is active</span>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">Create Program</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <Card key={program.id} className={!program.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getCategoryEmoji(program.category)} {program.name}
                </CardTitle>
                <Badge variant={program.is_active ? 'default' : 'secondary'}>
                  {program.is_active ? '✅ Active' : '⏸️ Inactive'}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2">
                {getLocationEmoji(program.location)} {program.location}
                {program.duration_weeks && (
                  <>
                    <span>•</span>
                    <span>{program.duration_weeks} weeks</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {program.description && (
                <p className="text-gray-600 mb-4">{program.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(program.price)}
                </div>
                
                <div className="text-xs text-gray-500">
                  Created: {new Date(program.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {programs.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No programs found</p>
            <Button onClick={() => setShowCreateForm(true)}>
              ➕ Create Your First Program
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}