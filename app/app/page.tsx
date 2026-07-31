import Link from "next/link";
import { Activity, Search, ScanLine, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      {/* Hero Section */}
      <section className="bg-white border border-zinc-200 p-8 md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-zinc-900 mb-4 uppercase tracking-wide">MLCC Copilot</h1>
          <p className="text-base text-zinc-600 leading-relaxed mb-8">
            An advanced AI engineering suite for Multi-Layer Ceramic Capacitors. This platform utilizes continuous neural architectures to move beyond ideal mathematical formulas, perfectly capturing non-ideal real-world behaviors for forward performance prediction, gradient-based inverse design, and automated optical defect inspection.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/predict" className="inline-flex items-center gap-2 py-2.5 px-5 border border-zinc-900 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors uppercase tracking-wider">
              Start Prediction <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Dataset & Methodology */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-4">
            <Activity className="w-5 h-5 text-zinc-900" />
            <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">PINN Surrogate Dataset</h2>
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed">
            The Performance Prediction and Auto-Tune features are powered by a Physics-Informed Neural Network (PINN). The dataset consists of over <strong className="text-zinc-800">50,000 physics-simulated combinations</strong> of dielectric constant (εᵣ), layers, area, and thickness.
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed mt-4">
            Unlike standard idealized formulas, the dataset explicitly captures complex real-world parasitics (ESL/ESR), DC bias voltage derating (domain locking), and temperature coefficient drift, ensuring that predictions remain accurate under high-stress operating conditions.
          </p>
        </div>

        <div className="bg-white border border-zinc-200 p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-4">
            <ScanLine className="w-5 h-5 text-zinc-900" />
            <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">AOI Vision Dataset</h2>
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed">
            The Automated Optical Inspection feature uses a native 3-layer Convolutional Neural Network (CNN) built in PyTorch. 
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed mt-4">
            It was trained on a synthetic dataset of <strong className="text-zinc-800">high-contrast 128x128 grayscale microscopy imagery</strong> covering 4 distinct classes: Clean components, Scratches, Voids, and Edge Chips. The network detects defects natively from pixel data without requiring brittle manual feature engineering like edge detection or SIFT.
          </p>
        </div>
      </section>

      {/* Tools Overview */}
      <section>
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-6 border-b border-zinc-200 pb-2">Suite Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/predict" className="group bg-white border border-zinc-200 p-6 hover:border-zinc-900 transition-colors block">
            <Activity className="w-6 h-6 text-zinc-900 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-2 group-hover:underline">Predict</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Forward predict capacitance, ESR, resonant frequency, and plot the full impedance spectrum Z(f) based on hardware geometry and operating conditions.
            </p>
          </Link>
          
          <Link href="/suggest" className="group bg-white border border-zinc-200 p-6 hover:border-zinc-900 transition-colors block">
            <Search className="w-6 h-6 text-zinc-900 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-2 group-hover:underline">Auto-Tune</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Inverse design optimization. Uses Adam Gradient Descent to find the exact parameters needed to hit a target capacitance under specified conditions.
            </p>
          </Link>

          <Link href="/inspect" className="group bg-white border border-zinc-200 p-6 hover:border-zinc-900 transition-colors block">
            <ScanLine className="w-6 h-6 text-zinc-900 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-2 group-hover:underline">Inspect</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Automated Optical Inspection using a Convolutional Neural Network to flag defects like scratches, chips, and voids from camera feeds.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
