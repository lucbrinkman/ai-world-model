import { SLIDER_COUNT, SLIDER_DEFAULT_VALUE } from './types';

/**
 * Encode slider values to URL-friendly string
 * Format: "50i70i25i96i..." (values separated by 'i')
 */
export function encodeSliderValues(sliderValues: number[]): string {
  return sliderValues.join('i');
}

/**
 * Decode slider values from URL string
 * Returns array of slider values or default values if invalid
 */
export function decodeSliderValues(encodedString: string): number[] {
  if (!encodedString) {
    return Array(SLIDER_COUNT).fill(SLIDER_DEFAULT_VALUE);
  }

  const parts = encodedString.split('i');
  const values: number[] = [];

  for (let i = 0; i < SLIDER_COUNT; i++) {
    const value = parseInt(parts[i]);
    values.push(isRealNumber(value) ? value : SLIDER_DEFAULT_VALUE);
  }

  return values;
}

/**
 * Update URL with current slider values
 */
export function updateUrlWithSliderValues(sliderValues: number[]): void {
  if (typeof window === 'undefined') return;

  const encoded = encodeSliderValues(sliderValues);
  const params = new URLSearchParams(window.location.search);
  params.set('p', encoded);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

/**
 * Read slider values from URL query param 'p'
 */
export function readSliderValuesFromUrl(): number[] {
  if (typeof window === 'undefined') {
    return Array(SLIDER_COUNT).fill(SLIDER_DEFAULT_VALUE);
  }

  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('p') || '';
  return decodeSliderValues(encoded);
}

/**
 * Helper: Check if value is a real number
 */
function isRealNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value);
}
