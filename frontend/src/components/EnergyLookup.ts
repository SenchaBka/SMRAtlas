import { fetchCityData } from '../api/cityApi';
import { withTimeout, extractErrorMessage } from '../utils/network';

const MESSAGES = {
  LOADING: 'Loading…',
  EMPTY_INPUT: 'Please enter a city name.',
  CONNECTION_ERROR: 'Could not connect to the server.',
  TIMEOUT: 'Request timed out. Please try again.',
} as const;

const CONFIG = {
  REQUEST_TIMEOUT_MS: 10000, // 10 seconds
  MIN_INPUT_LENGTH: 1,
} as const;

/**
 * EnergyLookup — UI component for the city energy demand lookup.
*/

export class EnergyLookup {
  private readonly cityInput: HTMLInputElement;
  private readonly submitBtn: HTMLButtonElement;
  private readonly responseEl: HTMLElement;
  private isLoading = false; // track loading state to prevent double-submit

  constructor() {
    this.cityInput = this.getElement<HTMLInputElement>('cityInput');
    this.submitBtn = this.getElement<HTMLButtonElement>('submitBtn');
    this.responseEl = this.getElement<HTMLElement>('response');

    // Add accessibility attributes
    this.responseEl.setAttribute('role', 'status');
    this.responseEl.setAttribute('aria-live', 'polite');

    this.bindEvents();
  }

  private bindEvents(): void {
    this.submitBtn.addEventListener('click', () => void this.handleSubmit());

    this.cityInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !this.isLoading) {
        e.preventDefault(); // prevent form submission if inside a <form>
        void this.handleSubmit();
      }
    });
  }

  private async handleSubmit(): Promise<void> {
    // Prevent double-submit
    if (this.isLoading) return;

    const city = this.cityInput.value.trim();

    // Validate input
    if (city.length < CONFIG.MIN_INPUT_LENGTH) {
      this.showError(MESSAGES.EMPTY_INPUT);
      return;
    }

    // Disable input and button, show loading state
    this.setLoading(true);
    this.showLoading();

    try {
      // Fetch with timeout wrapper (from shared utilities)
      const data = await withTimeout(
        fetchCityData(city),
        CONFIG.REQUEST_TIMEOUT_MS
      );
      this.showSuccess(data.message);
    } catch (err) {
      const message = this.getDisplayErrorMessage(err);
      this.showError(message);
    } finally {
      // Always re-enable input and button
      this.setLoading(false);
    }
  }

  // ── Helper: error extraction ─────────────────────────────────

  /**
   * Extract a human-readable error message from any thrown value.
   * Wraps the shared utility with a fallback for display.
   */
  private getDisplayErrorMessage(err: unknown): string {
    return extractErrorMessage(err, MESSAGES.CONNECTION_ERROR);
  }

  // ── UI state helpers ─────────────────────────────────────────

  /**
   * Enable/disable submit button and input field.
   * Updates aria-busy for accessibility.
   */
  private setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.submitBtn.disabled = isLoading;
    this.cityInput.disabled = isLoading;
    this.submitBtn.setAttribute('aria-busy', String(isLoading));
  }

  private showLoading(): void {
    this.responseEl.textContent = MESSAGES.LOADING;
    this.responseEl.className = '';
  }

  private showSuccess(message: string): void {
    this.responseEl.textContent = message;
    this.responseEl.className = '';
  }

  private showError(message: string): void {
    this.responseEl.textContent = message;
    this.responseEl.className = 'error';
  }

  /**
   * Safely query a DOM element by ID with type safety.
   * Throws immediately if the element is missing (fail-fast).
   *
   * @param id — the element's ID attribute
   * @returns the element, typed as T
   * @throws Error if the element is not found
   */
  private getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id) as T | null;
    if (!el) {
      throw new Error(`Element #${id} not found in the DOM. Check index.html.`);
    }
    return el;
  }
}
