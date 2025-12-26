/**
 * @fileoverview Immersa 3D Web Application Entry Point
 * @module main
 */

import { app } from './core/App.js';
import './index.css';

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
