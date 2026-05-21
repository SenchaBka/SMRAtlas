/**
 * EnergyLookup.ts
 *
 * The single UI component for the Energy Demand Lookup card.
 * It owns:
 *   - references to the relevant DOM elements (input, button, response div)
 *   - event listeners (button click, Enter key)
 *   - UI state transitions: idle → loading → success / error
 *
 * It delegates all network work to `cityApi.ts` so this file stays focused
 * purely on presentation and user interaction.
 */

import { fetchCityData } from '../api/cityApi';

export class EnergyLookup {
  private readonly cityInput: HTMLInputElement;
  private readonly submitBtn: HTMLButtonElement;
  private readonly responseEl: HTMLElement;

  constructor() {
    this.cityInput = this.getElement<HTMLInputElement>('cityInput');
    this.submitBtn = this.getElement<HTMLButtonElement>('submitBtn');
    this.responseEl = this.getElement<HTMLElement>('response');

    this.bindEvents();
  }

  // ── Event wiring ────────────────────────────────────────────

  private bindEvents(): void {
    this.submitBtn.addEventListener('click', () => void this.submit());

    // Allow submitting with the Enter key
    this.cityInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') void this.submit();
    });
  }

  // ── Core action ─────────────────────────────────────────────

  private async submit(): Promise<void> {
    const city = this.cityInput.value.trim();

    if (!city) {
      this.showError('Please enter a city name.');
      return;
    }

    this.showLoading();

    try {
      const data = await fetchCityData(city);
      this.showSuccess(data.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not connect to the server.';
      this.showError(message);
    }
  }

  // ── UI state helpers ─────────────────────────────────────────

  private showLoading(): void {
    this.responseEl.textContent = 'Loading…';
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

  // ── DOM helper ───────────────────────────────────────────────

  /** Typed wrapper around `getElementById` that throws if the element is missing. */
  private getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id) as T | null;
    if (!el) throw new Error(`Element #${id} not found in the DOM.`);
    return el;
  }
}
