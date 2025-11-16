// GDPR regions: EU (27 countries) + EEA (3 countries) + UK + Switzerland + Brazil
export const GDPR_COUNTRIES = [
  // EU Member States (27)
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden

  // EEA (not in EU)
  'IS', // Iceland
  'LI', // Liechtenstein
  'NO', // Norway

  // UK GDPR
  'GB', // United Kingdom
  'UK', // United Kingdom (alternative code)

  // Switzerland (similar data protection)
  'CH', // Switzerland

  // Brazil LGPD (conservative approach)
  'BR', // Brazil
];

export interface GeolocationData {
  country: string;
  country_name: string;
  in_eu: boolean;
}

/**
 * Detect user's country using ipapi.co
 * Free tier: 30,000 requests per month
 */
export async function detectUserCountry(): Promise<string | null> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      console.error('Geolocation API error:', response.status);
      return null;
    }

    const data: GeolocationData = await response.json();
    return data.country || null;
  } catch (error) {
    console.error('Failed to detect user country:', error);
    return null;
  }
}

/**
 * Check if a country code requires GDPR cookie consent
 */
export function requiresCookieConsent(countryCode: string | null): boolean {
  if (!countryCode) {
    // If we can't detect location, show banner to be safe
    return true;
  }

  return GDPR_COUNTRIES.includes(countryCode.toUpperCase());
}
