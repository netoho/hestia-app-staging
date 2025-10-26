'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  FileCheck,
  Users,
  Building,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw
} from 'lucide-react';
import ActorReviewCard from './ActorReviewCard';
import ReviewProgress from './ReviewProgress';
import ReviewNotes from './ReviewNotes';
import { PolicyReviewData, ActorReviewInfo } from '@/lib/services/reviewService';

interface ReviewLayoutProps {
  policyId: string;
  initialData?: PolicyReviewData;
  onBack: () => void;
}

export default function ReviewLayout({
  policyId,
  initialData,
  onBack
}: ReviewLayoutProps) {
  const [data, setData] = useState<PolicyReviewData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [selectedActor, setSelectedActor] = useState<ActorReviewInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!initialData) {
      fetchReviewData();
    }
  }, [policyId]);

  const fetchReviewData = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/review/progress?detailed=true`);
      if (!response.ok) throw new Error('Failed to fetch review data');
      const result = await response.json();
      setData(result.data);

      // Select first actor if none selected
      if (!selectedActor && result.data.actors.length > 0) {
        setSelectedActor(result.data.actors[0]);
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviewData();
    setRefreshing(false);
  };

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case 'landlord': return Building;
      case 'tenant': return User;
      case 'jointObligor': return Users;
      case 'aval': return Shield;
      default: return User;
    }
  };

  const getActorTypeLabel = (actorType: string) => {
    switch (actorType) {
      case 'landlord': return 'Arrendador';
      case 'tenant': return 'Inquilino';
      case 'jointObligor': return 'Obligado Solidario';
      case 'aval': return 'Aval';
      default: return actorType;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      case 'IN_REVIEW': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return CheckCircle2;
      case 'REJECTED': return XCircle;
      case 'IN_REVIEW': return Eye;
      default: return Clock;
    }
  };

  const handleValidationUpdate = () => {
    // Refresh data after validation changes
    fetchReviewData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se pudieron cargar los datos de revisión</p>
        <Button onClick={fetchReviewData} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <FileCheck className="h-6 w-6 text-blue-600" />
                  Revisión de Información
                </h1>
                <p className="text-sm text-gray-600">
                  Protección #{data.policyNumber} - {data.propertyAddress}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
              >
                Notas ({data.notes.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="container mx-auto px-4 py-6">
        <ReviewProgress progress={data.progress} />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Actor List Sidebar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actores</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="p-4 space-y-2">
                    {data.actors.map((actor) => {
                      const Icon = getActorIcon(actor.actorType);
                      return (
                        <button
                          key={`${actor.actorType}-${actor.actorId}`}
                          onClick={() => setSelectedActor(actor)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedActor?.actorId === actor.actorId
                              ? 'bg-blue-50 border-blue-300'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Icon className="h-5 w-5 text-gray-600 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">
                                  {actor.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {getActorTypeLabel(actor.actorType)}
                                </p>
                                {actor.isCompany && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    Empresa
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">
                                {actor.progress.overall}%
                              </div>
                              <div className="flex gap-1 mt-1">
                                {actor.progress.sectionsApproved === actor.progress.sectionsTotal ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-orange-500" />
                                )}
                                <span className="text-xs text-gray-500">
                                  {actor.progress.sectionsApproved}/{actor.progress.sectionsTotal}
                                </span>
                              </div>
                              <div className="flex gap-1 mt-0.5">
                                {actor.progress.documentsApproved === actor.progress.documentsTotal ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-orange-500" />
                                )}
                                <span className="text-xs text-gray-500">
                                  {actor.progress.documentsApproved}/{actor.progress.documentsTotal}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-9">
            {selectedActor ? (
              <ActorReviewCard
                actor={selectedActor}
                policyId={policyId}
                onValidationUpdate={handleValidationUpdate}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">
                    Selecciona un actor para revisar su información
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Notes Panel */}
      {showNotes && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform">
          <ReviewNotes
            policyId={policyId}
            notes={data.notes}
            selectedActorType={selectedActor?.actorType}
            selectedActorId={selectedActor?.actorId}
            onClose={() => setShowNotes(false)}
            onNoteAdded={handleRefresh}
          />
        </div>
      )}
    </div>
  );
}