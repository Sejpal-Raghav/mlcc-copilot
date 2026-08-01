"use client";

import { useState } from "react";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PredictPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      epsilon_r: parseFloat(formData.get("epsilon_r") as string),
      layers: parseInt(formData.get("layers") as string, 10),
      area: parseFloat(formData.get("area_val") as string) * parseFloat(formData.get("area_unit") as string),
      thickness: parseFloat(formData.get("thickness_val") as string) * parseFloat(formData.get("thickness_unit") as string),
      v_bias: parseFloat(formData.get("v_bias") as string),
      temperature: parseFloat(formData.get("temperature") as string),
    };

    try {
      const res = await fetch("/api/predict-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Prediction failed");

      setHistory(prev => {
        const next = [...prev, resData];
        return next.length > 2 ? next.slice(1) : next;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => setHistory([]);

  const getMergedCurve = () => {
    if (history.length === 0) return [];
    if (history.length === 1) return history[0].impedanceCurve;
    
    return history[0].impedanceCurve.map((pt: any, i: number) => ({
      freq: pt.freq,
      Baseline: pt.z,
      Comparison: history[1].impedanceCurve[i].z
    }));
  };

  const mergedCurve = getMergedCurve();
  const currentResult = history.length > 0 ? history[history.length - 1] : null;
  const baselineResult = history.length === 2 ? history[0] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Form Column */}
      <div className="lg:col-span-5 bg-white border border-zinc-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-4">
          <Activity className="w-4 h-4 text-zinc-900" />
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Performance Predictor</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1.5">Dielectric Constant (εᵣ)</label>
            <input type="number" name="epsilon_r" step="0.1" required defaultValue={1000} className="block w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1.5">Layers (N)</label>
            <input type="number" name="layers" required defaultValue={100} className="block w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1.5">Area</label>
            <div className="flex gap-2">
              <input type="number" name="area_val" step="any" required defaultValue={10} className="block w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors font-mono" />
              <select name="area_unit" defaultValue="1e-6" className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors cursor-pointer w-24">
                <option value="1">m²</option>
                <option value="1e-6">mm²</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold">Thickness</label>
            <div className="flex gap-2">
              <input type="number" name="thickness_val" step="any" required defaultValue={10} className="block w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors font-mono" />
              <select name="thickness_unit" defaultValue="1e-6" className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors cursor-pointer w-24">
                <option value="1">m</option>
                <option value="1e-3">mm</option>
                <option value="1e-6">µm</option>
              </select>
            </div>
          </div>
          
          {/* Operating Conditions */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-3">Operating Conditions</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="v_bias" className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold">DC Bias (V)</label>
                <input id="v_bias" type="number" name="v_bias" step="0.1" required defaultValue={5.0} className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors" />
              </div>
              <div>
                <label htmlFor="temperature" className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold">Temp (°C)</label>
                <input id="temperature" type="number" name="temperature" step="0.1" required defaultValue={25.0} className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors" />
              </div>
            </div>
          </div>
          
          <div className="pt-2 flex gap-3">
            <button type="submit" disabled={loading} className="flex-1 flex justify-center py-2.5 px-4 border border-zinc-900 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-colors uppercase tracking-wider">
              {loading ? "Computing..." : history.length === 0 ? "Run Inference" : "Compare"}
            </button>
            {history.length > 0 && (
              <button type="button" onClick={handleClear} disabled={loading} className="flex justify-center py-2.5 px-4 border border-zinc-200 text-xs font-semibold text-zinc-900 bg-white hover:bg-zinc-50 focus:outline-none disabled:opacity-50 transition-colors uppercase tracking-wider">
                Clear
              </button>
            )}
          </div>
          
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 flex items-start gap-2 mt-4"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
        </form>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7">
        {currentResult ? (
          <div className="bg-white border border-zinc-200 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
              <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Inference Output {history.length === 2 && "(Comparison Mode)"}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 flex-grow">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1">Capacitance</div>
                <div className="text-2xl font-mono text-zinc-900">{baselineResult ? baselineResult.capacitance.toExponential(4) : currentResult.capacitance.toExponential(4)} F</div>
                {baselineResult && (
                  <div className="text-xs font-mono text-emerald-600 mt-1">vs {currentResult.capacitance.toExponential(4)} F ({(((currentResult.capacitance - baselineResult.capacitance) / baselineResult.capacitance) * 100).toFixed(1)}%)</div>
                )}
              </div>
              
              <div>
                <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1">Resonant Freq</div>
                <div className="text-2xl font-mono text-zinc-900">{baselineResult ? (baselineResult.resonantFrequency / 1e6).toFixed(2) : (currentResult.resonantFrequency / 1e6).toFixed(2)} MHz</div>
                {baselineResult && (
                  <div className="text-xs font-mono text-emerald-600 mt-1">vs {(currentResult.resonantFrequency / 1e6).toFixed(2)} MHz ({(((currentResult.resonantFrequency - baselineResult.resonantFrequency) / baselineResult.resonantFrequency) * 100).toFixed(1)}%)</div>
                )}
              </div>
              
              <div>
                <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1">Equiv. Series Resistance</div>
                <div className="text-2xl font-mono text-zinc-900">{baselineResult ? (baselineResult.esr * 1000).toFixed(2) : (currentResult.esr * 1000).toFixed(2)} mΩ</div>
                {baselineResult && (
                  <div className="text-xs font-mono text-emerald-600 mt-1">vs {(currentResult.esr * 1000).toFixed(2)} mΩ ({(((currentResult.esr - baselineResult.esr) / baselineResult.esr) * 100).toFixed(1)}%)</div>
                )}
              </div>
            </div>
            
            <div className="mt-8">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2">Impedance Spectrum Z(f)</div>
              <div className="h-48 border border-zinc-100 bg-zinc-50/50 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mergedCurve} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis 
                      dataKey="freq" 
                      scale="log" 
                      domain={['dataMin', 'dataMax']} 
                      type="number"
                      tickFormatter={(val) => {
                        if (val >= 1e9) return (val / 1e9) + 'G';
                        if (val >= 1e6) return (val / 1e6) + 'M';
                        if (val >= 1e3) return (val / 1e3) + 'k';
                        return val;
                      }}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      axisLine={{ stroke: '#e4e4e7' }}
                      tickLine={false}
                    />
                    <YAxis 
                      scale="log" 
                      domain={['auto', 'auto']} 
                      type="number"
                      tickFormatter={(val) => val.toExponential(1)}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      axisLine={{ stroke: '#e4e4e7' }}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: '12px', border: '1px solid #e4e4e7', borderRadius: '4px', boxShadow: 'none' }}
                      labelFormatter={(val) => `Frequency: ${(val as number).toExponential(2)} Hz`}
                      formatter={(val: any) => [val ? Number(val).toExponential(4) + ' Ω' : '', 'Impedance']}
                    />
                    <Line type="monotone" dataKey={history.length === 2 ? "Baseline" : "z"} stroke="#18181b" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1000} name="Baseline" />
                    {history.length === 2 && (
                      <Line type="monotone" dataKey="Comparison" stroke="#a1a1aa" strokeDasharray="5 5" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1000} name="Comparison" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="mt-6 bg-zinc-50 border border-zinc-200 p-4">
              <h4 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-700 mb-3">Model Insights (PINN)</h4>
              <ul className="text-xs text-zinc-600 leading-relaxed space-y-3">
                <li>
                  <strong className="text-zinc-800">Why the V-Shaped Curve?</strong> The graph shows how impedance changes with frequency. At low frequencies, it acts as a capacitor (impedance drops). The minimum point is the <em>Resonant Frequency</em>, where parasitic inductance (ESL) cancels capacitance. At higher frequencies, the ESL dominates and it acts like an inductor (impedance rises).
                </li>
                <li>
                  <strong className="text-zinc-800">Physical Derating:</strong> Try increasing the DC Bias or changing the Temperature. The PINN has learned real-world physics: high-K ceramics lose capacitance under high electric fields (voltage derating) and drift with temperature. A traditional formula would miss this entirely.
                </li>
                <li>
                  <strong className="text-zinc-800">Under the Hood:</strong> The model combines a hard-coded <em>Physics Branch</em> (computing ideal <code className="bg-zinc-200/50 px-1.5 py-0.5 rounded font-mono text-[10px] text-zinc-800 tracking-wider">C = ε₀ · εᵣ · A · N / d</code>) with a neural network <em>Residual Branch</em> that predicts the non-ideal deviations based on 50,000 simulated physics samples.
                </li>
              </ul>
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Model Confidence</div>
                {currentResult.confidence === 'high' ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 border border-zinc-300 text-[10px] font-semibold text-zinc-700 bg-zinc-50">
                    <CheckCircle2 className="w-3 h-3" /> IN-DISTRIBUTION
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 border border-zinc-300 text-[10px] font-semibold text-zinc-700 bg-zinc-100">
                    <AlertCircle className="w-3 h-3" /> OUT-OF-DISTRIBUTION
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 p-6 h-full flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Activity className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
              <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">Waiting for input</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
