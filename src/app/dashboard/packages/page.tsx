
'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import type { Package } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';

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
    const [packages, setPackages] = useState<Package[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated, token, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        async function fetchPackages() {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch('/api/packages', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) {
                }
                const data = await response.json();
                setPackages(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPackages();
    }, []);

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
            <CardDescription>{!isLoading && !error && `Actualmente hay ${packages.length} paquetes en el sistema.`}</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Paquete
          </Button>
        </CardHeader>
        <CardContent>
            {(isLoading || isAuthLoading) ? (
                <PackagesSkeleton />
            ) : error ? (
                 <div className="text-center py-10 text-destructive">
                    <p>Error al cargar los paquetes.</p>
                    <p className="text-sm">{error}</p>
                 </div>
            ) : packages.length === 0 ? (
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
                        <TableCell>${pkg.price.toLocaleString('es-MX')}</TableCell>
                        <TableCell>{pkg.description}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
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
