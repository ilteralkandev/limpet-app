import Constants from 'expo-constants';

/**
 * Base URL of the static content host (GitHub raw, GitHub Pages, Netlify...).
 * EXPO_PUBLIC_CONTENT_BASE_URL overrides app.json for local development,
 * e.g. http://localhost:4000 while running `npm run content:serve`.
 */
export const CONTENT_BASE_URL = (
  process.env.EXPO_PUBLIC_CONTENT_BASE_URL ??
  (Constants.expoConfig?.extra?.contentBaseUrl as string | undefined) ??
  ''
).replace(/\/+$/, '');

export const APP_SCHEME = 'limpet';
