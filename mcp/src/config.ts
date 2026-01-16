import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

export const BASE_URL = process.env.BASE_URL ?? (isProduction ? '' : 'http://localhost:3000');
export const FRONTEND_URL =
  process.env.FRONTEND_URL ?? (isProduction ? '' : 'http://localhost:5173');

if (isProduction && !BASE_URL) {
  throw new Error('BACKEND_URL is required in production');
}

if (isProduction && !FRONTEND_URL) {
  throw new Error('FRONTEND_URL is required in production');
}
