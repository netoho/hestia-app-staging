'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LandlordBankInfoTabProps {
  landlords: any[];
  updateLandlordField: (index: number, field: string, value: any) => void;
  errors: Record<string, string>;
  isAdminEdit?: boolean;
  canEdit?: boolean;
}

export default function LandlordBankInfoTab({
  landlords,
  updateLandlordField,
  errors,
  isAdminEdit = false,
  canEdit = true,
}: LandlordBankInfoTabProps) {
  // Only show bank info for primary landlord
  const primaryLandlord = landlords.find((landlord) => landlord.isPrimary);
  if (!primaryLandlord) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Bancaria</CardTitle>
        <p className="text-sm text-gray-600">
          Los pagos se realizarán únicamente al arrendador principal
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Banco *
            </label>
            <input
              type="text"
              value={primaryLandlord.bankName || ''}
              onChange={(e) => updateLandlordField(0, 'bankName', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-md
                ${errors['landlord0.bankName'] ? 'border-red-500' : 'border-gray-300'}
              `}
              disabled={!isAdminEdit && !canEdit}
            />
            {errors['landlord0.bankName'] && (
              <p className="text-red-500 text-sm mt-1">{errors['landlord0.bankName']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titular de la Cuenta *
            </label>
            <input
              type="text"
              value={primaryLandlord.accountHolder || ''}
              onChange={(e) => updateLandlordField(0, 'accountHolder', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-md
                ${errors['landlord0.accountHolder'] ? 'border-red-500' : 'border-gray-300'}
              `}
              disabled={!isAdminEdit && !canEdit}
            />
            {errors['landlord0.accountHolder'] && (
              <p className="text-red-500 text-sm mt-1">{errors['landlord0.accountHolder']}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CLABE Interbancaria * (18 dígitos)
          </label>
          <input
            type="text"
            maxLength={18}
            value={primaryLandlord.clabe || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              updateLandlordField(0, 'clabe', value);
            }}
            className={`
              w-full px-3 py-2 border rounded-md font-mono
              ${errors['landlord0.clabe'] ? 'border-red-500' : 'border-gray-300'}
            `}
            placeholder="000000000000000000"
            disabled={!isAdminEdit && !canEdit}
          />
          {errors['landlord0.clabe'] && (
            <p className="text-red-500 text-sm mt-1">{errors['landlord0.clabe']}</p>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Verifique cuidadosamente los datos bancarios.
            Los pagos se realizarán a esta cuenta según lo establecido en el contrato.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
