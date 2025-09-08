'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Home, Building2, Factory } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  percentage?: number;
  minAmount?: number;
  features?: string[];
  maxRent?: number;
  recommended?: boolean;
}

const packages: Package[] = [
  {
    id: 'mlegal',
    name: 'Protección MLegal',
    description: 'Servicios legales hasta la recuperación del inmueble',
    basePrice: 3800,
    percentage: undefined, // Flat fee, no percentage
    minAmount: undefined,
    features: [],
    maxRent: undefined
  },
  {
    id: 'm3',
    name: 'Protección M3',
    description: 'Pagamos hasta 3 meses del 100% de la renta por incumplimiento o atraso',
    basePrice: 4100,
    percentage: 40,
    minAmount: 4100,
    features: [],
    maxRent: 150000,
    recommended: true
  },
  {
    id: 'm12',
    name: 'Protección M12',
    description: 'Pagamos hasta 12 meses del 100% de la renta por incumplimiento o atraso',
    basePrice: 5500,
    percentage: 50,
    minAmount: 5500,
    features: [],
    maxRent: 100000
  }
];

const commonFeatures = [
  'Investigación de los inquilinos',
  'Contratos',
  'Firma electrónica',
  'Asesoría legal total hasta la recuperación del inmueble'
];

export function PricingCalculator() {
  const [city, setCity] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial' | 'industrial'>('residential');

  // Calculate price for each package based on rent amount
  const calculatePackagePrice = (pkg: Package): number => {
    const rent = parseFloat(rentAmount) || 0;
    
    // For MLegal (flat fee package)
    if (!pkg.percentage) {
      return pkg.basePrice;
    }
    
    // For percentage-based packages (M3 and M12)
    // Calculate percentage of monthly rent
    const percentagePrice = (rent * pkg.percentage) / 100;
    
    // Return the maximum between minimum price and calculated percentage
    return Math.max(pkg.minAmount || 0, percentagePrice);
  };

  const handleWhatsAppClick = (packageName: string, price: number) => {
    if (!city || !rentAmount) {
      alert('Por favor completa todos los campos antes de continuar');
      return;
    }

    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5551234567';
    const formattedPrice = formatCurrency(price);
    const message = `Hola, estoy interesado en contratar el paquete ${packageName} (${formattedPrice} MXN) para registrar una póliza de arrendamiento en ${city} con un monto de renta de $${rentAmount}. ¿Podrían ayudarme con el proceso?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MX', '');
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
            Calcula el costo de tu protección de renta en segundos
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Elige la cobertura perfecta según el tipo de renta y las necesidades de tu cliente
          </p>
        </div>

        {/* Input Cards Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Location Input */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <Label htmlFor="city" className="text-primary font-semibold mb-3 block">
              Lugar donde se encuentra el inmueble en renta
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Tenemos cobertura nacional, este dato es simmplemente informativo
            </p>
            <Input
              id="city"
              type="text"
              placeholder="Ciudad de México"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-lg py-6"
              required
            />
          </Card>

          {/* Rent Amount Input */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <Label htmlFor="rent" className="text-primary font-semibold mb-3 block">
              ¿Cuál es el monto de renta mensual?
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Indica el valor para calcular la protección
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">$</span>
              <Input
                id="rent"
                type="number"
                placeholder="2,000"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="flex-1 text-lg py-6 font-semibold"
                required
              />
              <span className="text-lg font-semibold text-muted-foreground">MXN</span>
            </div>
          </Card>

          {/* Property Type Selection */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <Label className="text-primary font-semibold mb-3 block">
              ¿Qué uso se dará al inmueble en renta?
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Casa, departamento, etc.
            </p>
            <div className="flex flex-col lg:flex-row gap-2">
              <Button
                variant={propertyType === 'residential' ? 'default' : 'outline'}
                onClick={() => setPropertyType('residential')}
                className={`flex-1 py-4 lg:py-6 ${propertyType === 'residential' ? 'bg-primary' : ''}`}
              >
                <Home className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="text-sm lg:text-base">Habitacional</span>
              </Button>
              <Button
                variant={propertyType === 'commercial' ? 'default' : 'outline'}
                onClick={() => setPropertyType('commercial')}
                className="flex-1 py-4 lg:py-6"
              >
                <Building2 className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="text-sm lg:text-base">Comercial</span>
              </Button>
              <Button
                variant={propertyType === 'industrial' ? 'default' : 'outline'}
                onClick={() => setPropertyType('industrial')}
                className="flex-1 py-4 lg:py-6"
              >
                <Factory className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="text-sm lg:text-base">Industrial</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Package Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {packages.map((pkg) => {
            const calculatedPrice = calculatePackagePrice(pkg);
            const showCalculation = rentAmount && pkg.percentage && parseFloat(rentAmount) > 0;
            
            return (
              <Card 
                key={pkg.id} 
                className={`relative p-8 bg-white shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 ${
                  pkg.recommended ? 'ring-2 ring-accent border-accent' : ''
                }`}
              >
                {pkg.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      Recomendado
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-primary mb-3">
                    {pkg.name}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {pkg.description}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {formatCurrency(calculatedPrice)} MXN
                  </div>
                  <p className="text-sm text-muted-foreground">Más IVA</p>
                  
                  {showCalculation && calculatedPrice > pkg.minAmount! && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ({pkg.percentage}% de renta mensual: {formatCurrency(parseFloat(rentAmount))})
                    </p>
                  )}
                  
                  {pkg.name === 'Protección MLegal' && (
                    <p className="text-sm text-red-600 font-semibold mt-3">
                      No incluye protección financiera.
                    </p>
                  )}
                  
                  {pkg.maxRent && (
                    <div className="mt-4 text-sm">
                      <p className="text-muted-foreground">
                        Monto máximo protegido por mes
                      </p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(pkg.maxRent)} MXN
                      </p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => handleWhatsAppClick(pkg.name, calculatedPrice)}
                  className={`w-full py-6 text-lg font-semibold ${
                    pkg.recommended 
                      ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  Contratar
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <Card className="bg-muted/50 p-8">
          <h3 className="text-2xl font-bold text-center text-primary mb-6">
            Todas las protecciones incluyen
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            {commonFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent text-sm">✓</span>
                </div>
                <p className="text-muted-foreground">{feature}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            La disponibilidad del servicio está sujeta a validación con base en la dirección exacta del inmueble en renta.
          </p>
        </Card>
      </div>
    </section>
  );
}
