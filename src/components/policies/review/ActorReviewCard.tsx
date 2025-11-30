'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Building,
  Briefcase,
  CreditCard,
  MapPin,
  FileText,
  Users,
  History,
  Home
} from 'lucide-react';
import SectionValidator from './SectionValidator';
import ReviewDocumentCard from './ReviewDocumentCard';
import FieldSearchBar, { SearchResults } from './FieldSearchBar';
import { useReview } from './ReviewContext';
import type { ActorReviewInfo, SectionValidationInfo, DocumentValidationInfo } from '@/lib/services/reviewService.types';
import type { ReviewIcon } from '@/types/review';

interface ActorReviewCardProps {
  actor: ActorReviewInfo;
  policyId: string;
  onValidationUpdate: () => void;
}

export default function ActorReviewCard({
  actor,
  policyId,
  onValidationUpdate
}: ActorReviewCardProps) {
  const { getActiveTab, setTab } = useReview();
  const activeTab = getActiveTab(actor.actorId);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    query: '',
    matchingSections: [],
    matchCount: 0,
  });

  const handleSearchResults = useCallback((results: SearchResults) => {
    setSearchResults(results);
  }, []);

  const getSectionIcon = (section: string): ReviewIcon => {
    switch (section) {
      case 'personal_info': return actor.isCompany ? Building : User;
      case 'work_info': return Briefcase;
      case 'financial_info': return CreditCard;
      case 'address': return MapPin;
      case 'company_info': return Building;
      case 'references': return Users;
      case 'rental_history': return History;
      case 'property_guarantee': return Home;
      default: return FileText;
    }
  };

  const getActorTypeLabel = () => {
    switch (actor.actorType) {
      case 'landlord': return 'Arrendador';
      case 'tenant': return 'Inquilino';
      case 'jointObligor': return 'Obligado Solidario';
      case 'aval': return 'Aval';
      default: return actor.actorType;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'IDENTIFICATION': 'Identificación',
      'INCOME_PROOF': 'Ingresos',
      'ADDRESS_PROOF': 'Domicilio',
      'BANK_STATEMENT': 'Bancario',
      'PROPERTY_DEED': 'Propiedad',
      'PROPERTY_TAX_STATEMENT': 'Predial',
      'TAX_RETURN': 'Fiscal',
      'EMPLOYMENT_LETTER': 'Laboral',
      'COMPANY_CONSTITUTION': 'Constitución',
      'PASSPORT': 'Pasaporte',
      'TAX_STATUS_CERTIFICATE': 'Situación Fiscal',
      'LEGAL_POWERS': 'Poderes Legales',
      'OTHER': 'Otro'
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-800 border-green-200' },
      REJECTED: { label: 'Rechazado', className: 'bg-red-100 text-red-800 border-red-200' },
      IN_REVIEW: { label: 'En Revisión', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      PENDING: { label: 'Pendiente', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };

    const statusConfig = config[status as keyof typeof config] || config.PENDING;

    return (
      <Badge variant="outline" className={statusConfig.className}>
        {statusConfig.label}
      </Badge>
    );
  };

  // Count validations by status
  const sectionStats = {
    total: actor.sections.length,
    approved: actor.sections.filter(s => s.status === 'APPROVED').length,
    rejected: actor.sections.filter(s => s.status === 'REJECTED').length,
    pending: actor.sections.filter(s => s.status === 'PENDING').length
  };

  const documentStats = {
    total: actor.documents.length,
    approved: actor.documents.filter(d => d.status === 'APPROVED').length,
    rejected: actor.documents.filter(d => d.status === 'REJECTED').length,
    pending: actor.documents.filter(d => d.status === 'PENDING').length
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              {actor.name}
              {actor.isCompany && (
                <Badge variant="outline">Empresa</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {getActorTypeLabel()}
              {actor.email && ` • ${actor.email}`}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {actor.progress.overall}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Progreso Total
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(tab) => setTab(actor.actorId, tab as 'sections' | 'documents')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sections" className="relative">
              Información
              {sectionStats.pending > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-xs bg-orange-500">
                  {sectionStats.pending}
                </Badge>
              )}
              {sectionStats.rejected > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs bg-red-500">
                  {sectionStats.rejected}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="relative">
              Documentos ({documentStats.total})
              {documentStats.pending > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-xs bg-orange-500">
                  {documentStats.pending}
                </Badge>
              )}
              {documentStats.rejected > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs bg-red-500">
                  {documentStats.rejected}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="mt-6">
            {/* Field Search Bar */}
            <FieldSearchBar
              sections={actor.sections}
              onSearchResults={handleSearchResults}
            />

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {actor.sections.map((section) => (
                  <SectionValidator
                    key={section.section}
                    section={section}
                    actorType={actor.actorType}
                    actorId={actor.actorId}
                    policyId={policyId}
                    icon={getSectionIcon(section.section)}
                    onValidationComplete={onValidationUpdate}
                    searchQuery={searchResults.query}
                    forceExpanded={searchResults.matchingSections.includes(section.section)}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {sectionStats.approved}
                  </div>
                  <p className="text-xs text-gray-500">Aprobadas</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {sectionStats.pending}
                  </div>
                  <p className="text-xs text-gray-500">Pendientes</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {sectionStats.rejected}
                  </div>
                  <p className="text-xs text-gray-500">Rechazadas</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {actor.documents.length > 0 ? (
                  (() => {
                    // Group documents by category
                    const groupedDocuments = actor.documents.reduce((acc, doc) => {
                      if (!acc[doc.category]) {
                        acc[doc.category] = [];
                      }
                      acc[doc.category].push(doc);
                      return acc;
                    }, {} as Record<string, DocumentValidationInfo[]>);

                    // Sort categories and render ReviewDocumentCard for each
                    return Object.entries(groupedDocuments)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([category, docs]) => {
                        // Sort documents within category
                        const sortedDocs = docs.sort((a, b) => {
                          const nameCompare = a.fileName.localeCompare(b.fileName);
                          if (nameCompare !== 0) return nameCompare;
                          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        });

                        return (
                          <ReviewDocumentCard
                            key={category}
                            category={category}
                            categoryLabel={getCategoryLabel(category)}
                            documents={sortedDocs}
                            policyId={policyId}
                            onValidationComplete={onValidationUpdate}
                          />
                        );
                      });
                  })()
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No se han cargado documentos
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {documentStats.approved}
                  </div>
                  <p className="text-xs text-gray-500">Aprobados</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {documentStats.pending}
                  </div>
                  <p className="text-xs text-gray-500">Pendientes</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {documentStats.rejected}
                  </div>
                  <p className="text-xs text-gray-500">Rechazados</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
