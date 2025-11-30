'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  User,
  Calendar
} from 'lucide-react';
import type { SectionValidationInfo } from '@/lib/services/reviewService.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ReviewIcon, StatusIconComponent } from '@/types/review';
import { trpc } from '@/lib/trpc/client';
import { toast } from '@/hooks/use-toast';

interface SectionValidatorProps {
  section: SectionValidationInfo;
  actorType: string;
  actorId: string;
  policyId: string;
  icon: ReviewIcon;
  onValidationComplete: () => void;
  searchQuery?: string;
  forceExpanded?: boolean;
}

// Helper function to highlight matching text
function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-200 px-0.5 rounded">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export default function SectionValidator({
  section,
  actorType,
  actorId,
  policyId,
  icon: Icon,
  onValidationComplete,
  searchQuery = '',
  forceExpanded = false,
}: SectionValidatorProps) {
  const [isOpen, setIsOpen] = useState(forceExpanded);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Auto-expand when forceExpanded changes
  useEffect(() => {
    if (forceExpanded) {
      setIsOpen(true);
    }
  }, [forceExpanded]);

  // Use tRPC mutation for section validation
  const validateSectionMutation = trpc.review.validateSection.useMutation({
    onSuccess: () => {
      setShowRejectDialog(false);
      setRejectionReason('');
      onValidationComplete();
    },
    onError: (error) => {
      console.error('Validation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error al validar',
        description: error.message || 'Ocurrió un error. Intente de nuevo.',
      });
    },
  });

  const getStatusIcon = (): StatusIconComponent => {
    switch (section.status) {
      case 'APPROVED': return CheckCircle2;
      case 'REJECTED': return XCircle;
      case 'IN_REVIEW': return Eye;
      default: return Clock;
    }
  };

  const getStatusColor = () => {
    switch (section.status) {
      case 'APPROVED': return 'text-green-600 bg-green-50';
      case 'REJECTED': return 'text-red-600 bg-red-50';
      case 'IN_REVIEW': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = () => {
    switch (section.status) {
      case 'APPROVED': return 'Aprobada';
      case 'REJECTED': return 'Rechazada';
      case 'IN_REVIEW': return 'En Revisión';
      default: return 'Pendiente';
    }
  };

  const handleValidate = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      return;
    }

    validateSectionMutation.mutate({
      policyId,
      actorType: actorType as 'landlord' | 'tenant' | 'jointObligor' | 'aval',
      actorId,
      section: section.section as 'personal_info' | 'work_info' | 'financial_info' | 'references' | 'address' | 'company_info' | 'rental_history' | 'property_guarantee',
      status,
      rejectionReason: status === 'REJECTED' ? rejectionReason : undefined
    });
  };

  const renderFieldValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'No especificado';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') {
      const formatted = value.toLocaleString('es-MX');
      return searchQuery ? highlightText(formatted, searchQuery) : formatted;
    }
    if (Array.isArray(value)) return value.length > 0 ? `${value.length} items` : 'Sin datos';
    if (typeof value === 'object') return 'Ver detalles';
    const strValue = String(value);
    return searchQuery ? highlightText(strValue, searchQuery) : strValue;
  };

  const renderFields = () => {
    if (!section.fields) {
      return <p className="text-sm text-gray-500">Sin información disponible</p>;
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(section.fields).map(([key, value]) => {
          // Skip null or undefined values
          if (value === null || value === undefined) return null;

          // Handle special field names
          const fieldLabelRaw = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('Rfc', 'RFC')
            .replace('Curp', 'CURP')
            .replace('Clabe', 'CLABE');
          const fieldLabel = searchQuery ? highlightText(fieldLabelRaw, searchQuery) : fieldLabelRaw;

          // Special handling for references
          if (key === 'personalReferences' || key === 'commercialReferences') {
            const refs = value as any[];
            if (!refs || refs.length === 0) return null;

            const isPersonal = key === 'personalReferences';
            const typeLabel = isPersonal ? 'Referencias Personales' : 'Referencias Comerciales';
            const typeBadgeColor = isPersonal ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';

            return (
              <div key={key} className="col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-700">{typeLabel}</p>
                  <Badge variant="outline" className={typeBadgeColor}>
                    {refs.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {refs.map((ref, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-xs ${typeBadgeColor}`}>
                          {ref.type || (isPersonal ? 'Personal' : 'Comercial')}
                        </Badge>
                        <span className="text-gray-400">#{index + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {ref.name && (
                          <div>
                            <span className="font-medium text-gray-600">Nombre:</span>
                            <span className="ml-1">{ref.name}</span>
                          </div>
                        )}
                        {ref.companyName && (
                          <div>
                            <span className="font-medium text-gray-600">Empresa:</span>
                            <span className="ml-1">{ref.companyName}</span>
                          </div>
                        )}
                        {ref.contactName && (
                          <div>
                            <span className="font-medium text-gray-600">Contacto:</span>
                            <span className="ml-1">{ref.contactName}</span>
                          </div>
                        )}
                        {ref.phone && (
                          <div>
                            <span className="font-medium text-gray-600">Teléfono:</span>
                            <span className="ml-1">{ref.phone}</span>
                          </div>
                        )}
                        {ref.relationship && (
                          <div>
                            <span className="font-medium text-gray-600">Relación:</span>
                            <span className="ml-1">{ref.relationship}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Regular fields
          return (
            <div key={key}>
              <p className="text-sm font-medium text-gray-700">{fieldLabel}</p>
              <p className="text-sm text-gray-900 mt-1">{renderFieldValue(value)}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const StatusIcon = getStatusIcon();

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${getStatusColor()}`}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor()}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{section.displayName}</p>
                    {section.validatedAt && (
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(section.validatedAt), "d MMM yyyy", { locale: es })}
                        </span>
                        {section.validatorName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {section.validatorName}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-5 w-5" />
                    <span className="font-medium">{getStatusLabel()}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 border-t pt-4">
              {/* Rejection reason if exists */}
              {section.status === 'REJECTED' && section.rejectionReason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Razón de rechazo:</p>
                      <p className="text-sm text-red-700 mt-1">{section.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Field data */}
              <div className="mb-4">
                {renderFields()}
              </div>

              {/* Validation buttons */}
              {section.status !== 'APPROVED' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleValidate('APPROVED')}
                    disabled={validateSectionMutation.isPending}
                  >
                    {validateSectionMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={validateSectionMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}

            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar {section.displayName}</DialogTitle>
            <DialogDescription>
              Proporciona una razón para el rechazo. Esta información será visible para el equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe el motivo del rechazo..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleValidate('REJECTED')}
              disabled={!rejectionReason.trim() || validateSectionMutation.isPending}
            >
              {validateSectionMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
