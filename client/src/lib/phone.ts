/**
 * Utility functions for phone number formatting and display
 */

export function displayPhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");
  
  // Handle different phone number lengths
  if (cleaned.length === 10) {
    // US number without country code: (555) 123-4567
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number with country code: +1 (555) 123-4567
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 11) {
    // International number: +XX XXX XXX XXXX
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const number = cleaned.slice(-10);
    return `+${countryCode} (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  }
  
  // Return original if can't format
  return phone;
}

export function formatPhoneForStorage(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");
  
  // Add country code if missing
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Return with + prefix if not present
  return cleaned.startsWith('+') ? phone : `+${cleaned}`;
}

// Alias for compatibility
export const formatPhoneNumber = formatPhoneForStorage;

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}