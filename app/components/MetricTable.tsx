import React from 'react';

export interface MetricDefinition {
  label: string;
  baselineValue?: number;
  currentValue: number;
  format: (val: number) => string;
  unit: string;
  invertDeltaColor?: boolean; // If true, a positive delta is red instead of green (e.g., for ESR or Loss)
}

interface MetricTableProps {
  metrics: MetricDefinition[];
}

export function MetricTable({ metrics }: MetricTableProps) {
  const isComparison = metrics.some((m) => m.baselineValue !== undefined);

  if (!isComparison) {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 flex-grow">
        {metrics.map((m, idx) => (
          <div key={idx}>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1">
              {m.label}
            </div>
            <div className="text-2xl font-mono text-zinc-900">
              {m.format(m.currentValue)} {m.unit}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-grow">
      <div className="grid grid-cols-4 gap-4 text-left border-b border-zinc-200 pb-2 mb-4">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">
          Metric
        </div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-800">
          Baseline
        </div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">
          Comparison
        </div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">
          Delta
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((m, idx) => {
          const baseline = m.baselineValue!;
          const current = m.currentValue;
          const deltaPct = ((current - baseline) / baseline) * 100;
          const isPositive = current > baseline;
          
          let colorClass = 'text-zinc-600';
          if (deltaPct !== 0) {
            if (m.invertDeltaColor) {
              colorClass = isPositive ? 'text-red-600' : 'text-emerald-600';
            } else {
              colorClass = isPositive ? 'text-emerald-600' : 'text-red-600';
            }
          }

          return (
            <div key={idx} className="grid grid-cols-4 gap-4 items-center">
              <div className="text-xs font-semibold text-zinc-500">{m.label}</div>
              <div className="text-sm font-mono text-zinc-900">
                {m.format(baseline)} {m.unit}
              </div>
              <div className="text-sm font-mono text-zinc-600">
                {m.format(current)} {m.unit}
              </div>
              <div className={`text-xs font-mono font-semibold ${colorClass}`}>
                {isPositive ? '+' : ''}
                {deltaPct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
