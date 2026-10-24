import { describe, expect, test } from 'vitest';
import { redactSupplierProfileSecrets } from './esimQueryRedact.mjs';

describe('redactSupplierProfileSecrets', () => {
  test('strips install credentials nested in an esim query list', () => {
    const raw = {
      success: true,
      obj: {
        esimList: [
          {
            iccid: '8901234567890123456',
            esimStatus: 'IN_USE',
            totalVolume: 1073741824,
            ac: 'LPA:1$rsp.example.com$SECRET-CODE',
            qrCodeUrl: 'https://files.example/qr.png',
            shortUrl: 'https://files.example/s',
            activation_code: 'SECRET-CODE',
            matchingId: 'MATCH-1',
            smdpAddress: 'rsp.example.com',
            lpaString: 'LPA:1$rsp.example.com$SECRET-CODE',
            packageList: [{ packageName: 'Japan 1GB', packageCode: 'JP-1' }],
          },
        ],
      },
    };

    const redacted = redactSupplierProfileSecrets(raw);

    expect(redacted.obj.esimList[0]).toEqual({
      iccid: '8901234567890123456',
      esimStatus: 'IN_USE',
      totalVolume: 1073741824,
      packageList: [{ packageName: 'Japan 1GB', packageCode: 'JP-1' }],
    });
    expect(JSON.stringify(redacted)).not.toContain('SECRET-CODE');
    expect(JSON.stringify(redacted)).not.toContain('qr.png');
    expect(raw.obj.esimList[0].ac).toBe('LPA:1$rsp.example.com$SECRET-CODE');
  });

  test('leaves non-objects unchanged', () => {
    expect(redactSupplierProfileSecrets(null)).toBeNull();
    expect(redactSupplierProfileSecrets('ac')).toBe('ac');
    expect(redactSupplierProfileSecrets(3)).toBe(3);
  });
});
