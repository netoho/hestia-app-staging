'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PropertyType } from '@/lib/enums';
import { PropertyFormData } from '../../types';
import { RefreshCw } from 'lucide-react';
import { generatePolicyNumber } from '@/lib/utils/policy';

interface PropertyStepProps {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
  policyNumberValidation: any;
  onNext: () => void;
}

export default function PropertyStep({
  data,
  onUpdate,
  policyNumberValidation,
  onNext,
}: PropertyStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información de la Propiedad</CardTitle>
        <CardDescription>Ingrese los detalles de la propiedad a asegurar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Policy Number */}
        <div>
          <Label htmlFor="policyNumber" required>
            Número de Póliza
          </Label>
          <div className="flex gap-2">
            <Input
              id="policyNumber"
              value={data.policyNumber}
              onChange={(e) => onUpdate({ policyNumber: e.target.value.toUpperCase() })}
              placeholder="POL-YYYYMMDD-XXX"
              className={policyNumberValidation?.isValid === false ? 'border-red-500' : ''}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onUpdate({ policyNumber: generatePolicyNumber() })}
              title="Generar nuevo número"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {policyNumberValidation?.isValid === false && (
            <p className="text-sm text-red-500 mt-1">{policyNumberValidation.error}</p>
          )}
        </div>

        {/* Internal Code */}
        <div>
          <Label htmlFor="internalCode">Código Interno</Label>
          <Input
            id="internalCode"
            value={data.internalCode}
            onChange={(e) => onUpdate({ internalCode: e.target.value })}
            placeholder="INV1, CONT 1, etc."
          />
        </div>

        {/* Property Address */}
        <div>
          <Label htmlFor="propertyAddress" required>
            Dirección de la Propiedad
          </Label>
          <Textarea
            id="propertyAddress"
            value={data.propertyAddress}
            onChange={(e) => onUpdate({ propertyAddress: e.target.value })}
            placeholder="Calle, Número, Colonia, Ciudad, Estado"
            rows={2}
          />
        </div>

        {/* Property Type */}
        <div>
          <Label htmlFor="propertyType">Tipo de Propiedad</Label>
          <Select
            value={data.propertyType}
            onValueChange={(value) => onUpdate({ propertyType: value as PropertyType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PropertyType.HOUSE}>Casa</SelectItem>
              <SelectItem value={PropertyType.APARTMENT}>Departamento</SelectItem>
              <SelectItem value={PropertyType.COMMERCIAL}>Local Comercial</SelectItem>
              <SelectItem value={PropertyType.OFFICE}>Oficina</SelectItem>
              <SelectItem value={PropertyType.WAREHOUSE}>Bodega</SelectItem>
              <SelectItem value={PropertyType.OTHER}>Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rent and Deposit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rentAmount" required>
              Renta Mensual
            </Label>
            <Input
              id="rentAmount"
              type="number"
              value={data.rentAmount}
              onChange={(e) => onUpdate({ rentAmount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="depositAmount">Depósito</Label>
            <Input
              id="depositAmount"
              type="number"
              value={data.depositAmount}
              onChange={(e) => onUpdate({ depositAmount: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Contract Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" required>
              Fecha de Inicio
            </Label>
            <Input
              id="startDate"
              type="date"
              value={data.startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="endDate" required>
              Fecha de Término
            </Label>
            <Input
              id="endDate"
              type="date"
              value={data.endDate}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
            />
          </div>
        </div>

        {/* Contract Length */}
        <div>
          <Label htmlFor="contractLength">Duración del Contrato (meses)</Label>
          <Input
            id="contractLength"
            type="number"
            value={data.contractLength}
            onChange={(e) => onUpdate({ contractLength: parseInt(e.target.value) || 12 })}
            placeholder="12"
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-end mt-6">
          <Button onClick={onNext}>Siguiente</Button>
        </div>
      </CardContent>
    </Card>
  );
}