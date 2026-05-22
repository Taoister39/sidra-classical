// test/storefront.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './mocks/storefront-deps';

import { handleStorefrontNavigation } from '../src/storefront';
import { getStorefront, setStorefront, getLanguage, setLanguage } from '../src/config';

const mockedGetStorefront = vi.mocked(getStorefront);
const mockedSetStorefront = vi.mocked(setStorefront);
const mockedGetLanguage = vi.mocked(getLanguage);
const mockedSetLanguage = vi.mocked(setLanguage);

describe('handleStorefrontNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStorefront.mockReturnValue('us');
    mockedGetLanguage.mockReturnValue(undefined);
  });

  it('persists new storefront and language from a valid Apple Music Classical URL', () => {
    mockedGetStorefront.mockReturnValue('us');
    handleStorefrontNavigation('https://classical.music.apple.com/gb/album/foo?l=en-GB');
    expect(mockedSetStorefront).toHaveBeenCalledWith('gb');
    expect(mockedSetLanguage).toHaveBeenCalledWith('en-GB');
  });

  it('does not change language when URL has no language parameter', () => {
    mockedGetStorefront.mockReturnValue('us');
    mockedGetLanguage.mockReturnValue(undefined);
    handleStorefrontNavigation('https://classical.music.apple.com/gb');
    expect(mockedSetStorefront).toHaveBeenCalledWith('gb');
    expect(mockedSetLanguage).not.toHaveBeenCalled();
  });

  it('does not update config for non-Apple Music Classical URLs', () => {
    handleStorefrontNavigation('https://example.com/gb/new');
    expect(mockedSetStorefront).not.toHaveBeenCalled();
    expect(mockedSetLanguage).not.toHaveBeenCalled();
  });

  it('does not update config for malformed URLs', () => {
    handleStorefrontNavigation('not-a-url');
    expect(mockedSetStorefront).not.toHaveBeenCalled();
    expect(mockedSetLanguage).not.toHaveBeenCalled();
  });

  it('does not call setStorefront when storefront is unchanged', () => {
    mockedGetStorefront.mockReturnValue('gb');
    mockedGetLanguage.mockReturnValue('en-GB');
    handleStorefrontNavigation('https://classical.music.apple.com/gb/album/foo?l=en-GB');
    expect(mockedSetStorefront).not.toHaveBeenCalled();
  });

  it('preserves current language when URL has no language parameter and language is already set', () => {
    mockedGetStorefront.mockReturnValue('gb');
    mockedGetLanguage.mockReturnValue('en-GB');
    handleStorefrontNavigation('https://classical.music.apple.com/gb');
    // No ?l= in URL means no language change, regardless of current value
    expect(mockedSetLanguage).not.toHaveBeenCalled();
  });

  it('overwrites stored language when URL provides a different language', () => {
    mockedGetStorefront.mockReturnValue('gb');
    mockedGetLanguage.mockReturnValue('en-GB');
    handleStorefrontNavigation('https://classical.music.apple.com/gb/album/foo?l=cy');
    expect(mockedSetLanguage).toHaveBeenCalledWith('cy');
  });
});
