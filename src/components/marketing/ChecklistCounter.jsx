import React from 'react';
import { Plus, Minus, Check } from 'lucide-react';

export default function ChecklistCounter({ label, count, target, onIncrement, onDecrement, disabled }) {
  const done = count >= target;
  const pct = Math.min(100, Math.round((count / target) * 100));

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-bold text-[#242450] leading-snug">{label}</p>
        <div className={`flex items-center gap-1 shrink-0 ${done ? 'text-[#1D9E75]' : 'text-[#242450]'}`}>
          <span className="text-2xl font-bold tabular-nums leading-none">{count}</span>
          <span className="text-xs text-[#9CA3AF] font-medium">/ {target}</span>
          {done && <Check className="w-4 h-4 text-[#1D9E75]" />}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2.5">
        <button onClick={onDecrement} disabled={disabled || count <= 0}
          className="w-8 h-8 rounded-lg border border-[#EBEBF5] text-[#5777AB] flex items-center justify-center hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button onClick={onIncrement} disabled={disabled}
          className="w-8 h-8 rounded-lg bg-[#8403C5] text-white flex items-center justify-center hover:bg-[#6B02A0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
        {done && <span className="text-[11px] font-semibold text-[#1D9E75] ml-1">Done</span>}
      </div>
      <div className="h-2 rounded-full bg-[#EBEBF5] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: done ? '#1D9E75' : '#8403C5' }} />
      </div>
    </div>
  );
}