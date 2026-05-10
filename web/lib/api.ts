// Centralized API base URL
// In production (Vercel), NEXT_PUBLIC_API_URL is set to the Railway backend URL
// In local dev, it falls back to localhost:3001
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
