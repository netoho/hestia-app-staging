'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PolicyStatus } from '@/types/policy';
import { calculatePolicyProgress } from '@/lib/utils/policyUtils';
import ActorsList from './ActorsList';

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
    email?: string;
    phone?: string;
    informationComplete: boolean;
  } | null;
  landlords?: Array<{
    fullName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    informationComplete: boolean;
  }>;
  jointObligors?: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
    informationComplete: boolean;
  }>;
  avals?: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
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
                <TableHead>Actores</TableHead>
                <TableHead>Precio Total</TableHead>
                <TableHead>Progreso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => {
                const progress = calculatePolicyProgress(policy);

                return (
                  <TableRow key={policy.id}>
                    {/* Policy Number & Date - Clickable */}
                    <TableCell className="font-medium">
                      <div>
                        <button
                          onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {policy.policyNumber}
                        </button>
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

                    {/* All Actors Combined */}
                    <TableCell>
                      <ActorsList
                        landlords={policy.landlords}
                        tenant={policy.tenant}
                        jointObligors={policy.jointObligors}
                        avals={policy.avals}
                        guarantorType={policy.guarantorType}
                      />
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
