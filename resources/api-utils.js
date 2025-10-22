// API utilities to handle environment differences between local and Vercel

/**
 * Returns the correct API base URL depending on the environment
 * - In local development: uses root paths (/)
 * - In Vercel: uses /api paths
 */
function getApiBaseUrl() {
  // Check if we're in a Vercel environmentfunction getApiBaseUrl() {
    
    const isVercel = window.location.hostname.includes('vercel.app') || 
                    window.location.hostname === 'reyfa.vercel.app';
    return isVercel ? '/api' : '';
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