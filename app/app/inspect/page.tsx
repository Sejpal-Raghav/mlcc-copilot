"use client";

import { useState } from "react";

export default function InspectPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("image") as File;
    if (!file || file.size === 0) {
        setError("Please select an image");
        setLoading(false);
        return;
    }

    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        body: formData, // fetch automatically sets the correct multipart boundary
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Inspection failed");

      setResult(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Automated Visual Inspection</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload Component Image</label>
            <input type="file" name="image" accept="image/jpeg, image/png" onChange={handleFileChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            {loading ? "Analyzing..." : "Inspect"}
          </button>
          
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </form>

        <div className="flex flex-col items-center">
            {preview ? (
                <img src={preview} alt="Preview" className="max-w-full h-auto rounded-lg shadow-md max-h-64 object-contain" />
            ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                    No image selected
                </div>
            )}

            {result && (
            <div className={`mt-6 w-full p-4 rounded-lg border ${result.defect ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center mb-2">
                    <span className={`text-lg font-bold ${result.defect ? 'text-red-800' : 'text-green-800'}`}>
                        {result.defect ? 'Defect Detected' : 'Pass (Clean)'}
                    </span>
                </div>
                {result.defect && (
                    <div className="text-red-700 mb-2">
                        Type: <span className="font-semibold capitalize">{result.defectType}</span>
                    </div>
                )}
                <div className="text-sm text-gray-600">
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <div className="font-semibold mb-1">Extracted Features:</div>
                    <pre>{JSON.stringify(result.features, null, 2)}</pre>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
