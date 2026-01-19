/**
 * Google Maps Service
 * Handles all interactions with Google Maps APIs
 */

import { BaseService } from './base/BaseService';
import { ServiceError, ErrorCode } from './types/errors';

interface GooglePlaceResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

interface GooglePlaceDetails {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  addressComponents: {
    street?: string;
    streetNumber?: string;
    neighborhood?: string;
    postalCode?: string;
    municipality?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface ParsedAddress {
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

// New Places API response types
interface AutocompleteSuggestion {
  placePrediction?: {
    placeId: string;
    text: {
      text: string;
      matches?: { startOffset: number; endOffset: number }[];
    };
    structuredFormat?: {
      mainText: { text: string };
      secondaryText: { text: string };
    };
    types?: string[];
  };
}

interface GoogleAddressComponent {
  longText: string;
  shortText: string;
  types: string[];
  languageCode?: string;
}

class GoogleMapsService extends BaseService {
  private apiKey: string | undefined;

  constructor() {
    super();
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new ServiceError(ErrorCode.INTERNAL_ERROR, 'Google Maps API key is not configured', 500);
    }
  }

  /**
   * Search for place predictions using Google Places Autocomplete (New)
   */
  async searchPlaces(
    input: string,
    sessionToken?: string,
    _countryRestriction: string = 'mx'
  ): Promise<GooglePlaceResult[]> {
    this.ensureApiKey();

    if (!input || input.length < 3) {
      return [];
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey!,
    };

    if (sessionToken) {
      headers['X-Goog-Session-Token'] = sessionToken;
    }

    const body = {
      input,
      includedRegionCodes: [_countryRestriction],
      languageCode: 'es',
      includedPrimaryTypes: ['street_address', 'subpremise'],
    };

    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (data.error) {
        this.log('error', 'Google Places API error', { error: data.error });
        return [];
      }

      return (data.suggestions || [])
        .filter((s: AutocompleteSuggestion) => s.placePrediction)
        .map((suggestion: AutocompleteSuggestion) => {
          const prediction = suggestion.placePrediction!;
          return {
            placeId: prediction.placeId,
            description: prediction.text.text,
            mainText: prediction.structuredFormat?.mainText.text || '',
            secondaryText: prediction.structuredFormat?.secondaryText.text || '',
            types: prediction.types || [],
          };
        });
    } catch (error) {
      this.log('error', 'Error searching places', error);
      return [];
    }
  }

  /**
   * Get detailed information about a place using Places API (New)
   */
  async getPlaceDetails(
    placeId: string,
    sessionToken?: string
  ): Promise<GooglePlaceDetails | null> {
    this.ensureApiKey();

    const headers: Record<string, string> = {
      'X-Goog-Api-Key': this.apiKey!,
      'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location,shortFormattedAddress',
      'Accept-Language': 'es',
    };

    if (sessionToken) {
      headers['X-Goog-Session-Token'] = sessionToken;
    }

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: 'GET',
          headers,
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (data.error) {
        this.log('error', 'Google Place Details API error', { error: data.error });
        return null;
      }

      let components = this.parseAddressComponents(data.addressComponents || []);

      // If administrative_area_level_2 (municipality/alcaldía) is missing, try reverse geocoding with coordinates
      const lat = data.location?.latitude;
      const lng = data.location?.longitude;
      if (!components.municipality && lat && lng) {
        const municipality = await this.findMunicipalityByCoordinates(lat, lng);
        if (municipality) {
          components = { ...components, municipality };
        }
      }

      // Final fallback: use city if municipality is still missing
      if (!components.municipality && components.city) {
        components = { ...components, municipality: components.city };
      }

      return {
        placeId,
        formattedAddress: data.formattedAddress || '',
        latitude: lat || 0,
        longitude: lng || 0,
        addressComponents: components,
      };
    } catch (error) {
      this.log('error', 'Error getting place details', error);
      return null;
    }
  }

