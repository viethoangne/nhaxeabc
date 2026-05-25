let rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
rawUrl = rawUrl.replace(/\/$/, '');
if (!rawUrl.endsWith('/api')) {
  rawUrl = `${rawUrl}/api`;
}
export const API_BASE = rawUrl;
