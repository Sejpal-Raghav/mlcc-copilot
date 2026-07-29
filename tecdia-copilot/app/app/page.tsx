"use client";

import { useState } from "react";

export default function PredictPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      epsilon_r: parseFloat(formData.get("epsilon_r") as string),
      layers: parseInt(formData.get("layers") as string, 10),
      area: parseFloat(formData.get("area") as string),
      thickness: parseFloat(formData.get("thickness") as string),
    };

    try {
      const res = await fetch("/api/predict-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Prediction failed");

      setResult(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Predict Performance</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dielectric Constant (εᵣ)</label>
            <input type="number" name="epsilon_r" step="0.1" required defaultValue={1000} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Layers (N)</label>
            <input type="number" name="layers" required defaultValue={100} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Area (m²)</label>
            <input type="number" name="area" step="any" required defaultValue={1e-5} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Thickness (m)</label>
            <input type="number" name="thickness" step="any" required defaultValue={10e-6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            {loading ? "Predicting..." : "Run Prediction"}
          </button>
          
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </form>

        {result && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Results</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500">Capacitance:</span>
                <span className="ml-2 font-mono">{result.capacitance.toExponential(4)} F</span>
              </div>
              <div>
                <span className="text-gray-500">Resonant Frequency:</span>
                <span className="ml-2 font-mono">{(result.resonantFrequency / 1e6).toFixed(2)} MHz</span>
              </div>
              <div>
                <span className="text-gray-500">ESR:</span>
                <span className="ml-2 font-mono">{(result.esr * 1000).toFixed(2)} mΩ</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Confidence:</span>
                  {result.confidence === 'high' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">High (In-Distribution)</span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Low (OOD)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
