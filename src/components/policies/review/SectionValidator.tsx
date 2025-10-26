'use client';

import { useState } from 'react';
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
  User
} from 'lucide-react';
import { SectionValidationInfo } from '@/lib/services/reviewService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SectionValidatorProps {
  section: SectionValidationInfo;
  actorType: string;
  actorId: string;
  policyId: string;
  icon: any;
  onValidationComplete: () => void;
}

export default function SectionValidator({
  section,
  actorType,
  actorId,
  policyId,
  icon: Icon,
  onValidationComplete
}: SectionValidatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const getStatusIcon = () => {
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

    setIsValidating(true);
    try {
      const response = await fetch(`/api/policies/${policyId}/review/validate-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorType,
          actorId,
          section: section.section,
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined
        })
      });

      if (response.ok) {
        setShowRejectDialog(false);
        setRejectionReason('');
        onValidationComplete();
      } else {
        const error = await response.json();
        console.error('Validation error:', error);
        alert(`Error al validar: ${error.message}`);
      }
    } catch (error) {
      console.error('Error validating section:', error);
      alert('Error al validar la sección');
    } finally {
      setIsValidating(false);
    }
  };

  const renderFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'No especificado';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return value.toLocaleString('es-MX');
    if (Array.isArray(value)) return value.length > 0 ? `${value.length} items` : 'Sin datos';
    if (typeof value === 'object') return 'Ver detalles';
    return String(value);
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
          const fieldLabel = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('Rfc', 'RFC')
            .replace('Curp', 'CURP')
            .replace('Clabe', 'CLABE');

          // Special handling for references
          if (key === 'personalReferences' || key === 'commercialReferences') {
            const refs = value as any[];
            if (!refs || refs.length === 0) return null;

            return (
              <div key={key} className="col-span-2">
                <p className="text-sm font-medium text-gray-700 mb-2">{fieldLabel}</p>
                <div className="space-y-2">
                  {refs.map((ref, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                      {ref.name && <p><span className="font-medium">Nombre:</span> {ref.name}</p>}
                      {ref.companyName && <p><span className="font-medium">Empresa:</span> {ref.companyName}</p>}
                      {ref.contactName && <p><span className="font-medium">Contacto:</span> {ref.contactName}</p>}
                      {ref.phone && <p><span className="font-medium">Teléfono:</span> {ref.phone}</p>}
                      {ref.relationship && <p><span className="font-medium">Relación:</span> {ref.relationship}</p>}
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
                      <p className="text-xs text-gray-500">
                        Validado: {format(new Date(section.validatedAt), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
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
                    variant="outline"
                    className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleValidate('APPROVED')}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isValidating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}

              {/* Validator info */}
              {section.validatedBy && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    <span>Validado por: {section.validatedBy}</span>
                  </div>
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
              disabled={!rejectionReason.trim() || isValidating}
            >
              {isValidating ? (
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