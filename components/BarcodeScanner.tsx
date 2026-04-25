import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, SwitchCamera } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ open, onClose, onDetected }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const containerId = 'barcode-scanner-region';

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode },
        // `formatsToSupport` IS honoured by html5-qrcode at runtime but
        // its TypeScript types are out of date. Cast through `unknown`
        // so we still get strong typing for the documented fields.
        {
          fps: 15,
          qrbox: { width: 320, height: 160 },
          aspectRatio: 1.0,
          formatsToSupport: [
            0,  // QR_CODE
            2,  // CODE_128
            10, // ITF
            4,  // CODE_39
            1,  // AZTEC
            11, // EAN_13
            6,  // EAN_8
          ],
        } as unknown as Parameters<Html5Qrcode['start']>[1],
        (decodedText) => {
          if (cancelled) return;
          const digits = decodedText.replace(/\D/g, '');
          if (digits.length >= 15 && digits.length <= 22) {
            onDetected(digits);
            onClose();
          }
        },
        () => {},
      )
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message.includes('Permission')
              ? 'Camera permission denied. Please allow camera access and try again.'
              : 'Could not start camera. Make sure no other app is using it.',
          );
        }
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          scanner.clear();
          scannerRef.current = null;
        });
    };
  }, [open, facingMode]);

  if (!open) return null;

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-safe pb-2">
        <button onClick={onClose} className="p-2 text-white/80 active:text-white">
          <X size={24} />
        </button>
        <span className="text-white font-semibold text-sm">Scan ICCID Barcode</span>
        <button onClick={toggleCamera} className="p-2 text-white/80 active:text-white">
          <SwitchCamera size={22} />
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div id={containerId} className="w-full h-full" />

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-8 text-center">
            <Camera size={48} className="text-white/40 mb-4" />
            <p className="text-white/80 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-brand-orange text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="shrink-0 pb-safe pt-3 pb-4 text-center">
        <p className="text-white/60 text-xs">Point camera at the barcode on your SIM card</p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
