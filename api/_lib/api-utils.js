// API utilities to handle environment differences between local and Vercel

/**
 * Returns the correct API base URL depending on the environment
 * - In local development: uses root paths (/)
 * - In Vercel: uses /api paths
 */
function getApiBaseUrl() {
  // Detect local dev vs deployed environment (supports custom domains)
  const isBrowser = typeof window !== 'undefined';
  const host = isBrowser ? (window.location.hostname || '') : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
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

// Export the utility functions for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getApiBaseUrl,
    createApiUrl
  };
}

// For browser usage
if (typeof window !== 'undefined') {
  window.apiUtils = {
    getApiBaseUrl,
    createApiUrl
  };
}