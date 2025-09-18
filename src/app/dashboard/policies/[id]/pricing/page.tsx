'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, DollarSign, Package } from 'lucide-react';
import { pricingSchema } from '@/lib/validations/policy';
import { z } from 'zod';

interface PricingData {
  packageId?: string;
  totalPrice: number;
  tenantPercentage: number;
  landlordPercentage: number;
  guarantorType: 'NONE' | 'JOINT_OBLIGOR' | 'AVAL' | 'BOTH';
}

interface Package {
  id: string;
  name: string;
  description?: string;
  pricingType: 'FLAT' | 'PERCENTAGE';
  price: number;
  percentage?: number;
  minimumPrice?: number;
  features?: string;
}

export default function PricingEditPage({
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
  const [packages, setPackages] = useState<Package[]>([]);
  const [rentAmount, setRentAmount] = useState<number>(0);
  const [policyInfo, setPolicyInfo] = useState<{ policyNumber: string; propertyAddress: string } | null>(null);

  const [formData, setFormData] = useState<PricingData>({
    packageId: '',
    totalPrice: 0,
    tenantPercentage: 100,
    landlordPercentage: 0,
    guarantorType: 'NONE',
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

  // Fetch pricing data and packages
  useEffect(() => {
    if (policyId) {
      fetchPricingData();
      fetchPackages();
    }
  }, [policyId]);

  const fetchPricingData = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/pricing`);
      if (!response.ok) throw new Error('Failed to fetch pricing');

      const data = await response.json();

      if (data.success && data.data) {
        setFormData({
          packageId: data.data.packageId || '',
          totalPrice: data.data.totalPrice || 0,
          tenantPercentage: data.data.tenantPercentage || 100,
          landlordPercentage: data.data.landlordPercentage || 0,
          guarantorType: data.data.guarantorType || 'NONE',
        });
        setRentAmount(data.rentAmount || 0);
        setPolicyInfo({
          policyNumber: data.policyNumber || '',
          propertyAddress: data.propertyAddress || '',
        });
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/packages');
      if (!response.ok) throw new Error('Failed to fetch packages');

      const data = await response.json();
      setPackages(data.data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const updateFormData = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };

    // Update percentages when slider changes
    if (field === 'tenantPercentage') {
      newData.landlordPercentage = 100 - value;
    } else if (field === 'landlordPercentage') {
      newData.tenantPercentage = 100 - value;
    }

    // Recalculate price when package changes
    if (field === 'packageId') {
      const selectedPackage = packages.find(p => p.id === value);
      if (selectedPackage) {
        newData.totalPrice = calculatePrice(selectedPackage, rentAmount);
      }
    }

    setFormData(newData);

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const calculatePrice = (pkg: Package, rent: number): number => {
    if (pkg.pricingType === 'FLAT') {
      return pkg.price;
    } else if (pkg.pricingType === 'PERCENTAGE' && pkg.percentage) {
      const calculated = rent * (pkg.percentage / 100);
      return Math.max(calculated, pkg.minimumPrice || 0);
    }
    return 0;
  };

  const validateForm = (): boolean => {
    try {
      pricingSchema.parse(formData);
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
      const response = await fetch(`/api/policies/${policyId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save pricing information');
      }

      setSuccessMessage('Información de precio guardada exitosamente');

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/dashboard/policies/${policyId}`);
      }, 2000);
    } catch (error) {
      console.error('Error saving pricing information:', error);
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

  const getGuarantorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      NONE: 'Sin garantías',
      JOINT_OBLIGOR: 'Obligado Solidario',
      AVAL: 'Aval',
      BOTH: 'Obligado Solidario y Aval',
    };
    return labels[type] || type;
  };

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

  const selectedPackage = packages.find(p => p.id === formData.packageId);

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => router.push(`/dashboard/policies/${policyId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a la póliza
      </Button>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Plan y Precio
          </CardTitle>
          <CardDescription>
            Editar la configuración de precio para la póliza
          </CardDescription>
          {policyInfo && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Póliza:</strong> {policyInfo.policyNumber}<br />
                <strong>Propiedad:</strong> {policyInfo.propertyAddress}<br />
                <strong>Renta Mensual:</strong> {formatCurrency(rentAmount)}
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

          <div className="space-y-6">
            {/* Package Selection */}
            <div>
              <Label htmlFor="packageId">Plan / Paquete</Label>
              <Select
                value={formData.packageId}
                onValueChange={(value) => updateFormData('packageId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un paquete" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin paquete (precio manual)</SelectItem>
                  {packages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{pkg.name}</span>
                        <span className="text-sm text-gray-600">
                          {pkg.pricingType === 'FLAT'
                            ? formatCurrency(pkg.price)
                            : `${pkg.percentage}% de la renta (mín. ${formatCurrency(pkg.minimumPrice || 0)})`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPackage && selectedPackage.description && (
                <p className="text-sm text-gray-600 mt-2">{selectedPackage.description}</p>
              )}
            </div>

            {/* Total Price */}
            <div>
              <Label htmlFor="totalPrice">Precio Total (MXN) *</Label>
              <Input
                id="totalPrice"
                type="number"
                value={formData.totalPrice}
                onChange={(e) => updateFormData('totalPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="100"
                className={errors.totalPrice ? 'border-red-500' : ''}
              />
              {errors.totalPrice && (
                <p className="text-red-500 text-sm mt-1">{errors.totalPrice}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                {formatCurrency(formData.totalPrice)}
              </p>
            </div>

            {/* Guarantor Type */}
            <div>
              <Label htmlFor="guarantorType">Tipo de Garantía *</Label>
              <Select
                value={formData.guarantorType}
                onValueChange={(value) => updateFormData('guarantorType', value)}
              >
                <SelectTrigger className={errors.guarantorType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccione el tipo de garantía" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin garantías</SelectItem>
                  <SelectItem value="JOINT_OBLIGOR">Obligado Solidario</SelectItem>
                  <SelectItem value="AVAL">Aval</SelectItem>
                  <SelectItem value="BOTH">Obligado Solidario y Aval</SelectItem>
                </SelectContent>
              </Select>
              {errors.guarantorType && (
                <p className="text-red-500 text-sm mt-1">{errors.guarantorType}</p>
              )}
            </div>

            {/* Payment Split */}
            <div className="space-y-4">
              <Label>División del Pago</Label>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Inquilino: {formData.tenantPercentage}%</span>
                  <span className="text-sm font-medium">
                    {formatCurrency((formData.totalPrice * formData.tenantPercentage) / 100)}
                  </span>
                </div>
                <Slider
                  value={[formData.tenantPercentage]}
                  onValueChange={([value]) => updateFormData('tenantPercentage', value)}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Arrendador: {formData.landlordPercentage}%</span>
                  <span className="text-sm font-medium">
                    {formatCurrency((formData.totalPrice * formData.landlordPercentage) / 100)}
                  </span>
                </div>
              </div>
              {errors.tenantPercentage && (
                <p className="text-red-500 text-sm">{errors.tenantPercentage}</p>
              )}
            </div>

            {/* Preview Card */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
                  Resumen de Precio
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paquete:</span>
                    <span className="font-medium">
                      {selectedPackage ? selectedPackage.name : 'Precio Manual'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio Total:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(formData.totalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pago Inquilino:</span>
                    <span className="font-medium">
                      {formatCurrency((formData.totalPrice * formData.tenantPercentage) / 100)}
                      <span className="text-gray-500 ml-1">({formData.tenantPercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pago Arrendador:</span>
                    <span className="font-medium">
                      {formatCurrency((formData.totalPrice * formData.landlordPercentage) / 100)}
                      <span className="text-gray-500 ml-1">({formData.landlordPercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Tipo de Garantía:</span>
                    <span className="font-medium">
                      {getGuarantorTypeLabel(formData.guarantorType)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedPackage && selectedPackage.features && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Características del Paquete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {selectedPackage.features}
                  </p>
                </CardContent>
              </Card>
            )}
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