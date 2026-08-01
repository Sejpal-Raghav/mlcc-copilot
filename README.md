# MLCC Copilot

MLCC Copilot is an advanced AI engineering suite designed to solve the physical constraints of Multi-Layer Ceramic Capacitor (MLCC) manufacturing. It replaces computationally expensive physical simulations with instantaneous neural network inference. By embedding Physics-Informed Neural Networks (PINNs) and Convolutional Neural Networks (CNNs) directly into a Next.js full-stack application via ONNX Runtime, it empowers hardware engineers to predict performance, automatically optimize geometric parameters, and inspect manufacturing defects in real time.

## Core Features

### 1. Performance Prediction (Forward Physics)
Replaces slow Finite-Element Analysis (FEA) simulations with a neural surrogate model.
* **Input:** Dielectric constant, Layers, Area, Thickness, DC Bias, Temperature.
* **Output:** Predicted capacitance, resonant frequency, Equivalent Series Resistance (ESR), and full impedance spectrum Z(f).
* **Comparison Mode:** Allows A/B testing of two designs side-by-side. Visualizes delta percentages in a tabular layout and overlays both impedance spectrums for direct curve comparison.
* **PINN Advantage:** Unlike ideal mathematical formulas, the dataset explicitly captures complex real-world parasitics, domain locking under high voltage, and temperature drift.

### 2. Auto-Tune (Inverse Design)
Given a target capacitance and operating conditions, this feature mathematically finds the exact geometric parameters required.
* **Optimization Engine:** Uses Adam Gradient Descent via Finite Differences to compute gradients and optimize the input parameters.
* **Convergence Visualization:** Live-plots the optimizer's loss curve over 50 iterations, showing exactly how the engine converges on the target constraint.
* **Speed:** Finds the optimal physical design in milliseconds without random guessing or Monte Carlo brute force.

### 3. Automated Optical Inspection (AOI)
Classifies component microscopy imagery as defective or clean.
* **Vision Model:** A custom 3-layer Convolutional Neural Network trained on 128x128 high-contrast grayscale imagery.
* **Defect Classes:** Clean, Scratch, Void, and Edge Chip.
* **Native Inference:** The network detects defects natively from pixel data without requiring brittle manual feature engineering.

## Dataset

The physical parameters and electrical characteristics used to train the neural network surrogate model were generated via a massive synthetic simulation pipeline.
* **Volume:** 50,000 unique capacitor geometries and operating conditions.
* **Generation Method:** Latin Hypercube Sampling across a 6-dimensional parameter space to ensure uniform coverage of edge cases.
* **Target Variables:** The dataset maps geometric inputs to output impedance spectrums (100 frequency points per sample), resonant frequencies, and parasitic resistance.

## Tech Stack

* **Model Training (Offline):** Python, PyTorch.
* **Model Serving:** Node.js, onnxruntime-node.
* **Frontend:** Next.js (App Router), Tailwind CSS, Recharts.
* **Optimization:** Custom Adam Optimizer implemented in TypeScript.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd app
   npm install
   ```

2. **Run the Development Server**
   ```bash
   npm run dev
   ```

3. **Production Build**
   ```bash
   npm run build
   npm start
   ```
