/**
 * Google Maps Service
 * Handles all interactions with Google Maps APIs
 */

import { PropertyAddress } from '@prisma/client';

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

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Search for place predictions using Google Places Autocomplete
 */
export async function searchPlaces(
  input: string,
  sessionToken?: string,
  countryRestriction: string = 'mx'
): Promise<GooglePlaceResult[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured');
  }

  if (!input || input.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    input,
    key: GOOGLE_MAPS_API_KEY,
    types: 'address',
    language: 'es',
    components: `country:${countryRestriction}`,
  });

  if (sessionToken) {
    params.append('sessiontoken', sessionToken);
  }

  console.log('Fetching places with params:', params.toString());

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
      { cache: 'no-store' }
    );

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return [];
    }

    return (data.predictions || []).map((prediction: any) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || '',
      secondaryText: prediction.structured_formatting?.secondary_text || '',
      types: prediction.types || [],
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

/**
 * Get detailed information about a place
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<GooglePlaceDetails | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured');
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_MAPS_API_KEY,
    fields: 'formatted_address,geometry,address_components',
    language: 'es',
  });

  if (sessionToken) {
    params.append('sessiontoken', sessionToken);
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
      { cache: 'no-store' }
    );

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Place Details API error:', data.status, data.error_message);
      return null;
    }

    const result = data.result;
    const components = parseAddressComponents(result.address_components || []);

    return {
      placeId,
      formattedAddress: result.formatted_address || '',
      latitude: result.geometry?.location?.lat || 0,
      longitude: result.geometry?.location?.lng || 0,
      addressComponents: components,
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * Parse Google's address components into our format
 */
function parseAddressComponents(components: any[]): GooglePlaceDetails['addressComponents'] {
  const result: GooglePlaceDetails['addressComponents'] = {};

  for (const component of components) {
    const types = component.types || [];
    const value = component.long_name;

    if (types.includes('street_number')) {
      result.streetNumber = value;
    } else if (types.includes('route')) {
      result.street = value;
    } else if (types.includes('sublocality_level_1') || types.includes('neighborhood')) {
      result.neighborhood = value;
    } else if (types.includes('postal_code')) {
      result.postalCode = value;
    } else if (types.includes('locality')) {
      result.municipality = value;
      result.city = value; // In Mexico, locality often represents the city
    } else if (types.includes('administrative_area_level_1')) {
      result.state = value;
    } else if (types.includes('country')) {
      result.country = value;
    }
  }

  // For Mexico City, handle the special case where it might be administrative_area_level_2
  if (!result.municipality) {
    const adminArea2 = components.find(c => c.types?.includes('administrative_area_level_2'));
    if (adminArea2) {
      result.municipality = adminArea2.long_name;
    }
  }

  return result;
}

/**
 * Parse a Google Place into our PropertyAddress format
 */
export async function parseGooglePlaceToAddress(
  placeId: string,
  sessionToken?: string,
  additionalInfo?: { interiorNumber?: string }
): Promise<ParsedAddress | null> {
  const details = await getPlaceDetails(placeId, sessionToken);

  if (!details) {
    return null;
  }

  const components = details.addressComponents;

  // Build the parsed address
  const parsed: ParsedAddress = {
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

  return parsed;
}

/**
 * Validate a Mexican postal code
 */
export function validateMexicanPostalCode(postalCode: string): boolean {
  // Mexican postal codes are 5 digits
  return /^\d{5}$/.test(postalCode);
}

/**
 * Format an address for display
 */
export function formatAddress(address: Partial<ParsedAddress>): string {
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
 * Geocode an address string to get coordinates
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured');
  }

  const params = new URLSearchParams({
    address,
    key: GOOGLE_MAPS_API_KEY,
    region: 'mx',
    language: 'es',
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { cache: 'no-store' }
    );

    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.error('Geocoding API error:', data.status);
      return null;
    }

    const location = data.results[0].geometry?.location;
    return location ? { lat: location.lat, lng: location.lng } : null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Validate that an address is complete
 */
export function validateAddress(address: Partial<ParsedAddress>): {
  isValid: boolean;
  errors: string[]
} {
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
  } else if (!validateMexicanPostalCode(address.postalCode)) {
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
