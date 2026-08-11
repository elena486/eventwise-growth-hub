import React, { useState, useRef } from 'react';
import { Camera, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Maps the AI-extracted JSON keys to the form field keys + display labels
const FIELD_MAP = [
  { key: 'impressions', label: 'Impressions', api: 'impressions' },
  { key: 'reactions', label: 'Reactions', api: 'reactions' },
  { key: 'comments', label: 'Comments', api: 'comments' },
  { key: 'reposts', label: 'Reposts', api: 'reposts' },
  { key: 'linkClicks', label: 'Link clicks', api: 'link_clicks' },
  { key: 'profileVisits', label: 'Profile visits', api: 'profile_visits' },
  { key: 'reach', label: 'Reach', api: 'reach' },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const media_type = file.type || 'image/jpeg';
      resolve({ base64, media_type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PerformanceScreenshotExtract({ form, set, setScreenshot }) {
  const [extracting, setExtracting] = useState(false);
  const [summary, setSummary] = useState(null); // { pulled: [{label,value}], missing: [labels], error }
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setExtracting(true);
    setSummary(null);
    try {
      // 1. Upload the screenshot so it's stored as an attachment on the content item
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setScreenshot(file_url, file.name);

      // 2. Convert to base64 and ask the AI to read the visible stats
      const image = await fileToBase64(file);
      const res = await base44.functions.invoke('extractMarketingScreenshot', {
        platform: 'linkedinPost',
        images: [image],
      });
      const data = res.data;

      if (!data.success || !data.extracted) {
        throw new Error(data.error || 'Extraction failed');
      }

      const pulled = [];
      const missing = [];
      FIELD_MAP.forEach(({ key, label, api }) => {
        const val = data.extracted[api];
        if (val != null && val !== '' && !isNaN(Number(val))) {
          set(key, Number(val));
          pulled.push({ label, value: Number(val) });
        } else {
          missing.push(label);
        }
      });

      setSummary({ pulled, missing, error: null });
    } catch (err) {
      setSummary({ pulled: [], missing: [], error: err.message || 'Could not read the screenshot' });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={extracting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] rounded-lg hover:bg-[#E9D5FF] disabled:opacity-50 transition-colors"
        >
          {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {extracting ? 'Reading screenshot…' : '📷 Upload screenshot to auto-fill'}
        </button>
        {form.screenshotUrl && !extracting && (
          <a
            href={form.screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-ew-muted hover:text-navy underline"
          >
            View uploaded screenshot
          </a>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {summary?.error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Couldn't read the screenshot: {summary.error}. Try a clearer image or enter the numbers manually below.</span>
        </div>
      )}

      {summary && !summary.error && (summary.pulled.length > 0 || summary.missing.length > 0) && (
        <div className="bg-[#F3E8FF]/40 border border-[#8403C5]/20 rounded-lg px-3 py-2.5 space-y-1.5">
          {summary.pulled.length > 0 && (
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#8403C5] shrink-0 mt-0.5" />
              <p className="text-xs text-[#242450]">
                <span className="font-semibold">Pulled from screenshot: </span>
                {summary.pulled.map((p) => `${p.label} ${p.value.toLocaleString()}`).join(', ')}
              </p>
            </div>
          )}
          {summary.missing.length > 0 && (
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Not found in screenshot: </span>
                {summary.missing.join(', ')} — enter manually if available.
              </p>
            </div>
          )}
          <p className="text-[11px] text-ew-muted pl-5">
            Review the numbers in the fields below before clicking Save.
          </p>
        </div>
      )}
    </div>
  );
}