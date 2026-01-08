/**
 * Utility functions for handling address data cleanup
 * Removes database metadata fields from address objects
 */

/**
 * Clean a single address object by removing database metadata
 */
export function cleanAddress(address: any): any {
  if (!address) return address;

  const { id, createdAt, updatedAt, ...cleanAddress } = address;
  return cleanAddress;
}

/**
 * Clean multiple address fields in a form data object
 * @param data - The form data object containing address fields
 * @param addressFields - Array of field names that contain address objects
 * @returns The data object with cleaned addresses
 */
export function cleanFormAddresses(data: any, addressFields: string[]): any {
  const cleaned = { ...data };

  addressFields.forEach(field => {
    if (cleaned[field]) {
      cleaned[field] = cleanAddress(cleaned[field]);
    }
  });

  return cleaned;
}

/**
 * Common address fields used across different actor types
 */
export const COMMON_ADDRESS_FIELDS = {
  tenant: ['addressDetails', 'employerAddressDetails', 'previousRentalAddressDetails'],
  aval: ['addressDetails', 'employerAddressDetails', 'propertyAddressDetails'],
  jointObligor: ['addressDetails', 'employerAddressDetails', 'propertyAddressDetails'],
  landlord: ['personalAddressDetails', 'propertyAddressDetails']
};