/**
 * cityApi.ts
 *
 * Responsible for all HTTP communication with the backend's /api/city endpoint.
 * Keeps network logic isolated so other modules never touch `fetch` directly.
 *
 * Exports:
 *   - CityResponse   — shape of a successful API response
 *   - fetchCityData  — sends a city name to the backend and returns the result,
 *                      or throws an Error with the server's message on failure
 */

const API_URL = 'http://localhost:5000/api/city';

/** Shape returned by the backend on success */
export interface CityResponse {
  message: string;
}

/** Shape returned by the backend on error */
interface CityErrorResponse {
  error: string;
}

/**
 * POST a city name to the backend and return the response.
 * Throws an `Error` if the network call fails or the server returns a non-2xx status.
 */
export async function fetchCityData(city: string): Promise<CityResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city }),
  });

  const data: CityResponse | CityErrorResponse = await res.json();

  if (!res.ok) {
    throw new Error((data as CityErrorResponse).error ?? 'An error occurred.');
  }

  return data as CityResponse;
}
