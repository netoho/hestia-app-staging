'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PolicyInitiationForm } from '@/components/forms/PolicyInitiationForm';
import { t } from '@/lib/i18n';

export default function NewPolicyPage() {
  const router = useRouter();

  const handlePolicyCreated = () => {
    router.push('/dashboard/policies');
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/policies">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Pólizas
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold">Iniciar Nueva Póliza</h1>
        <p className="text-muted-foreground mt-2">
          Complete el formulario para iniciar una nueva solicitud de póliza de garantía
        </p>
      </div>

      {/* Form */}
      <div className="bg-card rounded-lg border p-6">
        <PolicyInitiationForm onSuccess={handlePolicyCreated} />
      </div>
    </div>
  );
}