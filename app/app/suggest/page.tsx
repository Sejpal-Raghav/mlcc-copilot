"use client";

import { useState } from "react";
import { Search, AlertCircle, Cpu } from "lucide-react";

export default function SuggestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCandidates([]);

    const formData = new FormData(e.currentTarget);
    const data = {
      targetCapacitance: parseFloat(formData.get("targetCapacitance") as string),
      tolerancePct: parseFloat(formData.get("tolerancePct") as string),
    };

    try {
      const res = await fetch("/api/suggest-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Search failed");

      setCandidates(resData.candidates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Form Column */}
      <div className="lg:col-span-4 bg-white border border-zinc-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-4">
          <Search className="w-4 h-4 text-zinc-900" />
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Inverse Design</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1.5">Target Capacitance (F)</label>
            <input type="number" name="targetCapacitance" step="any" required defaultValue={1e-9} className="block w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1.5">Tolerance (%)</label>
            <input type="number" name="tolerancePct" step="0.1" required defaultValue={5.0} className="block w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm px-3 py-2 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" />
          </div>
          
          <div className="pt-2">
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-zinc-900 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-colors uppercase tracking-wider">
              {loading ? "Searching Space..." : "Run Search"}
            </button>
          </div>
          
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 flex items-start gap-2 mt-4"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
        </form>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-8">
        <div className="bg-white border border-zinc-200 p-6 h-full flex flex-col">
          <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-6 border-b border-zinc-100 pb-4">Candidate Parameters</h3>
          
          {candidates.length > 0 ? (
            <div className="space-y-4">
              {candidates.map((cand, idx) => (
                <div key={idx} className="bg-white border border-zinc-200 flex flex-col sm:flex-row justify-between p-4 transition-all hover:bg-zinc-50">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center justify-center pr-4 border-r border-zinc-100">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Rank</div>
                      <div className="text-xl font-mono text-zinc-900">0{idx + 1}</div>
                    </div>
                    <div className="space-y-2 py-1">
                      <div className="flex gap-4 text-xs font-mono text-zinc-700">
                        <div><span className="text-zinc-400">εᵣ:</span> {cand.epsilon_r.toFixed(1)}</div>
                        <div><span className="text-zinc-400">N:</span> {cand.layers}</div>
                        <div><span className="text-zinc-400">A:</span> {(cand.area * 1e6).toFixed(2)} mm²</div>
                        <div><span className="text-zinc-400">d:</span> {(cand.thickness * 1e6).toFixed(2)} µm</div>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> Hardware Spec Candidate
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 text-right flex flex-col justify-center">
                    <div className="text-lg font-mono text-zinc-900">{cand.predictedCapacitance.toExponential(4)} F</div>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mt-1">{(cand.distanceToTarget * 100).toFixed(2)}% off target</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <Search className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
                <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">Waiting for constraints</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
