'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PolicyStatus } from '@/types/policy';
import { calculatePolicyProgress, getPrimaryLandlord, getActorDisplayName } from '@/lib/utils/policyUtils';

interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  propertyAddress: string;
  propertyType?: string;
  rentAmount: number;
  totalPrice?: number;
  createdAt: string;
  package?: {
    name: string;
  };
  tenant?: {
    fullName?: string;
    companyName?: string;
    email: string;
    informationComplete: boolean;
  } | null;
  landlords?: Array<{
    fullName?: string;
    companyName?: string;
    email: string;
    isPrimary?: boolean;
    informationComplete: boolean;
  }>;
  jointObligors?: Array<{
    fullName: string;
    informationComplete: boolean;
  }>;
  avals?: Array<{
    fullName: string;
    informationComplete: boolean;
  }>;
  guarantorType?: string;
}

interface PoliciesTableProps {
  policies: Policy[];
}

const STATUS_CONFIG = {
  [PolicyStatus.DRAFT]: { label: 'Borrador', variant: 'secondary' as const },
  [PolicyStatus.COLLECTING_INFO]: { label: 'Recopilando Info', variant: 'default' as const },
  [PolicyStatus.UNDER_INVESTIGATION]: { label: 'En Investigación', variant: 'default' as const },
  [PolicyStatus.INVESTIGATION_REJECTED]: { label: 'Rechazado', variant: 'destructive' as const },
  [PolicyStatus.PENDING_APPROVAL]: { label: 'Pendiente Aprobación', variant: 'default' as const },
  [PolicyStatus.APPROVED]: { label: 'Aprobado', variant: 'default' as const },
  [PolicyStatus.CONTRACT_PENDING]: { label: 'Contrato Pendiente', variant: 'default' as const },
  [PolicyStatus.CONTRACT_SIGNED]: { label: 'Contrato Firmado', variant: 'default' as const },
  [PolicyStatus.ACTIVE]: { label: 'Activa', variant: 'default' as const },
  [PolicyStatus.EXPIRED]: { label: 'Expirada', variant: 'secondary' as const },
  [PolicyStatus.CANCELLED]: { label: 'Cancelada', variant: 'destructive' as const },
};

/**
 * Desktop table view for policies list
 */
export default function PoliciesTable({ policies }: PoliciesTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: PolicyStatus) => {
    const config = STATUS_CONFIG[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="hidden lg:block">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Protección</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Arrendador</TableHead>
                <TableHead>Obligado S. / Aval</TableHead>
                <TableHead>Precio Total</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => {
                const progress = calculatePolicyProgress(policy);
                const primaryLandlord = getPrimaryLandlord(policy.landlords);
                const landlordCount = policy.landlords?.length || 0;

                return (
                  <TableRow key={policy.id}>
                    {/* Policy Number & Date */}
                    <TableCell className="font-medium">
                      <div>
                        <div>{policy.policyNumber}</div>
                        <div className="text-xs text-gray-500">
                          {policy.createdAt && format(new Date(policy.createdAt), 'dd/MM/yyyy', { locale: es })}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getStatusBadge(policy.status)}</TableCell>

                    {/* Property */}
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{policy.propertyAddress}</div>
                        {policy.propertyType && (
                          <div className="text-xs text-gray-500">{policy.propertyType}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          ${policy.rentAmount?.toLocaleString('es-MX')} /mes
                        </div>
                      </div>
                    </TableCell>

                    {/* Tenant */}
                    <TableCell>
                      {policy.tenant ? (
                        <div>
                          <div className="text-sm">
                            {getActorDisplayName(policy.tenant)}
                          </div>
                          <div className="text-xs text-gray-500">{policy.tenant.email}</div>
                          {policy.tenant.informationComplete ? (
                            <CheckCircle className="inline h-3 w-3 text-green-500 mt-1" />
                          ) : (
                            <Clock className="inline h-3 w-3 text-orange-500 mt-1" />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Pendiente</span>
                      )}
                    </TableCell>

                    {/* Landlord */}
                    <TableCell>
                      {primaryLandlord ? (
                        <div>
                          <div className="text-sm">
                            {getActorDisplayName(primaryLandlord)}
                            {landlordCount > 1 && (
                              <span className="text-xs text-gray-500"> (+{landlordCount - 1})</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{primaryLandlord.email}</div>
                          {primaryLandlord.informationComplete ? (
                            <CheckCircle className="inline h-3 w-3 text-green-500 mt-1" />
                          ) : (
                            <Clock className="inline h-3 w-3 text-orange-500 mt-1" />
                          )}
                          {landlordCount > 1 && (
                            <div className="text-xs text-gray-500">
                              {policy.landlords?.filter(l => l.informationComplete).length}/{landlordCount} completos
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Pendiente</span>
                      )}
                    </TableCell>

                    {/* Guarantors */}
                    <TableCell>
                      <div className="text-sm">
                        {policy.guarantorType === 'NONE' && 'Sin garantías'}
                        {policy.guarantorType === 'JOINT_OBLIGOR' && (
                          <div>
                            <span>Obligado S.</span>
                            {policy.jointObligors && policy.jointObligors.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {policy.jointObligors.filter(jo => jo.informationComplete).length}/{policy.jointObligors.length} completos
                              </div>
                            )}
                          </div>
                        )}
                        {policy.guarantorType === 'AVAL' && (
                          <div>
                            <span>Aval</span>
                            {policy.avals && policy.avals.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {policy.avals.filter(a => a.informationComplete).length}/{policy.avals.length} completos
                              </div>
                            )}
                          </div>
                        )}
                        {policy.guarantorType === 'BOTH' && (
                          <div>
                            <span>Ambos</span>
                            <div className="text-xs text-gray-500">
                              OS: {policy.jointObligors?.filter(jo => jo.informationComplete).length || 0}/{policy.jointObligors?.length || 0}
                              {' '}
                              A: {policy.avals?.filter(a => a.informationComplete).length || 0}/{policy.avals?.length || 0}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">
                          ${policy.totalPrice?.toLocaleString('es-MX')}
                        </div>
                        {policy.package && (
                          <div className="text-xs text-gray-500">{policy.package.name}</div>
                        )}
                      </div>
                    </TableCell>

                    {/* Progress */}
                    <TableCell>
                      <div className="w-20">
                        <div className="text-xs text-gray-600 mb-1">{progress.percentage}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              progress.percentage === 100
                                ? 'bg-green-500'
                                : progress.percentage > 0
                                ? 'bg-blue-500'
                                : 'bg-gray-300'
                            }`}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {progress.completedActors}/{progress.totalActors} actores
                        </div>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                          title="Ver detalles"
                        >
                          <strong>Detalles</strong>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
