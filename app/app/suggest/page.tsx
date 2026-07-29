"use client";

import { useState } from "react";

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
    <div className="bg-white shadow sm:rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Auto-Tune Design</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Target Capacitance (F)</label>
                <input type="number" name="targetCapacitance" step="any" required defaultValue={1e-9} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Tolerance (%)</label>
                <input type="number" name="tolerancePct" step="0.1" required defaultValue={5.0} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                {loading ? "Searching..." : "Find Candidates"}
            </button>
            
            {error && <div className="text-red-600 mt-2">{error}</div>}
            </form>
        </div>

        <div className="col-span-2">
            {candidates.length > 0 && (
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Top Candidates</h3>
                {candidates.map((cand, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between">
                        <div className="space-y-1">
                            <div className="font-semibold text-gray-900">Candidate #{idx + 1}</div>
                            <div className="text-sm text-gray-600">
                                εᵣ: {cand.epsilon_r.toFixed(1)} | N: {cand.layers} | A: {(cand.area*1e6).toFixed(2)} mm² | d: {(cand.thickness*1e6).toFixed(2)} µm
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-0 text-right">
                            <div className="text-sm font-mono">{cand.predictedCapacitance.toExponential(4)} F</div>
                            <div className="text-xs text-green-600">{(cand.distanceToTarget * 100).toFixed(2)}% off target</div>
                        </div>
                    </div>
                ))}
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
