import axiosInstance from '../api/axiosInstance';

export const getMediaUrl = (path) => {
  if (!path) return null;
  // If already absolute, return as-is
  if (/^https?:\/\//i.test(path)) return path;

  // Derive origin from axios baseURL (remove trailing /api/)
  const base = axiosInstance.defaults.baseURL || '';
  const origin = base.replace(/\/api\/?$/, '').replace(/\/$/, '');

  // Ensure leading slash on path
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized}`;
};

export default getMediaUrl;
