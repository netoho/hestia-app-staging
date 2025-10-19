'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Home } from 'lucide-react';
import { propertySchema } from '@/lib/validations/policy';
import { z } from 'zod';

interface PropertyData {
  propertyAddress: string;
  propertyType: 'HOUSE' | 'APARTMENT' | 'CONDO' | 'TOWNHOUSE' | 'COMMERCIAL' | 'OFFICE' | 'OTHER';
  propertyDescription?: string;
  rentAmount: number;
  contractLength: number;
}

export default function PropertyEditPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [policyId, setPolicyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [policyInfo, setPolicyInfo] = useState<{ policyNumber: string } | null>(null);

  const [formData, setFormData] = useState<PropertyData>({
    propertyAddress: '',
    propertyType: 'HOUSE',
    propertyDescription: '',
    rentAmount: 0,
    contractLength: 12,
  });

  // Check authorization
  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN' && session.user?.role !== 'STAFF') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setPolicyId(resolvedParams.id);
    });
  }, [params]);

  // Fetch property data
  useEffect(() => {
    if (policyId) {
      fetchPropertyData();
    }
  }, [policyId]);

  const fetchPropertyData = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/property`);
      if (!response.ok) throw new Error('Failed to fetch property');

      const data = await response.json();

      if (data.success && data.data) {
        setFormData({
          propertyAddress: data.data.propertyAddress || '',
          propertyType: data.data.propertyType || 'HOUSE',
          propertyDescription: data.data.propertyDescription || '',
          rentAmount: data.data.rentAmount || 0,
          contractLength: data.data.contractLength || 12,
        });
        setPolicyInfo({
          policyNumber: data.policyNumber || '',
        });
      }
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      propertySchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/policies/${policyId}/property`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save property information');
      }

      setSuccessMessage('Información del inmueble guardada exitosamente');

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/dashboard/policies/${policyId}`);
      }, 2000);
    } catch (error) {
      console.error('Error saving property information:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar la información');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const propertyTypes = [
    { value: 'HOUSE', label: 'Casa' },
    { value: 'APARTMENT', label: 'Departamento' },
    { value: 'CONDO', label: 'Condominio' },
    { value: 'TOWNHOUSE', label: 'Casa en Condominio' },
    { value: 'COMMERCIAL', label: 'Local Comercial' },
    { value: 'OFFICE', label: 'Oficina' },
    { value: 'OTHER', label: 'Otro' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => router.push(`/dashboard/policies/${policyId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a la protección
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Información del Inmueble
          </CardTitle>
          <CardDescription>
            Editar la información de la propiedad para la protección
          </CardDescription>
          {policyInfo && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Protección:</strong> {policyInfo.policyNumber}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="propertyAddress">Dirección de la Propiedad *</Label>
              <Textarea
                id="propertyAddress"
                value={formData.propertyAddress}
                onChange={(e) => updateFormData('propertyAddress', e.target.value)}
                placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
                rows={3}
                className={errors.propertyAddress ? 'border-red-500' : ''}
              />
              {errors.propertyAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.propertyAddress}</p>
              )}
            </div>

            <div>
              <Label htmlFor="propertyType">Tipo de Propiedad *</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => updateFormData('propertyType', value)}
              >
                <SelectTrigger className={errors.propertyType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccione el tipo de propiedad" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.propertyType && (
                <p className="text-red-500 text-sm mt-1">{errors.propertyType}</p>
              )}
            </div>

            <div>
              <Label htmlFor="propertyDescription">Descripción de la Propiedad</Label>
              <Textarea
                id="propertyDescription"
                value={formData.propertyDescription}
                onChange={(e) => updateFormData('propertyDescription', e.target.value)}
                placeholder="Descripción adicional de la propiedad (opcional)"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rentAmount">Monto de Renta Mensual (MXN) *</Label>
                <Input
                  id="rentAmount"
                  type="number"
                  value={formData.rentAmount}
                  onChange={(e) => updateFormData('rentAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0"
                  step="100"
                  className={errors.rentAmount ? 'border-red-500' : ''}
                />
                {errors.rentAmount && (
                  <p className="text-red-500 text-sm mt-1">{errors.rentAmount}</p>
                )}
                {formData.rentAmount > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrency(formData.rentAmount)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contractLength">Duración del Contrato (meses) *</Label>
                <Input
                  id="contractLength"
                  type="number"
                  value={formData.contractLength}
                  onChange={(e) => updateFormData('contractLength', parseInt(e.target.value) || 12)}
                  placeholder="12"
                  min="1"
                  max="120"
                  className={errors.contractLength ? 'border-red-500' : ''}
                />
                {errors.contractLength && (
                  <p className="text-red-500 text-sm mt-1">{errors.contractLength}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {formData.contractLength} {formData.contractLength === 1 ? 'mes' : 'meses'}
                </p>
              </div>
            </div>

            {/* Preview Card */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6 space-y-2">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
                  Vista Previa
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dirección:</span>
                    <span className="font-medium text-right max-w-xs">
                      {formData.propertyAddress || 'Sin especificar'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">
                      {propertyTypes.find(t => t.value === formData.propertyType)?.label || formData.propertyType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Renta Mensual:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(formData.rentAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duración:</span>
                    <span className="font-medium">
                      {formData.contractLength} {formData.contractLength === 1 ? 'mes' : 'meses'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/policies/${policyId}`)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
