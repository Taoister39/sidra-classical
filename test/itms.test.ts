// test/itms.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './mocks/storefront-deps';

import { transformItmsUrl, extractItmsUrlFromArgv, type ItmsRouteToken } from '../src/itms';
import { buildItmsRouteURL } from '../src/storefront';
import { getStorefront, getLanguage } from '../src/config';
import { getStorefront as getLocaleStorefront } from '../src/i18n';

const mockedGetStorefront = vi.mocked(getStorefront);
const mockedGetLanguage = vi.mocked(getLanguage);
const mockedGetLocaleStorefront = vi.mocked(getLocaleStorefront);

describe('transformItmsUrl', () => {
  it('rebuilds catalogue album URL as https and strips app=music', () => {
    const result = transformItmsUrl('itms://classical.music.apple.com/gb/album/foo/123?app=music');
    expect(result).toEqual({ kind: 'url', url: 'https://classical.music.apple.com/gb/album/foo/123' });
  });

  it('preserves other query params while stripping app=music', () => {
    const result = transformItmsUrl('itms://classical.music.apple.com/gb/album/foo/123?i=789&app=music');
    expect(result).toEqual({ kind: 'url', url: 'https://classical.music.apple.com/gb/album/foo/123?i=789' });
  });

  it.each<[string, ItmsRouteToken]>([
    ['home', 'home'],
    ['library', 'library'],
    ['browse', 'browse'],
    ['playlists', 'playlists'],
    ['search', 'search'],
  ])('parses deeplink ?p=%s into route token', (param, token) => {
    const result = transformItmsUrl(`itms://classical.music.apple.com/deeplink?p=${param}`);
    expect(result).toEqual({ kind: 'route', token });
  });

  it('returns null for deeplink with unknown token', () => {
    expect(transformItmsUrl('itms://classical.music.apple.com/deeplink?p=bogus')).toBeNull();
  });

  it('returns null for deeplink with no p parameter', () => {
    expect(transformItmsUrl('itms://classical.music.apple.com/deeplink')).toBeNull();
  });

  it('rejects itmss:// scheme', () => {
    expect(transformItmsUrl('itmss://classical.music.apple.com/gb/album/foo/123')).toBeNull();
  });

  it('rejects https:// scheme', () => {
    expect(transformItmsUrl('https://classical.music.apple.com/gb/album/foo/123')).toBeNull();
  });

  it('rejects javascript: scheme', () => {
    expect(transformItmsUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: scheme', () => {
    expect(transformItmsUrl('data:text/html,<script>')).toBeNull();
  });

  it('rejects file: scheme', () => {
    expect(transformItmsUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects wrong host', () => {
    expect(transformItmsUrl('itms://evil.example.com/gb/album/foo/123')).toBeNull();
  });

  it('rejects subdomain of classical.music.apple.com', () => {
    expect(transformItmsUrl('itms://attacker.classical.music.apple.com/gb/album/foo/123')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(transformItmsUrl('not a url')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(transformItmsUrl('')).toBeNull();
  });
});

describe('extractItmsUrlFromArgv', () => {
  it('returns the parsed target when itms URL is the last argv element', () => {
    const argv = ['/usr/bin/sidra', '--enable-features=Foo', 'itms://classical.music.apple.com/gb/album/foo/123?app=music'];
    expect(extractItmsUrlFromArgv(argv)).toEqual({
      kind: 'url',
      url: 'https://classical.music.apple.com/gb/album/foo/123',
    });
  });

  it('returns the parsed target when itms URL is in the middle of argv', () => {
    const argv = ['/usr/bin/sidra', 'itms://classical.music.apple.com/deeplink?p=search', '--some-flag'];
    expect(extractItmsUrlFromArgv(argv)).toEqual({ kind: 'route', token: 'search' });
  });

  it('returns null when argv contains no itms URL', () => {
    const argv = ['/usr/bin/sidra', '--enable-features=Foo'];
    expect(extractItmsUrlFromArgv(argv)).toBeNull();
  });

  it('returns null when argv contains only a malformed itms URL', () => {
    const argv = ['/usr/bin/sidra', 'itms://evil.example.com/album/foo'];
    expect(extractItmsUrlFromArgv(argv)).toBeNull();
  });

  it('returns the first valid itms URL when multiple are present', () => {
    const argv = [
      '/usr/bin/sidra',
      'itms://classical.music.apple.com/deeplink?p=library',
      'itms://classical.music.apple.com/gb/album/foo/123?app=music',
    ];
    expect(extractItmsUrlFromArgv(argv)).toEqual({ kind: 'route', token: 'library' });
  });

  it('skips malformed itms URLs and returns the first valid one', () => {
    const argv = [
      '/usr/bin/sidra',
      'itms://evil.example.com/foo',
      'itms://classical.music.apple.com/deeplink?p=browse',
    ];
    expect(extractItmsUrlFromArgv(argv)).toEqual({ kind: 'route', token: 'browse' });
  });
});

describe('buildItmsRouteURL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStorefront.mockReturnValue('gb');
    mockedGetLanguage.mockReturnValue(undefined);
    mockedGetLocaleStorefront.mockReturnValue('us');
  });

  it.each<[ItmsRouteToken, string]>([
    ['home', 'https://classical.music.apple.com/gb'],
    ['library', 'https://classical.music.apple.com/gb/library'],
    ['browse', 'https://classical.music.apple.com/gb/browse'],
    ['playlists', 'https://classical.music.apple.com/gb/browse/playlists'],
    ['search', 'https://classical.music.apple.com/gb/search'],
  ])('maps token %s to %s with persisted storefront gb', (token, expected) => {
    expect(buildItmsRouteURL(token)).toBe(expected);
  });

  it('appends ?l= when language is set', () => {
    mockedGetLanguage.mockReturnValue('en-GB');
    expect(buildItmsRouteURL('library')).toBe('https://classical.music.apple.com/gb/library?l=en-GB');
  });

  it('falls back to getLocaleStorefront when no persisted storefront', () => {
    mockedGetStorefront.mockReturnValue(undefined);
    mockedGetLocaleStorefront.mockReturnValue('de');
    expect(buildItmsRouteURL('browse')).toBe('https://classical.music.apple.com/de/browse');
  });
});
