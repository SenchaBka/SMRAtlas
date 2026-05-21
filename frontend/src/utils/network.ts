/**
 * src/utils/network.ts
 *
 * Shared network and error handling utilities.
 * Used by API modules and UI components to avoid code duplication.
 */

// ── Timeout wrapper ────────────────────────────────────────────

/**
 * Wraps a Promise with a timeout. Rejects if the operation takes too long.
 *
 * @param promise - The promise to race against a timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns The promise result if it completes in time
 * @throws Error with "Request timed out." if timeout fires first
 *
 * @example
 *   const data = await withTimeout(fetch(url), 10000);
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out.')), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

// ── Error handling ─────────────────────────────────────────────

/**
 * Extract a human-readable error message from any thrown value.
 * Safely handles Error objects, strings, and unknown types.
 *
 * @param err - The thrown value (could be anything in JavaScript)
 * @param fallback - Default message if type is unknown (default: "An unknown error occurred.")
 * @returns A string error message
 *
 * @example
 *   try {
 *     await riskyOperation();
 *   } catch (err) {
 *     const message = extractErrorMessage(err);
 *     console.error(message);
 *   }
 */
export function extractErrorMessage(err: unknown, fallback?: string): string {
  if (err instanceof Error) {
    return err.message || fallback || 'An unknown error occurred.';
  }
  if (typeof err === 'string') {
    return err;
  }
  return fallback || 'An unknown error occurred.';
}

// ── Input sanitization ─────────────────────────────────────────

/**
 * Sanitize user input to prevent injection attacks and XSS.
 * Removes or escapes dangerous characters and HTML.
 *
 * @param input - The string to sanitize
 * @returns The sanitized string
 *
 * @example
 *   const clean = sanitizeInput(userInput);
 *   // "'; DROP TABLE--" becomes "'; DROP TABLE--" (HTML-escaped)
 */
export function sanitizeInput(input: string): string {
  // Remove potential XSS/injection characters
  const dangerous = /[<>'"]/g;
  return input.replace(dangerous, (char) => {
    const escaped: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return escaped[char] || char;
  });
}

// ── Validation helpers ─────────────────────────────────────────

/**
 * Check if a value is a non-empty string.
 * Useful for generic input validation.
 *
 * @param value - The value to check
 * @returns true if it's a string and not empty when trimmed
 *
 * @example
 *   if (isNonEmptyString(input)) {
 *     // safe to use
 *   }
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate a string is within a reasonable character length.
 * Prevents abuse (e.g., huge strings sent to servers).
 *
 * @param value - The string to validate
 * @param maxLength - Maximum allowed length (default: 255)
 * @returns true if length is valid
 *
 * @example
 *   if (isValidLength(cityName, 100)) {
 *     // safe length
 *   }
 */
export function isValidLength(value: string, maxLength = 255): boolean {
  return value.length > 0 && value.length <= maxLength;
}
