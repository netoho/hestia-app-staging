'use client';

import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  FileCheck,
  RefreshCw
} from 'lucide-react';

interface ReviewHeaderProps {
  policyNumber: string;
  propertyAddress: string;
  notesCount: number;
  showNotes: boolean;
  refreshing: boolean;
  onBack: () => void;
  onNotesToggle: () => void;
  onRefresh: () => void;
}

export default function ReviewHeader({
  policyNumber,
  propertyAddress,
  notesCount,
  showNotes,
  refreshing,
  onBack,
  onNotesToggle,
  onRefresh
}: ReviewHeaderProps) {
  return (
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
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                <FileCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                <span className="hidden sm:inline">Revisión de Información</span>
                <span className="sm:hidden">Revisión</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                #{policyNumber} - {propertyAddress}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onNotesToggle}
            >
              Notas ({notesCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
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
  );
}