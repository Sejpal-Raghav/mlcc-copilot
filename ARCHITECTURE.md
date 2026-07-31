# Technical Decisions and Architecture

This document outlines the core technical decisions made while building the MLCC Copilot and the rationale behind each choice.

## 1. Physics-Informed Neural Networks over Classical ML

### Decision
Replaced Random Forest and Gradient Boosting models with a PyTorch Physics-Informed Neural Network (PINN).

### Rationale
Classical tree based models are excellent for tabular data, but they struggle to learn continuous physical laws and smooth gradients. A PINN allows us to bake in the ideal capacitance formula `C = (epsilon * A * N) / d` as a hardcoded branch, while a Multi-Layer Perceptron (MLP) learns the non-linear residuals caused by physical parasitics like voltage derating and thermal drift. This guarantees physical baseline accuracy while capturing edge cases. Furthermore, Neural Networks provide continuous gradients, which is essential for inverse design.

## 2. Adam Gradient Descent over Monte Carlo Search

### Decision
Replaced the random Monte Carlo search in the Auto-Tune feature with an Adam Gradient Descent optimizer.

### Rationale
Monte Carlo search relies on brute-force random sampling. For a high-dimensional continuous physics space, this is incredibly inefficient. Because we migrated to a continuous Neural Network, we can calculate gradients using Finite Differences. By implementing a custom Adam optimizer in TypeScript, the system can mathematically follow the gradient vector to find the exact geometric parameters needed to hit a target specification in milliseconds.

## 3. Convolutional Neural Networks over Classical Computer Vision

### Decision
Migrated the Automated Optical Inspection (AOI) pipeline from classical OpenCV feature extraction (edge density, contour counting) to a native 3-layer Convolutional Neural Network (CNN).

### Rationale
Classical computer vision requires manual feature engineering, making it highly brittle to lighting changes, camera angles, or unexpected defect shapes. A CNN learns hierarchical spatial features directly from raw 128x128 grayscale pixels, resulting in a much more robust defect classifier that generalizes better to new variations of scratches, chips, and voids.

## 4. ONNX Runtime over FastAPI Python Backend

### Decision
Exported all PyTorch models to ONNX and run them directly in the Next.js Node.js backend using `onnxruntime-node`, eliminating the need for a separate Python FastAPI server.

### Rationale
Maintaining two separate deployment stacks (Node.js for the frontend and Python for the models) increases latency, deployment complexity, and infrastructure costs. Compiling models to ONNX allows the entire application to run in a unified, highly optimized Node environment. ONNX Runtime in Node is backed by C++ bindings, offering inference speeds (under 15 milliseconds) that rival or exceed native Python execution.

## 5. Stateless Architecture over PostgreSQL

### Decision
Removed the PostgreSQL database requirement, making the application entirely stateless.

### Rationale
The primary value of the MLCC Copilot is real-time physics inference and inverse design. Storing logs or caching inference results adds unnecessary state management and slows down the user experience. Making the application stateless allows it to be deployed easily to containerized environments and scale infinitely without database bottlenecking.
