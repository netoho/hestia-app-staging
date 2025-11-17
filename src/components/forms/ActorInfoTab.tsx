'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { PersonalInfoTab } from '@/components/forms/PersonalInfoTab';
import { CompanyInfoTab } from '@/components/forms/CompanyInfoTab';
import { ActorType } from '@/lib/enums';

type ActorInfoTabProps = {
  actorType: ActorType;
  isMultiActor: boolean;
  actors?: any[]; // For multi-actor (Landlord)
  formData?: any; // For single-actor
  updateField?: (field: string, value: any) => void; // Single-actor
  updateActorField?: (index: number, field: string, value: any) => void; // Multi-actor
  addActor?: () => void;
  removeActor?: (index: number) => void;
  errors: Record<string, string>;
  isAdminEdit?: boolean;
};

export function ActorInfoTab({
  actorType,
  isMultiActor,
  actors,
  formData,
  updateField,
  updateActorField,
  addActor,
  removeActor,
  errors,
  isAdminEdit = false,
}: ActorInfoTabProps) {
  // Determine if showing company form
  const isCompany = isMultiActor
    ? actors?.[0]?.isCompany || false
    : actorType === 'tenant'
    ? formData?.tenantType === 'COMPANY'
    : formData?.isCompany || false;

  // Render multi-actor view (Landlord)
  if (isMultiActor && actors && updateActorField) {
    return (
      <div className="space-y-6">
        {actors.map((actor, index) => (
          <div key={index} className="relative">
            {/* Co-owner header for non-primary landlords */}
            {index > 0 && (
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Copropietario {index}
                </h3>
                {actors.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeActor?.(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </div>
            )}

            {/* Render appropriate info tab */}
            {isCompany ? (
              <CompanyInfoTab
                formData={actor}
                updateField={(field, value) => updateActorField(index, field, value)}
                errors={Object.keys(errors).reduce((acc, key) => {
                  if (key.startsWith(`actor${index}.`)) {
                    const fieldName = key.replace(`actor${index}.`, '');
                    acc[fieldName] = errors[key];
                  }
                  return acc;
                }, {} as Record<string, string>)}
                isAdminEdit={isAdminEdit}
                includeOwnershipFields={actorType === 'landlord'}
              />
            ) : (
              <PersonalInfoTab
                formData={actor}
                updateField={(field, value) => updateActorField(index, field, value)}
                errors={Object.keys(errors).reduce((acc, key) => {
                  if (key.startsWith(`actor${index}.`)) {
                    const fieldName = key.replace(`actor${index}.`, '');
                    acc[fieldName] = errors[key];
                  }
                  return acc;
                }, {} as Record<string, string>)}
                isAdminEdit={isAdminEdit}
                includeOwnershipFields={actorType === 'landlord'}
              />
            )}

            {/* Ownership percentage field for landlords */}
            {actorType === 'landlord' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porcentaje de Propiedad *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={actor.ownershipPercentage || ''}
                    onChange={(e) => updateActorField(index, 'ownershipPercentage', e.target.value)}
                    className={`
                      w-full px-3 py-2 border rounded-md
                      ${errors[`actor${index}.ownershipPercentage`]
                        ? 'border-red-500'
                        : 'border-gray-300'
                      }
                    `}
                    disabled={!isAdminEdit && actor.isPrimary}
                  />
                  {errors[`actor${index}.ownershipPercentage`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`actor${index}.ownershipPercentage`]}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-gray-500">
                    {actor.isPrimary ? 'Propietario Principal' : `Copropietario ${index}`}
                  </p>
                </div>
              </div>
            )}

            {/* Divider between co-owners */}
            {index < actors.length - 1 && (
              <hr className="my-6 border-gray-200" />
            )}
          </div>
        ))}

        {/* Add co-owner button */}
        {actorType === 'landlord' && addActor && (
          <div className="mt-6 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={addActor}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Copropietario
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Agregue copropietarios si la propiedad tiene múltiples dueños
            </p>
          </div>
        )}
      </div>
    );
  }

  // Render single-actor view (Tenant, Aval, JointObligor)
  if (!isMultiActor && formData && updateField) {
    return (
      <div>
        {isCompany ? (
          <CompanyInfoTab
            formData={formData}
            updateField={updateField}
            errors={errors}
            isAdminEdit={isAdminEdit}
            includeOwnershipFields={false}
          />
        ) : (
          <PersonalInfoTab
            formData={formData}
            updateField={updateField}
            errors={errors}
            isAdminEdit={isAdminEdit}
            includeOwnershipFields={false}
          />
        )}

        {/* Additional fields specific to actor type */}
        {actorType === 'tenant' && !isCompany && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ocupación *
              </label>
              <input
                type="text"
                value={formData.occupation || ''}
                onChange={(e) => updateField('occupation', e.target.value)}
                className={`
                  w-full px-3 py-2 border rounded-md
                  ${errors.occupation ? 'border-red-500' : 'border-gray-300'}
                `}
              />
              {errors.occupation && (
                <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lugar de Trabajo
              </label>
              <input
                type="text"
                value={formData.workPlace || ''}
                onChange={(e) => updateField('workPlace', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}

        {(actorType === 'aval' || actorType === 'jointObligor') && !isCompany && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relación con el Inquilino *
              </label>
              <input
                type="text"
                value={formData.relationship || ''}
                onChange={(e) => updateField('relationship', e.target.value)}
                className={`
                  w-full px-3 py-2 border rounded-md
                  ${errors.relationship ? 'border-red-500' : 'border-gray-300'}
                `}
                placeholder="Ej: Padre, Hermano, Amigo"
              />
              {errors.relationship && (
                <p className="text-red-500 text-sm mt-1">{errors.relationship}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ocupación *
              </label>
              <input
                type="text"
                value={formData.occupation || ''}
                onChange={(e) => updateField('occupation', e.target.value)}
                className={`
                  w-full px-3 py-2 border rounded-md
                  ${errors.occupation ? 'border-red-500' : 'border-gray-300'}
                `}
              />
              {errors.occupation && (
                <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}