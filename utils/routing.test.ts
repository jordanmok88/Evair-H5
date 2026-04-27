import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRoute } from './routing';

function mockLocation(parts: {
    pathname: string;
    search?: string;
    hash?: string;
    hostname?: string;
}): void {
    const { pathname, search = '', hash = '', hostname = 'evairdigital.com' } = parts;
    vi.stubGlobal('window', {
        location: { pathname, search, hash, hostname },
    } as Window & typeof globalThis);
}

describe('getRoute', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns apiTest when hash contains api-test', () => {
        mockLocation({ pathname: '/app', hash: '#api-test' });
        expect(getRoute()).toEqual({ kind: 'apiTest' });
    });

    it('parses activate with iccid query', () => {
        mockLocation({ pathname: '/activate', search: '?iccid=123456789012345' });
        expect(getRoute()).toEqual({ kind: 'activate', iccid: '123456789012345' });
    });

    it('returns device for /sim/phone', () => {
        mockLocation({ pathname: '/sim/phone' });
        expect(getRoute()).toEqual({ kind: 'device', category: 'phone' });
    });

    it('returns app for unknown /sim slug', () => {
        mockLocation({ pathname: '/sim/unknown' });
        expect(getRoute()).toEqual({ kind: 'app' });
    });

    it('returns travel with country code', () => {
        mockLocation({ pathname: '/travel-esim/jp' });
        expect(getRoute()).toEqual({ kind: 'travel', countryCode: 'jp' });
    });

    it('returns travel with null country for short slug', () => {
        mockLocation({ pathname: '/travel-esim/j' });
        expect(getRoute()).toEqual({ kind: 'travel', countryCode: null });
    });

    it('returns marketingPreview for /welcome-preview', () => {
        mockLocation({ pathname: '/welcome-preview' });
        expect(getRoute()).toEqual({ kind: 'marketingPreview' });
    });

    it('returns marketing for /welcome', () => {
        mockLocation({ pathname: '/welcome' });
        expect(getRoute()).toEqual({ kind: 'marketing' });
    });

    it('returns marketing for apex / on evairdigital.com', () => {
        mockLocation({ pathname: '/', hostname: 'evairdigital.com' });
        expect(getRoute()).toEqual({ kind: 'marketing' });
    });

    it('returns app for / on localhost', () => {
        mockLocation({ pathname: '/', hostname: 'localhost' });
        expect(getRoute()).toEqual({ kind: 'app' });
    });

    it('returns legal for /legal/terms', () => {
        mockLocation({ pathname: '/legal/terms' });
        expect(getRoute()).toEqual({ kind: 'legal', slug: 'terms' });
    });
});
