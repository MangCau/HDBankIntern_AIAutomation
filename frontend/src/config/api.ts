// API Configuration
// This ensures we use the correct API URL in both development and production

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Helper function for API calls
export const apiEndpoint = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${API_URL}/${cleanPath}`
}

// Example usage:
// const response = await fetch(apiEndpoint('api/data/all'))
// const response = await fetch(apiEndpoint('/api/data/new-products'))
