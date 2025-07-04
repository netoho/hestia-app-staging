'use client'; // For using hooks like useState/useEffect if needed for role simulation

import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Users, Shield, DollarSign, Edit, PackageSearch, UserPlus, ListChecks } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { UserRole } from '@/lib/types';


// Mock user role, in a real app this would come from auth context
const MOCK_USER_ROLE: UserRole = 'owner'; // Change to 'renter' or 'staff'


export default function DashboardPage() {
  const [userRole, setUserRole] = useState<UserRole>(MOCK_USER_ROLE);

  // useEffect(() => {
  //   // Simulate fetching user role
  //   // const fetchedRole = await getRoleFromAuth();
  //   // setUserRole(fetchedRole);
  // }, []);

  let welcomeMessage = "¡Bienvenido a tu panel de Hestia!";
  let roleSpecificContent = null;

  if (userRole === 'owner') {
    welcomeMessage = "¡Bienvenido, Propietario!";
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pólizas Activas</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Gestionadas por Hestia</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/policies">Ver Pólizas</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renta Total Asegurada</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,500.00</div>
            <p className="text-xs text-muted-foreground">En todas las pólizas activas</p>
             <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/payments">Ver Pagos</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nueva Solicitud de Inquilino</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Inicia una nueva póliza para un inquilino potencial.</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/policies/new">Crear Nueva Póliza</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else if (userRole === 'renter') {
    welcomeMessage = "¡Bienvenido, Inquilino!";
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mi Póliza Activa</CardTitle>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">Póliza #HG-12345</div>
            <p className="text-xs text-muted-foreground">Estado: Activo</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/my-policy">Ver Detalles</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mi Perfil</CardTitle>
            <Edit className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mb-3">Mantén tu información actualizada para un servicio sin interrupciones.</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/profile">Actualizar Perfil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else if (userRole === 'staff') {
    welcomeMessage = "¡Bienvenido, Staff de Hestia!";
    roleSpecificContent = (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,280</div>
            <p className="text-xs text-muted-foreground">+50 este mes</p>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/users">Gestionar Usuarios</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pólizas Pendientes</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Requieren revisión</p>
             <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/dashboard/policies?status=pending">Revisar Pólizas</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paquetes del Sistema</CardTitle>
            <PackageSearch className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Ver y editar los paquetes de servicio actuales.</p>
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/dashboard/packages">Gestionar Paquetes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={welcomeMessage} className="mb-8" />
      {roleSpecificContent || <p>Cargando contenido del panel...</p>}
      {/* Add more general dashboard components or summaries here */}
    </div>
  );
}
