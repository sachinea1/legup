/**
 * Phone number utilities for formatting and validation
 */

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits first
  const cleaned = phone.replace(/\D/g, "");
  
  // Handle empty or invalid input
  if (!cleaned || cleaned.length < 10) {
    throw new Error(`Invalid phone number: ${phone}`);
  }
  
  // US/Canada numbers (10 digits) - add +1 prefix
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // US/Canada numbers with country code (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // International numbers - add + prefix if not present
  if (cleaned.length > 11) {
    return `+${cleaned}`;
  }
  
  // Default: add +1 for unrecognized format (assume US)
  return `+1${cleaned}`;
}

export function displayPhoneNumber(phone: string): string {
  try {
    const formatted = formatPhoneNumber(phone);
    
    // Format US/Canada numbers for display
    if (formatted.startsWith('+1') && formatted.length === 12) {
      const number = formatted.slice(2);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    
    return formatted;
  } catch {
    return phone; // Return original if formatting fails
  }
}

export function validatePhoneNumber(phone: string): boolean {
  try {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10;
  } catch {
    return false;
  }
}