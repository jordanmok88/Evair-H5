import { describe, expect, it } from 'vitest';
import type { EsimPackage } from '../types';
import { planCardNetworkLine, primaryIso2FromPackage } from './retailPackageNetworks';

function minimalPkg(overrides: Partial<EsimPackage>): EsimPackage {
    return {
        packageCode: 't',
        name: 'Test',
        price: 9900,
        currencyCode: 'USD',
        volume: 1024 ** 3,
        unusedValidTime: 30,
        duration: 30,
        durationUnit: 'DAY',
        location: 'US',
        description: '',
        activeType: 1,
        priceIsRetail: true,
        ...overrides,
    };
}

describe('retailPackageNetworks', () => {
    it('resolves ISO from coverageCodes', () => {
        expect(primaryIso2FromPackage(minimalPkg({ coverageCodes: ['jp'], location: 'US' }))).toBe('JP');
    });

    it('formats carriers from CARRIER_MAP for single-country packages', () => {
        const line = planCardNetworkLine(minimalPkg({ coverageCodes: ['US'], location: 'US' }));
        expect(line).toContain('AT&T');
        expect(line).toContain('Verizon');
        expect(line).toContain('T-Mobile');
        expect(line).toContain('·');
    });

    it('prefers supplierRegionName for multi-country packages', () => {
        const line = planCardNetworkLine(
            minimalPkg({
                location: 'US,CA',
                coverageCodes: ['US', 'CA'],
                supplierRegionName: 'North America (multi)',
            }),
        );
        expect(line).toBe('North America (multi)');
    });
});
