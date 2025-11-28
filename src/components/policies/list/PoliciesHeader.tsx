'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Header for policies page with title and create button
 */
export default function PoliciesHeader() {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <h1 className="text-2xl md:text-3xl font-bold">Gestión de Protecciones</h1>
      <Button
        onClick={() => router.push('/dashboard/policies/new')}
        className="w-full sm:w-auto"
      >
        <Plus className="mr-2 h-4 w-4" />
        Nueva Protección
      </Button>
    </div>
  );
}
