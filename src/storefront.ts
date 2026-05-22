import log from 'electron-log/main';
import { getStorefront, setStorefront, getLanguage, setLanguage, getStartPage, getLastPageUrl } from './config';
import { getStorefront as getLocaleStorefront } from './i18n';
import type { ItmsRouteToken } from './itms';
import { APPLE_MUSIC_CLASSICAL_HOST, APPLE_MUSIC_CLASSICAL_ORIGIN } from './musicService';

export type { ItmsRouteToken } from './itms';

const storefrontLog = log.scope('storefront');

const ITMS_ROUTE_PATHS: Record<ItmsRouteToken, string> = {
  home: '',
  library: 'library',
  browse: 'browse',
  playlists: 'browse/playlists',
  search: 'search',
};

function appendLanguage(url: string, language: string | null | undefined): string {
  if (language != null) {
    return `${url}?l=${language}`;
  }
  return url;
}

function buildClassicalStorefrontURL(storefront: string, path: string, language: string | null | undefined): string {
  const base = `${APPLE_MUSIC_CLASSICAL_ORIGIN}/${storefront}`;
  return appendLanguage(path ? `${base}/${path}` : base, language);
}

export function buildAppleMusicClassicalURL(): string {
  let storefront = getStorefront();
  let source: string;

  if (storefront !== undefined) {
    source = 'persisted';
  } else {
    storefront = getLocaleStorefront();
    source = storefront === 'us' ? 'fallback' : 'detected';
  }

  storefrontLog.info(`storefront resolved: ${storefront} (${source})`);

  const language = getLanguage();
  const startPage = getStartPage();

  if (startPage === 'last') {
    const lastPath = getLastPageUrl();
    if (lastPath) {
      return buildClassicalStorefrontURL(storefront, lastPath, language);
    }
    // fall through: no stored path yet, use Home
  }

  const pagePathMap: Record<string, string> = {
    'home': '',
    'browse': 'browse',
    'library': 'library',
    'playlists': 'browse/playlists',
    'search': 'search',
  };
  const pagePath = pagePathMap[startPage] ?? pagePathMap['home'];

  return buildClassicalStorefrontURL(storefront, pagePath, language);
}

export function buildItmsRouteURL(token: ItmsRouteToken): string {
  let storefront = getStorefront();
  if (storefront === undefined) {
    storefront = getLocaleStorefront();
  }
  const language = getLanguage();
  const path = ITMS_ROUTE_PATHS[token];
  return buildClassicalStorefrontURL(storefront, path, language);
}

export function extractStorefrontFromURL(url: string): { storefront: string; language: string | null } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== APPLE_MUSIC_CLASSICAL_HOST) {
      return null;
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return null;
    }
    const storefront = segments[0];
    if (!/^[a-z]{2}$/.test(storefront)) {
      return null;
    }
    const language = parsed.searchParams.get('l');
    return { storefront, language };
  } catch {
    return null;
  }
}

export function handleStorefrontNavigation(url: string): void {
  const result = extractStorefrontFromURL(url);
  if (!result) {
    return;
  }

  const currentStorefront = getStorefront();
  const currentLanguage = getLanguage();

  // Only update language when the URL explicitly provides an "l" parameter. Absence means no change.
  const storefrontChanged = result.storefront !== currentStorefront;
  const languageChanged = result.language !== null && result.language !== currentLanguage;

  if (storefrontChanged) {
    setStorefront(result.storefront);
  }
  if (languageChanged) {
    setLanguage(result.language);
  }
  if (storefrontChanged || languageChanged) {
    storefrontLog.info(`storefront changed: ${result.storefront} (language: ${result.language ?? currentLanguage})`);
  }
}
