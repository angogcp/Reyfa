// API utilities to handle environment differences between local and Vercel

/**
 * Returns the correct API base URL depending on the environment
 * - In local development: uses root paths (/)
 * - In Vercel: uses /api paths
 */
function getApiBaseUrl() {
  // Detect local dev vs deployed environment (custom domains included)
  const host = window.location.hostname || '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  // On any non-local domain (including custom domains on Vercel), use /api
  return isLocal ? '' : '/api';
}

/**
 * Creates a full API URL with the correct base path for the current environment
 * @param {string} endpoint - The API endpoint (e.g., '/login', '/bookings')
 * @returns {string} The full API URL
 */
function createApiUrl(endpoint) {
  const baseUrl = getApiBaseUrl();
  // Ensure endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
}

// Make utilities available globally
window.apiUtils = {
  getApiBaseUrl,
  createApiUrl
};