'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import ActorReviewCard from './ActorReviewCard';
import ReviewProgress from './ReviewProgress';
import ReviewNotes from './ReviewNotes';
import ReviewHeader from './ReviewHeader';
import ActorListSidebar from './ActorListSidebar';
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

      // Validate response structure
      if (!result.data || typeof result.data !== 'object') {
        throw new Error('Invalid response structure');
      }

      setData(result.data);

      // Select first actor if none selected
      if (!selectedActor && result.data.actors && result.data.actors.length > 0) {
        setSelectedActor(result.data.actors[0]);
      }

      return result.data; // Return the fetched data
    } catch (error) {
      console.error('Error fetching review data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviewData();
    setRefreshing(false);
  };


  const handleValidationUpdate = async () => {
    // Store current selected actor ID to restore selection after refresh
    const currentActorId = selectedActor?.actorId;

    // Clear selected actor first to force re-render
    setSelectedActor(null);

    // Refresh data after validation changes
    const newData = await fetchReviewData();

    // After data is refreshed, update selectedActor to point to the new actor object
    if (currentActorId && newData?.actors) {
      const updatedActor = newData.actors.find((actor: any) => actor.actorId === currentActorId);
      if (updatedActor) {
        // Use setTimeout to ensure state update happens after render cycle
        setTimeout(() => {
          setSelectedActor(updatedActor);
        }, 0);
      }
    }
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
      <ReviewHeader
        policyNumber={data.policyNumber}
        propertyAddress={data.propertyAddress}
        notesCount={data.notes.length}
        showNotes={showNotes}
        refreshing={refreshing}
        onBack={onBack}
        onNotesToggle={() => setShowNotes(!showNotes)}
        onRefresh={handleRefresh}
      />

      {/* Progress Overview */}
      <div className="container mx-auto px-4 py-6">
        <ReviewProgress progress={data.progress} />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Actor List Sidebar */}
          <div className="lg:col-span-3">
            <ActorListSidebar
              actors={data.actors}
              selectedActorId={selectedActor?.actorId || null}
              onActorSelect={setSelectedActor}
            />
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