'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

interface AddressData {
  id?: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  postalCode: string;
  municipality: string;
  city: string;
  state: string;
  country: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

interface AddressAutocompleteProps {
  value?: Partial<AddressData>;
  onChange: (address: AddressData) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  showFullForm?: boolean; // Show all fields expanded
}

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export function AddressAutocomplete({
  value = {},
  onChange,
  onBlur,
  disabled = false,
  error,
  label = 'Dirección',
  placeholder = 'Buscar dirección...',
  required = false,
  className,
  showFullForm = false,
}: AddressAutocompleteProps) {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showManualForm, setShowManualForm] = useState(showFullForm);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [formData, setFormData] = useState<AddressData>({
    id: value?.id || '',
    street: value?.street || '',
    exteriorNumber: value?.exteriorNumber || '',
    interiorNumber: value?.interiorNumber || '',
    neighborhood: value?.neighborhood || '',
    postalCode: value?.postalCode || '',
    municipality: value?.municipality || '',
    city: value?.city || '',
    state: value?.state || '',
    country: value?.country || 'México',
    placeId: value?.placeId,
    latitude: value?.latitude,
    longitude: value?.longitude,
    formattedAddress: value?.formattedAddress,
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Update form data when value prop changes
  useEffect(() => {
    if (value) {
      setFormData(prev => ({
        ...prev,
        ...value,
        country: value.country || 'México',
      }));

      // Set search input to formatted address if available
      if (value.formattedAddress) {
        setSearchInput(value.formattedAddress);
      } else if (value.street) {
        const parts = [];
        if (value.street) {
          let streetPart = value.street;
          if (value.exteriorNumber) streetPart += ` ${value.exteriorNumber}`;
          if (value.interiorNumber) streetPart += ` Int. ${value.interiorNumber}`;
          parts.push(streetPart);
        }
        if (value.neighborhood) parts.push(value.neighborhood);
        if (value.municipality) parts.push(value.municipality);
        setSearchInput(parts.join(', '));
      }
    } else {
      // Reset to empty state if value is null/undefined
      setFormData({
        street: '',
        exteriorNumber: '',
        interiorNumber: '',
        neighborhood: '',
        postalCode: '',
        municipality: '',
        city: '',
        state: '',
        country: 'México',
      });
      setSearchInput('');
    }
  }, [value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for addresses
  const searchAddresses = useCallback(
    debounce(async (input: string) => {
      if (!input || input.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/address/autocomplete?${new URLSearchParams({
            input,
            sessionToken,
            country: 'mx',
          })}`
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.results || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error searching addresses:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [sessionToken]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (value.length >= 3) {
      searchAddresses(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setIsLoading(true);
    setShowSuggestions(false);
    setSearchInput(suggestion.description);

    try {
      const response = await fetch(
        `/api/address/details?${new URLSearchParams({
          placeId: suggestion.placeId,
          sessionToken,
          ...(formData.interiorNumber ? { interiorNumber: formData.interiorNumber } : {}),
        })}`
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address as AddressData;

        // Preserve interior number if it was manually entered
        if (formData.interiorNumber) {
          address.interiorNumber = formData.interiorNumber;
        }

        setFormData(address);
        onChange(address);

        // Show manual form to allow editing
        setShowManualForm(true);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual form field change
  const handleFieldChange = (field: keyof AddressData, value: string | number) => {
    const newData = {
      ...formData,
      [field]: value,
    };
    setFormData(newData);
    onChange(newData as AddressData);
  };

  // Clear address
  const handleClear = () => {
    const emptyAddress: AddressData = {
      street: '',
      exteriorNumber: '',
      interiorNumber: '',
      neighborhood: '',
      postalCode: '',
      municipality: '',
      city: '',
      state: '',
      country: '',
    };
    setFormData(emptyAddress);
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(emptyAddress);
  };

  return (
    <div className={cn('space-y-4', className)} ref={wrapperRef}>
      {/* Search Input */}
      <div className="space-y-2">
        {label && (
          <Label htmlFor="address-search">
            {label} {required && <span>*</span>}
          </Label>
        )}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="address-search"
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'pl-10 pr-10',
                error && 'border-red-500'
              )}
            />
            {searchInput && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            {isLoading && (
              <Loader2 className="absolute right-10 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-auto">
              <CardContent className="p-0">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <div className="font-medium">{suggestion.mainText}</div>
                    <div className="text-sm text-gray-500">{suggestion.secondaryText}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Toggle Manual Form */}
      {!showFullForm && (
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showManualForm ? 'Ocultar campos' : 'Ingresar manualmente'}
        </button>
      )}

      {/* Manual Form Fields */}
      {showManualForm && (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="street">Calle *</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => handleFieldChange('street', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="exteriorNumber">No. Exterior *</Label>
                <Input
                  id="exteriorNumber"
                  value={formData.exteriorNumber}
                  onChange={(e) => handleFieldChange('exteriorNumber', e.target.value)}
                  disabled={disabled}
                  required
                />
              </div>
              <div>
                <Label htmlFor="interiorNumber">No. Interior</Label>
                <Input
                  id="interiorNumber"
                  value={formData.interiorNumber}
                  onChange={(e) => handleFieldChange('interiorNumber', e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="neighborhood">Colonia *</Label>
              <Input
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Código Postal *</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                maxLength={5}
                disabled={disabled}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="municipality">Municipio/Alcaldía *</Label>
              <Input
                id="municipality"
                value={formData.municipality}
                onChange={(e) => handleFieldChange('municipality', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
            <div>
              <Label htmlFor="country">País *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                disabled={disabled}
                required
              />
            </div>
          </div>

          {formData.placeId && (
            <div className="text-xs text-gray-500">
              <p className='text-ellipsis overflow-auto'>Google Place ID: {formData.placeId}</p>
              {formData.latitude && formData.longitude && (
                <p>Coordenadas: {formData.latitude}, {formData.longitude}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