  /**
   * Find municipality by searching ALL reverse geocoding results for admin levels 2 or 3
   */
  private async findMunicipalityByCoordinates(lat: number, lng: number): Promise<string | null> {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.apiKey!,
      language: 'es',
    });

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        return null;
      }

      // Search through ALL results for administrative_area_level_2 or _level_3
      for (const result of data.results) {
        for (const component of result.address_components || []) {
          const types: string[] = component.types || [];
          if (types.includes('administrative_area_level_2') || types.includes('administrative_area_level_3')) {
            return component.long_name;
          }
        }
      }

      return null;
    } catch (error) {
      this.log('error', 'Error finding municipality by coordinates', error);
      return null;
    }
  }

  /**
   * Parse Google's address components into our format (New API uses camelCase)
   */
  private parseAddressComponents(components: GoogleAddressComponent[]): GooglePlaceDetails['addressComponents'] {
    const result: GooglePlaceDetails['addressComponents'] = {};

    for (const component of components) {
      const types = component.types;
      const value = component.longText;

      if (types.includes('street_number')) {
        result.streetNumber = value;
      } else if (types.includes('route')) {
        result.street = value;
      } else if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
        result.neighborhood = value;
      } else if (types.includes('postal_code')) {
        result.postalCode = value;
      } else if (types.includes('administrative_area_level_2')) {
        // Municipality/Alcaldía (e.g., Benito Juárez in CDMX)
        result.municipality = value;
      } else if (types.includes('locality')) {
        result.city = value;
        // Don't set municipality from locality - let reverse geocoding handle it
      } else if (types.includes('administrative_area_level_1')) {
        result.state = value;
      } else if (types.includes('country')) {
        result.country = value;
      }
    }

    return result;
  }

  /**
   * Parse a Google Place into our PropertyAddress format
   */
  async parseGooglePlaceToAddress(
    placeId: string,
    sessionToken?: string,
    additionalInfo?: { interiorNumber?: string }
  ): Promise<ParsedAddress | null> {
    const details = await this.getPlaceDetails(placeId, sessionToken);

    if (!details) {
      return null;
    }

    const components = details.addressComponents;

    return {
      street: components.street || '',
      exteriorNumber: components.streetNumber || '',
      interiorNumber: additionalInfo?.interiorNumber,
      neighborhood: components.neighborhood || '',
      postalCode: components.postalCode || '',
      municipality: components.municipality || '',
      city: components.city || components.municipality || '',
      state: components.state || '',
      country: components.country || 'México',
      placeId: details.placeId,
      latitude: details.latitude,
      longitude: details.longitude,
      formattedAddress: details.formattedAddress,
    };
  }

  /**
   * Validate a Mexican postal code
   */
  validateMexicanPostalCode(postalCode: string): boolean {
    return /^\d{5}$/.test(postalCode);
  }

  /**
   * Format an address for display
   */
  formatAddress(address: Partial<ParsedAddress>): string {
    const parts = [];

    if (address.street) {
      let streetPart = address.street;
      if (address.exteriorNumber) {
        streetPart += ` ${address.exteriorNumber}`;
      }
      if (address.interiorNumber) {
        streetPart += ` Int. ${address.interiorNumber}`;
      }
      parts.push(streetPart);
    }

    if (address.neighborhood) {
      parts.push(`Col. ${address.neighborhood}`);
    }

    if (address.municipality && address.state) {
      parts.push(`${address.municipality}, ${address.state}`);
    } else if (address.municipality) {
      parts.push(address.municipality);
    } else if (address.state) {
      parts.push(address.state);
    }

    if (address.postalCode) {
      parts.push(`C.P. ${address.postalCode}`);
    }

    if (address.country && address.country !== 'México') {
      parts.push(address.country);
    }

    return parts.join(', ');
  }

  /**
   * Geocode an address string to get coordinates using Text Search (New)
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    this.ensureApiKey();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey!,
      'X-Goog-FieldMask': 'places.location',
    };

    const body = {
      textQuery: address,
      languageCode: 'es',
      regionCode: 'MX',
    };

    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (data.error || !data.places?.length) {
        this.log('error', 'Text Search API error', { error: data.error });
        return null;
      }

      const location = data.places[0].location;
      return location ? { lat: location.latitude, lng: location.longitude } : null;
    } catch (error) {
      this.log('error', 'Error geocoding address', error);
      return null;
    }
  }

  /**
   * Validate that an address is complete
   */
  validateAddress(address: Partial<ParsedAddress>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address.street) {
      errors.push('La calle es requerida');
    }

    if (!address.exteriorNumber) {
      errors.push('El número exterior es requerido');
    }

    if (!address.neighborhood) {
      errors.push('La colonia es requerida');
    }

    if (!address.postalCode) {
      errors.push('El código postal es requerido');
    } else if (!this.validateMexicanPostalCode(address.postalCode)) {
      errors.push('El código postal debe ser de 5 dígitos');
    }

    if (!address.municipality) {
      errors.push('El municipio/alcaldía es requerido');
    }

    if (!address.state) {
      errors.push('El estado es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();
