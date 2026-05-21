/**
 * main.ts
 *
 * Application entry point.
 * Responsibilities:
 *   1. Import global CSS so Vite bundles it into the build.
 *   2. Wait for the DOM to be ready.
 *   3. Instantiate the EnergyLookup component, which mounts itself
 *      by querying the existing DOM elements in index.html.
 *
 * Keep this file thin — real logic lives in the component and API modules.
 */

import './styles/main.css';
import { EnergyLookup } from './components/EnergyLookup';

document.addEventListener('DOMContentLoaded', () => {
  new EnergyLookup();
});
