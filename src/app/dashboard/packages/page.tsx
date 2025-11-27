'use client';

import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';

function PackagesSkeleton() {
    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default function PackagesPage() {
    const { data: packages, isLoading, error } = trpc.package.getAll.useQuery();

  return (
    <div>
      <PageTitle
        title="Gestión de Paquetes"
        subtitle="Ver, crear y editar los paquetes de servicio de Hestia."
      />
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Todos los Paquetes</CardTitle>
            <br/ >
            <CardDescription>{!isLoading && !error && `Actualmente hay ${packages?.length || 0} paquetes en el sistema.`}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <PackagesSkeleton />
            ) : error ? (
                 <div className="text-center py-10 text-destructive">
                    <p>Error al cargar los paquetes.</p>
                    <p className="text-sm">{error.message}</p>
                 </div>
            ) : !packages || packages.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No se encontraron paquetes.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>
                            <span className="sr-only">Acciones</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>${pkg.price?.toLocaleString('es-MX') || '-'}</TableCell>
                        <TableCell>{pkg.description}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
