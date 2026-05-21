/**
 * src/api/cityApi.ts
 *
 * Network layer for city energy demand lookups.
 * Handles all communication with the backend /api/city endpoint.
 * Delegates common network utilities to src/utils/network.ts.
 */

import { withTimeout, extractErrorMessage, isNonEmptyString, isValidLength } from '../utils/network';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/city';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10);

/** Standard HTTP headers for JSON requests */
const HEADERS = {
  'Content-Type': 'application/json',
} as const;


/** Shape returned by the backend on success */
export interface CityResponse {
  message: string;
}

/** Shape returned by the backend on error */
interface CityErrorResponse {
  error: string;
}

// ── Logging (disabled in production, enabled in dev) ─────────

const isDev = import.meta.env.DEV;

function logApiCall(city: string): void {
  if (isDev) {
    console.log(`[API] POST ${API_URL}`, { city });
  }
}

function logApiSuccess(city: string, response: CityResponse): void {
  if (isDev) {
    console.log(`[API] Success:`, { city, message: response.message });
  }
}

function logApiError(city: string, error: Error): void {
  if (isDev) {
    console.error(`[API] Error:`, { city, error: error.message });
  }
}


/**
 * Validate and normalize a city name input.
 * Uses shared validation helpers from utils/network.ts.
 *
 * @param city - The city name to validate
 * @returns The validated (trimmed) city name
 * @throws Error if city is invalid
 */
function validateCity(city: string): string {
  if (!isNonEmptyString(city)) {
    throw new Error('City name cannot be empty.');
  }

  const trimmed = city.trim();

  if (!isValidLength(trimmed, 168)) {
    throw new Error('City name must be 168 characters or less.');
  }

  return trimmed;
}


// ── Error handling ──────────────────────────────────────────────

/**
 * Extract error message and log it (dev-only).
 * Wraps the shared extractErrorMessage utility with API-specific logging.
 */
function handleApiError(city: string, err: unknown): Error {
  const message = extractErrorMessage(err, 'An error occurred.');
  const error = new Error(message);
  logApiError(city, error);
  return error;
}


/**
 * POST a city name to the backend and return the response.
 *
 * @param city - The city name to look up
 * @returns Promise resolving to the server's response
 * @throws Error if validation fails, network fails, or server returns an error
 *
 * @example
 *   const response = await fetchCityData('Toronto');
 *   console.log(response.message); // e.g., "Toronto has a demand of 15 GW"
 */
export async function fetchCityData(city: string): Promise<CityResponse> {
  // Validate input
  const validCity = validateCity(city);
  logApiCall(validCity);

  try {
    // Make the request with a timeout
    const res = await withTimeout(
      fetch(API_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ city: validCity }),
      }),
      REQUEST_TIMEOUT_MS
    );

    // Parse response
    const data: CityResponse | CityErrorResponse = await res.json();

    // Check HTTP status
    if (!res.ok) {
      const errorMsg = (data as CityErrorResponse).error ?? 'An error occurred.';
      throw handleApiError(validCity, new Error(errorMsg));
    }

    logApiSuccess(validCity, data as CityResponse);
    return data as CityResponse;
  } catch (err) {
    // Use shared error extraction, then log and re-throw
    throw handleApiError(validCity, err);
  }
}
