'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PersonInformation from '@/components/actor/shared/PersonInformation';
import CompanyInformation from '@/components/actor/shared/CompanyInformation';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface LandlordOwnerInfoTabProps {
  landlords: any[];
  updateLandlordField: (index: number, field: string, value: any) => void;
  addCoOwner?: () => void;
  removeCoOwner?: (index: number) => void;
  errors: Record<string, string>;
  isAdminEdit?: boolean;
  canEdit?: boolean;
}

export default function LandlordOwnerInfoTab({
  landlords,
  updateLandlordField,
  addCoOwner,
  removeCoOwner,
  errors,
  isAdminEdit = false,
  canEdit = true,
}: LandlordOwnerInfoTabProps) {
  return (
    <div className="space-y-6">
      {landlords.map((landlord, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>
              {index === 0 ? 'Arrendador Principal' : `Copropietario ${index}`}
            </CardTitle>
            {index > 0 && removeCoOwner && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCoOwner(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {landlord.isCompany ? (
              <CompanyInformation
                data={landlord}
                onChange={(field, value) => updateLandlordField(index, field, value)}
                errors={Object.keys(errors).reduce((acc, key) => {
                  if (key.startsWith(`landlord${index}.`)) {
                    const fieldName = key.replace(`landlord${index}.`, '');
                    acc[fieldName] = errors[key];
                  }
                  return acc;
                }, {} as Record<string, string>)}
                disabled={!isAdminEdit && !canEdit}
                showAdditionalContact={index === 0}
              />
            ) : (
              <PersonInformation
                data={landlord}
                onChange={(field, value) => updateLandlordField(index, field, value)}
                errors={Object.keys(errors).reduce((acc, key) => {
                  if (key.startsWith(`landlord${index}.`)) {
                    const fieldName = key.replace(`landlord${index}.`, '');
                    acc[fieldName] = errors[key];
                  }
                  return acc;
                }, {} as Record<string, string>)}
                disabled={!isAdminEdit && !canEdit}
                showAdditionalContact={index === 0}
              />
            )}

            {/* Primary landlord designation (hidden field) */}
            <input
              type="hidden"
              name={`landlord${index}.isPrimary`}
              value={index === 0 ? 'true' : 'false'}
            />
          </CardContent>
        </Card>
      ))}

      {/* Add co-owner button */}
      {addCoOwner && (
        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={addCoOwner}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Copropietario
          </Button>
        </div>
      )}
    </div>
  );
}
