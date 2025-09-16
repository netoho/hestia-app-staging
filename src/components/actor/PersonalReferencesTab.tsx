'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

export interface PersonalReference {
  name: string;
  phone: string;
  email: string;
  relationship: string;
  occupation?: string;
}

interface PersonalReferencesTabProps {
  references: PersonalReference[];
  errors: Record<string, string>;
  updateReference: (index: number, field: string, value: string) => void;
  addReference: () => void;
  removeReference: (index: number) => void;
}

export default function PersonalReferencesTab({
  references,
  errors,
  updateReference,
  addReference,
  removeReference
}: PersonalReferencesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Proporcione información de 3 a 5 referencias personales (no familiares directos)
        </p>
        {references.length < 5 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addReference}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Referencia
          </Button>
        )}
      </div>

      {references.map((ref, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Referencia {index + 1} *</CardTitle>
            {references.length > 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeReference(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`ref_${index}_name`}>Nombre Completo *</Label>
              <Input
                id={`ref_${index}_name`}
                value={ref.name}
                onChange={(e) => updateReference(index, 'name', e.target.value)}
                placeholder="Nombre completo"
                className={errors[`ref_${index}_name`] ? 'border-red-500' : ''}
              />
              {errors[`ref_${index}_name`] && (
                <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_name`]}</p>
              )}
            </div>

            <div>
              <Label htmlFor={`ref_${index}_phone`}>Teléfono *</Label>
              <Input
                id={`ref_${index}_phone`}
                value={ref.phone}
                onChange={(e) => updateReference(index, 'phone', e.target.value)}
                placeholder="10 dígitos"
                className={errors[`ref_${index}_phone`] ? 'border-red-500' : ''}
              />
              {errors[`ref_${index}_phone`] && (
                <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_phone`]}</p>
              )}
            </div>

            <div>
              <Label htmlFor={`ref_${index}_email`}>Correo Electrónico</Label>
              <Input
                id={`ref_${index}_email`}
                type="email"
                value={ref.email}
                onChange={(e) => updateReference(index, 'email', e.target.value)}
                placeholder="correo@ejemplo.com (opcional)"
              />
            </div>

            <div>
              <Label htmlFor={`ref_${index}_relationship`}>Relación *</Label>
              <Input
                id={`ref_${index}_relationship`}
                value={ref.relationship}
                onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                placeholder="Ej: Amigo, Compañero de trabajo"
                className={errors[`ref_${index}_relationship`] ? 'border-red-500' : ''}
              />
              {errors[`ref_${index}_relationship`] && (
                <p className="text-red-500 text-sm mt-1">{errors[`ref_${index}_relationship`]}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor={`ref_${index}_occupation`}>Ocupación</Label>
              <Input
                id={`ref_${index}_occupation`}
                value={ref.occupation || ''}
                onChange={(e) => updateReference(index, 'occupation', e.target.value)}
                placeholder="Ocupación de la referencia (opcional)"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}