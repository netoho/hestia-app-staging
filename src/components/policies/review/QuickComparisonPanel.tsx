'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Building, User, Users, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ActorReviewInfo } from '@/lib/services/reviewService';

interface QuickComparisonPanelProps {
  actors: ActorReviewInfo[];
  rentAmount: number;
  selectedActorId: string | null;
  onSelectActor: (actor: ActorReviewInfo) => void;
}

type SortField = 'name' | 'type' | 'progress' | 'income' | 'rti';
type SortDirection = 'asc' | 'desc';

const actorTypeLabels: Record<string, string> = {
  landlord: 'Arrendador',
  tenant: 'Inquilino',
  jointObligor: 'O. Solidario',
  aval: 'Aval',
};

const actorTypeIcons: Record<string, React.ElementType> = {
  landlord: Building,
  tenant: User,
  jointObligor: Users,
  aval: Shield,
};

function formatCurrency(amount: number | undefined): string {
  if (!amount) return '-';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateRTI(rentAmount: number, monthlyIncome: number | undefined): number | null {
  if (!monthlyIncome || monthlyIncome === 0) return null;
  return monthlyIncome / rentAmount;
}

function getRTIBadgeColor(rti: number | null): string {
  if (rti === null) return 'bg-gray-100 text-gray-600';
  if (rti >= 3) return 'bg-green-100 text-green-700';
  if (rti >= 2) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export default function QuickComparisonPanel({
  actors,
  rentAmount,
  selectedActorId,
  onSelectActor,
}: QuickComparisonPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>('type');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedActors = useMemo(() => {
    return [...actors].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.actorType.localeCompare(b.actorType);
          break;
        case 'progress':
          comparison = a.progress.overall - b.progress.overall;
          break;
        case 'income':
          comparison = (a.monthlyIncome || 0) - (b.monthlyIncome || 0);
          break;
        case 'rti':
          const rtiA = calculateRTI(rentAmount, a.monthlyIncome) || 0;
          const rtiB = calculateRTI(rentAmount, b.monthlyIncome) || 0;
          comparison = rtiA - rtiB;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [actors, sortField, sortDirection, rentAmount]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors',
        sortField === field && 'text-blue-600'
      )}
    >
      {children}
      {sortField === field && (
        <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
      )}
    </button>
  );

  return (
    <Card className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Comparación Rápida</span>
          <Badge variant="secondary" className="text-xs">
            {actors.length} partes
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <CardContent className="pt-0 pb-3 px-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">
                    <SortHeader field="name">Parte</SortHeader>
                  </th>
                  <th className="text-left py-2 px-2">
                    <SortHeader field="type">Tipo</SortHeader>
                  </th>
                  <th className="text-center py-2 px-2">
                    <SortHeader field="progress">Progreso</SortHeader>
                  </th>
                  <th className="text-right py-2 px-2">
                    <SortHeader field="income">Ingreso</SortHeader>
                  </th>
                  <th className="text-center py-2 px-2">Secciones</th>
                  <th className="text-center py-2 px-2">Docs</th>
                  <th className="text-center py-2 px-2">
                    <SortHeader field="rti">RTI</SortHeader>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedActors.map((actor) => {
                  const Icon = actorTypeIcons[actor.actorType] || User;
                  const rti = calculateRTI(rentAmount, actor.monthlyIncome);
                  const isSelected = actor.actorId === selectedActorId;

                  return (
                    <tr
                      key={actor.actorId}
                      onClick={() => onSelectActor(actor)}
                      className={cn(
                        'border-b last:border-b-0 cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <td className="py-2 px-2 max-w-[180px]">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="w-1 h-4 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                          <span
                            className={cn('font-medium truncate', isSelected && 'text-blue-700')}
                            title={actor.name}
                          >
                            {actor.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-600 text-xs">
                            {actorTypeLabels[actor.actorType]}
                          </span>
                          {actor.isCompany && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1">
                              Empresa
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                actor.progress.overall === 100
                                  ? 'bg-green-500'
                                  : actor.progress.overall >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                              )}
                              style={{ width: `${actor.progress.overall}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8">
                            {actor.progress.overall}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-gray-600">
                        {formatCurrency(actor.monthlyIncome)}
                      </td>
                      <td className="py-2 px-2 text-center text-xs text-gray-600">
                        {actor.progress.sectionsApproved}/{actor.progress.sectionsTotal}
                      </td>
                      <td className="py-2 px-2 text-center text-xs text-gray-600">
                        {actor.progress.documentsApproved}/{actor.progress.documentsTotal}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {rti !== null ? (
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] font-normal', getRTIBadgeColor(rti))}
                          >
                            {rti.toFixed(1)}x
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rent info footer */}
          <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs text-gray-500">
            <span>Renta mensual: {formatCurrency(rentAmount)}</span>
            <span className="text-[10px]">
              RTI = Ingreso / Renta (verde ≥3x, amarillo 2-3x, rojo {'<'}2x)
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
