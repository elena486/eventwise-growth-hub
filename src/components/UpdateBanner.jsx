import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, RefreshCw } from 'lucide-react';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const baselineVersion = useRef(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await base44.functions.invoke('getAppVersion', {});
        return res.data?.version ?? null;
      } catch {
        return null;
      }
    };

    // Capture the version the user loaded with
    fetchVersion().then(v => { baselineVersion.current = v; });

    // Poll every 5 minutes
    const interval = setInterval(async () => {
      const current = await fetchVersion();
      if (current && baselineVersion.current && current !== baselineVersion.current) {
        setShowBanner(true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#242450' }}>
      <div className="flex items-center gap-2">
        <span className="text-sm">✨</span>
        <p className="text-sm font-medium text-white">
          Eventwise HQ has been updated — refresh to get the latest version
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-[#242450] rounded-lg hover:bg-white/90 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh now
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 text-white/60 hover:text-white transition-colors rounded"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}