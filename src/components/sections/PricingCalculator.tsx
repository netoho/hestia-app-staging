'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Building2, Factory, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import type { Package } from '@/lib/types';

// Maximum rent amounts for each package
const maxRentAmounts: Record<string, number | undefined> = {
  'Protección Libertad': undefined,
  'Protección Esencial': 150000,
  'Protección Premium': 100000
};

const commonFeatures = [
  'Investigación de los inquilinos',
  'Contratos',
  'Firma electrónica',
  'Asesoría legal total hasta la recuperación del inmueble'
];

const STEPS = [
  { id: 1, label: 'Ubicación' },
  { id: 2, label: 'Tipo de inmueble' },
  { id: 3, label: 'Monto de renta' },
];

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isPending = currentStep < step.id;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300
                  ${isCompleted ? 'bg-accent text-accent-foreground' : ''}
                  ${isActive ? 'bg-white text-slate-900 ring-4 ring-accent/50' : ''}
                  ${isPending ? 'bg-slate-700 text-slate-400' : ''}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span className={`text-xs mt-2 hidden md:block ${isActive ? 'text-white font-semibold' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div className={`w-8 md:w-16 h-1 mx-2 rounded transition-all duration-300 ${
                currentStep > step.id ? 'bg-accent' : 'bg-slate-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PricingCalculator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [city, setCity] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial' | 'industrial'>('residential');

  const goNext = () => setCurrentStep(s => Math.min(s + 1, 4));
  const goBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  // Handle Enter key to advance steps
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed()) {
      e.preventDefault();
      goNext();
    }
  };

  // Format rent amount with commas for display
  const formatRentDisplay = (value: string) => {
    const num = value.replace(/,/g, '');
    if (!num || isNaN(Number(num))) return '';
    return Number(num).toLocaleString('es-MX');
  };

  // Handle rent input change - store raw number
  const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d+$/.test(raw)) {
      setRentAmount(raw);
    }
  };

  // Use tRPC to fetch packages
  const { data: packages = [], isLoading: loading, error } = trpc.package.getAll.useQuery();

  // Calculate price for each package based on rent amount
  const calculatePackagePrice = (pkg: Package): number => {
    const rent = parseFloat(rentAmount) || 0;

    // For packages without percentage (flat fee)
    if (!pkg.percentage) {
      return pkg.price;
    }

    // For percentage-based packages
    // Calculate percentage of monthly rent
    const percentagePrice = (rent * pkg.percentage) / 100;

    // Return the maximum between minimum price and calculated percentage
    return Math.max(pkg.minAmount || pkg.price, percentagePrice);
  };

  const handleWhatsAppClick = (packageName: string, price: number) => {
    if (!city || !rentAmount) {
      alert('Por favor completa todos los campos antes de continuar');
      return;
    }

    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5521117610';
    const rent = parseFloat(rentAmount);
    const isSpecialPricing = rent > 50000;

    let message: string;
    if (isSpecialPricing) {
      message = `Hola, estoy interesado en contratar el paquete ${packageName} para registrar una protección de arrendamiento en ${city} con un monto de renta de $${rentAmount}. Dado el monto de la renta, me gustaría recibir una cotización especial. ¿Podrían ayudarme con el proceso?`;
    } else {
      const formattedPrice = formatCurrency(price);
      message = `Hola, estoy interesado en contratar el paquete ${packageName} (${formattedPrice} MXN) para registrar una protección de arrendamiento en ${city} con un monto de renta de $${rentAmount}. ¿Podrían ayudarme con el proceso?`;
    }

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

  // Sort packages by price for consistent display
  const sortedPackages = packages.toSorted((a, b) => a.price - b.price);

  // Validation for next step
  const canProceed = () => {
    if (currentStep === 1) return city.trim().length > 0;
    if (currentStep === 2) return propertyType !== undefined;
    if (currentStep === 3) return rentAmount.trim().length > 0 && parseFloat(rentAmount) > 0;
    return true;
  };

  // Loading state
  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary via-slate-900 to-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-headline font-bold text-white mb-4">
              🏠 Protege tu renta en 3 pasos
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Elige la cobertura perfecta para tu inmueble
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-md h-64 bg-slate-800 animate-pulse rounded-lg" />
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary via-slate-900 to-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-headline font-bold text-white mb-4">
              🏠 Protege tu renta en 3 pasos
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              No se pudieron cargar los paquetes. Por favor intenta más tarde.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-primary via-slate-900 to-slate-900 min-h-screen md:min-h-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-headline font-bold text-white mb-4">
            🏠 Protege tu renta en 3 pasos
          </h2>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
            Elige la cobertura perfecta para tu inmueble
          </p>
        </div>

        {/* Step Indicator - hidden on step 4 */}
        {currentStep < 4 && (
          <StepIndicator currentStep={currentStep} totalSteps={3} />
        )}

        {/* Step Content */}
        <div className="flex justify-center">
          {/* Step 1: Location */}
          {currentStep === 1 && (
            <Card
              key="step-1"
              className="w-full max-w-md lg:max-w-lg xl:max-w-xl p-8 lg:p-12 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[60vh] md:min-h-0 flex flex-col justify-center"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">
                  ¿Dónde está el inmueble?
                </h3>
                <p className="text-muted-foreground">
                  Tenemos cobertura nacional
                </p>
              </div>

              <Label htmlFor="city" className="text-primary font-semibold mb-2 block">
                Ciudad o estado
              </Label>
              <Input
                id="city"
                type="text"
                placeholder="Ej: Ciudad de México, Guadalajara..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full text-lg py-6 mb-6"
              />

              <Button
                onClick={goNext}
                disabled={!canProceed()}
                className="w-full py-6 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Siguiente
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Card>
          )}

          {/* Step 2: Property Type */}
          {currentStep === 2 && (
            <Card
              key="step-2"
              className="w-full max-w-md lg:max-w-lg xl:max-w-xl p-8 lg:p-12 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[60vh] md:min-h-0 flex flex-col justify-center"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">
                  ¿Qué tipo de inmueble es?
                </h3>
                <p className="text-muted-foreground">
                  Selecciona el uso que se le dará
                </p>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                <Button
                  variant={propertyType === 'residential' ? 'default' : 'outline'}
                  onClick={() => setPropertyType('residential')}
                  className={`w-full py-6 text-lg justify-start ${propertyType === 'residential' ? 'bg-primary ring-2 ring-accent' : ''}`}
                >
                  <Home className="w-6 h-6 mr-3" />
                  Habitacional
                  <span className="ml-auto text-sm opacity-70">Casa, departamento</span>
                </Button>
                <Button
                  variant={propertyType === 'commercial' ? 'default' : 'outline'}
                  onClick={() => setPropertyType('commercial')}
                  className={`w-full py-6 text-lg justify-start ${propertyType === 'commercial' ? 'bg-primary ring-2 ring-accent' : ''}`}
                >
                  <Building2 className="w-6 h-6 mr-3" />
                  Comercial
                  <span className="ml-auto text-sm opacity-70">Local, oficina</span>
                </Button>
                <Button
                  variant={propertyType === 'industrial' ? 'default' : 'outline'}
                  onClick={() => setPropertyType('industrial')}
                  className={`w-full py-6 text-lg justify-start ${propertyType === 'industrial' ? 'bg-primary ring-2 ring-accent' : ''}`}
                >
                  <Factory className="w-6 h-6 mr-3" />
                  Industrial
                  <span className="ml-auto text-sm opacity-70">Bodega, nave</span>
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  className="flex-1 py-6 text-lg"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Anterior
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="flex-1 py-6 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Rent Amount */}
          {currentStep === 3 && (
            <Card
              key="step-3"
              className="w-full max-w-md lg:max-w-lg xl:max-w-xl p-8 lg:p-12 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[60vh] md:min-h-0 flex flex-col justify-center"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💰</span>
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">
                  ¿Cuánto es la renta mensual?
                </h3>
                <p className="text-muted-foreground">
                  Esto nos ayuda a calcular tu protección
                </p>
              </div>

              <Label htmlFor="rent" className="text-primary font-semibold mb-2 block">
                Monto mensual
              </Label>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-3xl font-bold text-primary">$</span>
                <Input
                  id="rent"
                  type="text"
                  inputMode="numeric"
                  placeholder="15,000"
                  value={formatRentDisplay(rentAmount)}
                  onChange={handleRentChange}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-2xl py-6 font-semibold text-center"
                  autoFocus
                />
                <span className="text-lg font-semibold text-muted-foreground">MXN</span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  className="flex-1 py-6 text-lg"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Anterior
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="flex-1 py-6 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Ver planes
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Step 4: Results */}
        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Summary bar */}
            <div className="bg-slate-800 rounded-lg p-4 mb-8 flex flex-wrap items-center justify-center gap-4 text-slate-300">
              <span>📍 {city}</span>
              <span className="hidden md:inline">•</span>
              <span>
                {propertyType === 'residential' && '🏠 Habitacional'}
                {propertyType === 'commercial' && '🏢 Comercial'}
                {propertyType === 'industrial' && '🏭 Industrial'}
              </span>
              <span className="hidden md:inline">•</span>
              <span>💰 {formatCurrency(parseFloat(rentAmount))} MXN/mes</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              >
                Editar
              </Button>
            </div>

            {/* Package Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {sortedPackages.map((pkg, index) => {
                const calculatedPrice = calculatePackagePrice(pkg);
                const rent = parseFloat(rentAmount) || 0;
                const isSpecialPricing = rent > 50000;
                const showCalculation = rentAmount && pkg.percentage && rent > 0 && !isSpecialPricing;
                const isRecommended = index === 2;
                const maxRent = maxRentAmounts[pkg.name];

                return (
                  <Card
                    key={pkg.id}
                    className={`relative p-8 bg-white shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 ${
                      isRecommended ? 'ring-2 ring-accent border-accent md:scale-105' : ''
                    }`}
                  >
                    {isRecommended && (
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
                    </div>

                    <div className="text-center mb-6">
                      {isSpecialPricing ? (
                        <div>
                          <div className="text-2xl font-bold text-primary mb-2">
                            Contáctanos para un precio especial
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Cotización personalizada para rentas mayores a $50,000
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="text-4xl font-bold text-primary mb-1">
                            {formatCurrency(calculatedPrice)} MXN
                          </div>
                          <p className="text-sm text-muted-foreground">Más IVA</p>

                          {showCalculation && calculatedPrice > (pkg.minAmount || pkg.price) && (
                            <p className="text-xs text-muted-foreground mt-2">
                              ({pkg.percentage}% de renta mensual: {formatCurrency(rent)})
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <Button
                      onClick={() => handleWhatsAppClick(pkg.name, calculatedPrice)}
                      className={`w-full py-6 text-lg font-semibold ${
                        isRecommended
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
            <Card className="bg-white/10 backdrop-blur p-8 border-slate-700">
              <h3 className="text-2xl font-bold text-center text-white mb-6">
                Todas las protecciones incluyen
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                {commonFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-accent text-sm">✓</span>
                    </div>
                    <p className="text-slate-300">{feature}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-slate-400 mt-6">
                La disponibilidad del servicio está sujeta a validación con base en la dirección exacta del inmueble en renta.
              </p>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
