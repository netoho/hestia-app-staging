'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import { trpc } from '@/lib/trpc/client';
import { isAddressComplete } from '@/lib/schemas/shared/address.schema';

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

export type AddressValidationState = 'empty' | 'typing' | 'loading' | 'validated' | 'manual';

interface AddressAutocompleteProps {
  value?: Partial<AddressData>;
  onChange: (address: AddressData) => void;
  onValidationStateChange?: (state: AddressValidationState, isComplete: boolean) => void;
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
  onValidationStateChange,
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
  const [showManualForm, setShowManualForm] = useState(true);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [validationState, setValidationState] = useState<AddressValidationState>('empty');
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
  const utils = trpc.useUtils();

  // Update validation state and notify parent
  const updateValidationState = useCallback((newState: AddressValidationState, address: Partial<AddressData>) => {
    setValidationState(newState);
    const complete = isAddressComplete(address);
    onValidationStateChange?.(newState, complete);
  }, [onValidationStateChange]);

  // Update form data when value prop changes
  useEffect(() => {
    if (value) {
      const newFormData = {
        ...formData,
        ...value,
        country: value.country || 'México',
      };
      setFormData(newFormData);

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

      // Determine initial validation state
      if (isAddressComplete(newFormData)) {
        if (value.placeId) {
          updateValidationState('validated', newFormData);
        } else {
          updateValidationState('manual', newFormData);
        }
      } else if (value.street || value.neighborhood) {
        updateValidationState('typing', newFormData);
      }
    } else {
      // Reset to empty state if value is null/undefined
      const emptyData = {
        street: '',
        exteriorNumber: '',
        interiorNumber: '',
        neighborhood: '',
        postalCode: '',
        municipality: '',
        city: '',
        state: '',
        country: 'México',
      };
      setFormData(emptyData);
      setSearchInput('');
      updateValidationState('empty', emptyData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Search for addresses using tRPC
  const searchAddresses = useCallback(
    debounce(async (input: string) => {
      if (!input || input.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await utils.address.autocomplete.fetch({
          input,
          sessionToken,
          country: 'mx',
        });

        setSuggestions(data.results || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [sessionToken, utils]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setSearchInput(inputValue);

    if (inputValue.length >= 3) {
      updateValidationState('typing', formData);
      searchAddresses(inputValue);
    } else if (inputValue.length > 0) {
      updateValidationState('typing', formData);
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      updateValidationState('empty', formData);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection using tRPC
  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setIsLoading(true);
    setShowSuggestions(false);
    setSearchInput(suggestion.description);
    updateValidationState('loading', formData);

    try {
      const data = await utils.address.details.fetch({
        placeId: suggestion.placeId,
        sessionToken,
        interiorNumber: formData.interiorNumber || undefined,
      });

      if (data.address) {
        const address = data.address as AddressData;

        // Preserve interior number if it was manually entered
        if (formData.interiorNumber) {
          address.interiorNumber = formData.interiorNumber;
        }

        setFormData(address);
        onChange(address);
        updateValidationState('validated', address);

        // Show manual form to allow editing
        setShowManualForm(true);
      }
    } catch {
      // Error - revert to typing state
      updateValidationState('typing', formData);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual form field change
  const handleFieldChange = (field: keyof AddressData, fieldValue: string | number) => {
    const newData = {
      ...formData,
      [field]: fieldValue,
    };
    setFormData(newData);
    onChange(newData as AddressData);

    // Update validation state based on completeness
    if (isAddressComplete(newData)) {
      updateValidationState('manual', newData);
    } else if (validationState !== 'validated') {
      // Keep typing state if manually editing incomplete address (unless it was validated from API)
      updateValidationState('typing', newData);
    }
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
    setShowManualForm(true);
    onChange(emptyAddress);
    updateValidationState('empty', emptyAddress);
  };

  // Get border color based on validation state
  const getBorderClass = () => {
    if (error) return 'border-red-500 focus:ring-red-500';
    switch (validationState) {
      case 'validated':
        return 'border-green-500 focus:ring-green-500';
      case 'typing':
        return 'border-yellow-500 focus:ring-yellow-500';
      case 'manual':
        return isAddressComplete(formData) ? 'border-green-500 focus:ring-green-500' : 'border-blue-500 focus:ring-blue-500';
      case 'loading':
        return 'border-blue-400 focus:ring-blue-400';
      default:
        return '';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (validationState) {
      case 'validated':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'typing':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'manual':
        return isAddressComplete(formData) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : null;
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-4', className)} ref={wrapperRef}>
      {/* Search Input */}
      <div className="space-y-2">
        {label && (
          <Label htmlFor={`address-search-${sessionToken}`}>
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id={`address-search-${sessionToken}`}
              name={`address_${sessionToken}`}
              autoComplete="new-password"
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'pl-10 pr-16',
                getBorderClass()
              )}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {getStatusIcon()}
              {searchInput && !disabled && !isLoading && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-1"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
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
          {showManualForm ? 'Ocultar campos' : 'Mostrar campos'}
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
