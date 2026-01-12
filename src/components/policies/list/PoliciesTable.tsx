'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";
import { calculatePolicyProgress } from '@/lib/utils/policy';
import { POLICY_STATUS_CONFIG } from '@/lib/config/policyStatus';
import ActorsList from './ActorsList';

interface Actor {
  firstName?: string | null;
  middleName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  informationComplete: boolean;
  isPrimary?: boolean;
  [key: string]: unknown;
}

interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  propertyAddress?: { formattedAddress?: string | null } | null;
  propertyDetails?: { propertyAddressDetails?: { formattedAddress?: string | null } | null } | null;
  propertyType?: string | null;
  rentAmount: number;
  totalPrice?: number | null;
  createdAt: Date | string;
  package?: { name: string } | null;
  tenant?: Actor | null;
  landlords?: Actor[];
  jointObligors?: Actor[];
  avals?: Actor[];
  guarantorType?: string | null;
  [key: string]: unknown;
}

interface PoliciesTableProps {
  policies: Policy[];
}

/**
 * Desktop table view for policies list
 */
export default function PoliciesTable({ policies }: PoliciesTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: PolicyStatus) => {
    const config = POLICY_STATUS_CONFIG[status] || { label: status, variant: 'secondary' as const };
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
                        <div className="text-sm font-medium">{policy.propertyDetails?.propertyAddressDetails?.formattedAddress || 'N/A'}</div>
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
