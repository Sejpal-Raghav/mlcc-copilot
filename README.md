# Tecdia Design & Yield Copilot

**Tecdia Design & Yield Copilot** is a portfolio project demonstrating an AI-assisted engineering workflow, tailored to the pillars of surrogate modeling and automated visual inspection.

This tool is built to be a full-stack Next.js application leveraging ONNX Runtime in the backend, utilizing Python only as an offline environment for training models.

## Features

### 1. Surrogate Modeling (Performance Prediction)
Replaces slow simulations with an instant performance predictor for a given MLCC design.
- **Input:** Dielectric constant ($\varepsilon_r$), Layers (N), Area, Thickness.
- **Output:** Predicted capacitance, resonant frequency, ESR, and a pass/fail spec check.
- **Why Random Forest & Gradient Boosting:** The synthetic dataset injects a deliberate non-linearity (a derating factor). Trees capture this effectively without the overhead of neural networks.
- **Out of Distribution (OOD) Check:** The model detects when inputs fall outside the training data distribution, providing a low-confidence warning. (Implemented via `IsolationForest` in ONNX for low latency).

### 2. Auto-Tune (Inverse Design)
Given a target specification (e.g. target capacitance and tolerance), this feature searches for candidate designs.
- **How it works:** Rather than training a highly complex inverse model (which struggles with one-to-many mappings in physics), we use the surrogate model as a cheap oracle to evaluate thousands of randomly sampled designs and return the best candidates.

### 3. Automated Visual Inspection
Classifies component images as defective or clean.
- **Approach:** We use classical Computer Vision feature extraction (OpenCV/sharp: edge density, contour count, area variance) combined with a Gradient Boosting classifier. 
- **Why Classical CV:** For small datasets, a classical CV pipeline provides highly explainable features (you can see exactly what drove the defect call) and trains in seconds, whereas a CNN would require vastly more data and compute for similar accuracy.
- **Implementation:** Extraction is prototyped in Python and falls back to a Python subprocess call in Node.js to ensure exact parity.

## Tech Stack

- **Model Training (Offline):** Python, `scikit-learn`, `opencv-python`, `skl2onnx`
- **Model Serving & Backend:** Node.js, `onnxruntime-node`, Next.js API Routes
- **Frontend:** Next.js (App Router), Tailwind CSS
- **Database:** PostgreSQL (raw `pg` queries for performance and simplicity)

## Setup and Running

1. **Start the Database**
   ```bash
   docker-compose up -d
   ```

2. **Start the Next.js App**
   ```bash
   cd app
   npm install
   npm run dev
   ```

3. **Offline Training (Optional)**
   If you wish to regenerate the models:
   ```bash
   cd training
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python data/generate_dataset.py
   python models/train_surrogate.py
   python data/generate_images.py
   python models/extract_features.py
   ```

## Design Decisions and Trade-offs

- **Next.js + ONNX over FastAPI:** Switching to a single Node.js backend running ONNX models simplifies the deployment architecture, moving Python purely to the offline training phase.
- **Synthetic Data:** The datasets are synthetic and generated procedurally using physics-grounded formulas and explicit noise injection. This provides full control over ground truth for a 5-day project without scraping messy or proprietary data.
- **Raw `pg` over Prisma:** Using a raw `pg` client with parameterized queries provides exactly the required functionality without introducing the complexity of an ORM.
