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
import { trpc } from '@/lib/trpc/client';

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
  const [selectedActor, setSelectedActor] = useState<ActorReviewInfo | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  // Use tRPC query for fetching review data
  const { data, isLoading, error, refetch, isRefetching } = trpc.review.getProgress.useQuery(
    { policyId, detailed: true },
    {
      initialData,
      refetchOnWindowFocus: false,
    }
  );

  // Select first actor when data loads
  useEffect(() => {
    if (!selectedActor && data && 'actors' in data && data.actors && data.actors.length > 0) {
      setSelectedActor(data.actors[0]);
    }
  }, [data, selectedActor]);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleValidationUpdate = async () => {
    // Store current selected actor ID to restore selection after refresh
    const currentActorId = selectedActor?.actorId;

    // Clear selected actor first to force re-render
    setSelectedActor(null);

    // Refresh data after validation changes
    const { data: newData } = await refetch();

    // After data is refreshed, update selectedActor to point to the new actor object
    if (currentActorId && newData && 'actors' in newData && newData.actors) {
      const updatedActor = newData.actors.find((actor: any) => actor.actorId === currentActorId);
      if (updatedActor) {
        // Use setTimeout to ensure state update happens after render cycle
        setTimeout(() => {
          setSelectedActor(updatedActor);
        }, 0);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se pudieron cargar los datos de revisión</p>
        <Button onClick={() => refetch()} className="mt-4">
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
        refreshing={isRefetching}
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