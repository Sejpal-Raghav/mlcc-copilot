import Link from 'next/link';
import { Activity, Search, ScanLine, ArrowRight, Zap, Target, Cpu } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero Section */}
      <section className="bg-white border border-zinc-200 p-8 md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-zinc-900 mb-4 uppercase tracking-wide">
            MLCC Copilot
          </h1>
          <p className="text-base text-zinc-600 leading-relaxed mb-8">
            An advanced AI engineering suite designed to solve the physical constraints of
            Multi-Layer Ceramic Capacitor (MLCC) manufacturing. Powered by Physics-Informed Neural
            Networks (PINNs) and Computer Vision.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/predict"
              className="inline-flex items-center gap-2 py-2.5 px-5 border border-zinc-900 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors uppercase tracking-wider"
            >
              Start Prediction <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* The Problem / Solution / Advantage */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" id="architecture">
        {/* The Problem */}
        <div className="bg-white border border-zinc-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-100 pb-4">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <span className="text-zinc-600 font-bold font-mono">01</span>
            </div>
            <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
              The Problem
            </h2>
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Traditional MLCC engineering relies on ideal mathematical formulas (like{' '}
            <code className="text-[10px] bg-zinc-100 px-1 py-0.5 rounded">C = ε₀·εᵣ·A·N/d</code>)
            that fail in the real world.
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed mt-4">
            Under high DC bias voltages, Class II ceramics suffer from severe "voltage derating"
            (domain locking). At high frequencies, parasitic inductance (ESL) dominates. Testing
            these complex edge cases manually or using Finite-Element Analysis (FEA) takes hours per
            iteration and slows down R&D.
          </p>
        </div>

        {/* The Solution */}
        <div className="bg-white border border-zinc-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-100 pb-4">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <span className="text-zinc-600 font-bold font-mono">02</span>
            </div>
            <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
              The Solution
            </h2>
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed">
            MLCC Copilot replaces slow simulations and trial-and-error with a{' '}
            <strong className="text-zinc-800">Physics-Informed Neural Network (PINN)</strong>.
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed mt-4">
            By training a neural surrogate model on 50,000+ multi-physics simulations, the AI learns
            the underlying physical laws—capturing non-ideal parasitics, thermal drift, and fringing
            fields natively. We also utilize a custom Convolutional Neural Network (CNN) to automate
            optical defect detection.
          </p>
        </div>

        {/* The Advantage */}
        <div className="bg-white border border-zinc-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-100 pb-4">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold font-mono">03</span>
            </div>
            <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">
              Why It's Better
            </h2>
          </div>
          <ul className="text-sm text-zinc-600 leading-relaxed space-y-4">
            <li className="flex gap-3">
              <Zap className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Speed:</strong> Traditional FEA simulation takes hours. Our PINN inference
                runs in ~12 milliseconds.
              </span>
            </li>
            <li className="flex gap-3">
              <Target className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Native Optimization:</strong> Auto-Tune uses Adam Gradient Descent to
                mathematically guarantee the optimal component geometry, eliminating random
                guessing.
              </span>
            </li>
            <li className="flex gap-3">
              <Cpu className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Edge-Ready:</strong> Models are compiled to ONNX, allowing them to run
                directly in the browser or on low-power manufacturing hardware.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Tools Overview */}
      <section>
        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-6 border-b border-zinc-200 pb-2">
          Suite Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/predict"
            className="group bg-white border border-zinc-200 p-6 hover:border-zinc-900 transition-colors block"
          >
            <Activity className="w-6 h-6 text-zinc-900 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-2 group-hover:underline">
              Predict
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Forward predict capacitance, ESR, resonant frequency, and plot the full impedance
              spectrum Z(f) based on hardware geometry and operating conditions.
            </p>
          </Link>

          <Link
            href="/suggest"
            className="group bg-white border border-zinc-200 p-6 hover:border-zinc-900 transition-colors block"
          >
            <Search className="w-6 h-6 text-zinc-900 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-2 group-hover:underline">
              Auto-Tune
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Inverse design optimization. Uses Adam Gradient Descent to find the exact parameters
              needed to hit a target capacitance under specified conditions.
            </p>
          </Link>

          <Link
            href="/inspect"
            className="group bg-white border border-zinc-200 p-6 hover:border-zinc-900 transition-colors block"
          >
            <ScanLine className="w-6 h-6 text-zinc-900 mb-4" />
            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide mb-2 group-hover:underline">
              Inspect
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Automated Optical Inspection using a Convolutional Neural Network to flag defects like
              scratches, chips, and voids from camera feeds.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
