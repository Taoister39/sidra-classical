// test/url.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './mocks/storefront-deps';

import { extractStorefrontFromURL, buildAppleMusicClassicalURL } from '../src/storefront';
import { getStorefront, getLanguage, getStartPage, getLastPageUrl } from '../src/config';
import { getStorefront as getLocaleStorefront } from '../src/i18n';

const mockedGetStorefront = vi.mocked(getStorefront);
const mockedGetLanguage = vi.mocked(getLanguage);
const mockedGetStartPage = vi.mocked(getStartPage);
const mockedGetLastPageUrl = vi.mocked(getLastPageUrl);
const mockedGetLocaleStorefront = vi.mocked(getLocaleStorefront);

describe('extractStorefrontFromURL', () => {
  it('extracts storefront and language from a valid URL', () => {
    const result = extractStorefrontFromURL('https://classical.music.apple.com/gb/album/foo?l=en-GB');
    expect(result).toEqual({ storefront: 'gb', language: 'en-GB' });
  });

  it('returns null language when no ?l= parameter', () => {
    const result = extractStorefrontFromURL('https://classical.music.apple.com/us');
    expect(result).toEqual({ storefront: 'us', language: null });
  });

  it('rejects non-Apple Music hostnames', () => {
    expect(extractStorefrontFromURL('https://example.com/gb/new')).toBeNull();
  });

  it('rejects uppercase storefront codes', () => {
    expect(extractStorefrontFromURL('https://classical.music.apple.com/GB')).toBeNull();
  });

  it('rejects three-letter codes', () => {
    expect(extractStorefrontFromURL('https://classical.music.apple.com/gbr')).toBeNull();
  });

  it('rejects empty path', () => {
    expect(extractStorefrontFromURL('https://classical.music.apple.com/')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(extractStorefrontFromURL('not-a-url')).toBeNull();
  });
});

describe('buildAppleMusicClassicalURL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStartPage.mockReturnValue('home');
    mockedGetLanguage.mockReturnValue(undefined);
    mockedGetStorefront.mockReturnValue(undefined);
    mockedGetLocaleStorefront.mockReturnValue('us');
    mockedGetLastPageUrl.mockReturnValue(undefined);
  });

  it('uses persisted storefront when available', () => {
    mockedGetStorefront.mockReturnValue('gb');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/gb');
  });

  it('falls back to locale storefront when none persisted', () => {
    mockedGetStorefront.mockReturnValue(undefined);
    mockedGetLocaleStorefront.mockReturnValue('de');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/de');
  });

  it('appends ?l= when language is set', () => {
    mockedGetStorefront.mockReturnValue('gb');
    mockedGetLanguage.mockReturnValue('en-GB');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/gb?l=en-GB');
  });

  it('omits ?l= when language is undefined', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetLanguage.mockReturnValue(undefined);
    const url = buildAppleMusicClassicalURL();
    expect(url).not.toContain('?l=');
  });

  it('omits ?l= when language is null', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetLanguage.mockReturnValue(null);
    const url = buildAppleMusicClassicalURL();
    expect(url).not.toContain('?l=');
  });

  it('constructs correct URL for home start page', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetStartPage.mockReturnValue('home');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/us');
  });

  it('constructs correct URL for browse start page', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetStartPage.mockReturnValue('browse');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/us/browse');
  });

  it('constructs correct URL for library start page', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetStartPage.mockReturnValue('library');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/us/library');
  });

  it('constructs correct URL for playlists start page', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetStartPage.mockReturnValue('playlists');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/us/browse/playlists');
  });

  it('constructs correct URL for search start page', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetStartPage.mockReturnValue('search');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/us/search');
  });

  it('uses last page URL when startPage is last and path exists', () => {
    mockedGetStorefront.mockReturnValue('gb');
    mockedGetStartPage.mockReturnValue('last');
    mockedGetLastPageUrl.mockReturnValue('album/some-album/12345');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/gb/album/some-album/12345');
  });

  it('uses last page URL with language parameter', () => {
    mockedGetStorefront.mockReturnValue('gb');
    mockedGetStartPage.mockReturnValue('last');
    mockedGetLastPageUrl.mockReturnValue('album/some-album/12345');
    mockedGetLanguage.mockReturnValue('en-GB');
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/gb/album/some-album/12345?l=en-GB');
  });

  it('falls back from last to home when no stored path exists', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetStartPage.mockReturnValue('last');
    mockedGetLastPageUrl.mockReturnValue(undefined);
    const url = buildAppleMusicClassicalURL();
    expect(url).toBe('https://classical.music.apple.com/us');
  });
});
