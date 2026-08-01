'use client';

import { useState } from 'react';
import { Camera, AlertCircle, ScanLine, XCircle, CheckCircle2 } from 'lucide-react';

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
    const file = formData.get('image') as File;
    if (!file || file.size === 0) {
      setError('Please select an image');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Inspection failed');

      setResult(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form Column */}
      <div className="lg:col-span-5 bg-white border border-zinc-200 p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 pb-4">
          <Camera className="w-4 h-4 text-zinc-900" />
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
            Automated Optical Inspection
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1.5">
              Component Image Feed
            </label>
            <input
              type="file"
              name="image"
              accept="image/jpeg, image/png"
              onChange={handleFileChange}
              required
              className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-900 hover:file:bg-zinc-200 cursor-pointer border border-zinc-200"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-zinc-900 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none disabled:opacity-50 transition-colors uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <ScanLine className="w-4 h-4 animate-pulse" /> Processing...
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4" /> Initialize Scan
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 flex items-start gap-2 mt-4">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </form>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7">
        <div className="bg-white border border-zinc-200 p-6 h-full flex flex-col">
          <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-6 border-b border-zinc-100 pb-4">
            Analysis Terminal
          </h3>

          <div className="flex flex-col items-center flex-grow">
            {preview ? (
              <div className="border border-zinc-200 p-2 bg-zinc-50 w-full flex justify-center mb-6">
                <img
                  src={preview}
                  alt="Feed Preview"
                  className="max-w-full h-auto max-h-[300px] object-contain"
                />
              </div>
            ) : (
              <div className="w-full min-h-[300px] bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-6">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">
                    No Image Feed Active
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="w-full border border-zinc-200 text-sm">
                <div
                  className={`p-4 border-b border-zinc-200 flex items-center justify-between ${result.defect ? 'bg-zinc-50' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    {result.defect ? (
                      <XCircle className="w-5 h-5 text-zinc-900" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-zinc-900" />
                    )}
                    <span className="font-mono text-zinc-900 uppercase tracking-widest font-semibold">
                      {result.defect ? 'DEFECT FLAG' : 'CLEARANCE PASS'}
                    </span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    CONF: {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                {result.defect && (
                  <div className="p-4 border-b border-zinc-200 bg-zinc-50">
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-1">
                      Defect Classification
                    </div>
                    <div className="text-lg font-mono text-zinc-900 capitalize">
                      {result.defectType}
                    </div>
                  </div>
                )}

                <div className="mt-6 bg-zinc-50 border border-zinc-200 p-4 w-full">
                  <h4 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-700 mb-3">
                    Model Insights (AOI)
                  </h4>
                  <ul className="text-xs text-zinc-600 leading-relaxed space-y-3">
                    <li>
                      <strong className="text-zinc-800">
                        Native Convolutional Neural Network:
                      </strong>{' '}
                      This inspection tool uses a custom 3-layer CNN built in PyTorch. Unlike older
                      systems that require manual feature engineering (like edge detection or SIFT),
                      this model learns complex spatial hierarchies directly from raw pixel data.
                    </li>
                    <li>
                      <strong className="text-zinc-800">Direct Classification:</strong> The image is
                      resized to 128x128, converted to grayscale, and fed into the ONNX runtime. The
                      network outputs probabilities for 4 classes: Clean, Scratch, Chip, or Void,
                      allowing for millisecond-latency defect detection right in the application.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
