import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function ScannerDialog({ onClose, onDetected }: { onClose: () => void; onDetected: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let controls: { stop: () => void } | undefined;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    void reader.decodeFromVideoDevice(undefined, element, (result) => {
      if (result && !cancelled) onDetected(result.getText());
    }).then((createdControls) => {
      if (cancelled) createdControls.stop();
      else controls = createdControls;
    }).catch(() => setError('Camera could not start. Check browser camera permission or enter the SKU manually.'));
    return () => { cancelled = true; controls?.stop(); };
  }, [onDetected]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <div className="dialog-head"><div><p className="eyebrow">BARCODE SCANNER</p><h2 id="scanner-title">Point camera at barcode</h2></div><button className="icon-button" onClick={onClose} aria-label="Close scanner"><X size={19} /></button></div>
        <video ref={video} className="scanner-video" muted playsInline />
        {error ? <div className="inline-error"><AlertTriangle size={16} />{error}</div> : <p className="scanner-hint">Hold the barcode steady in the frame.</p>}
        <button className="secondary-button dialog-cancel" onClick={onClose}>Cancel scan</button>
      </section>
    </div>
  );
}