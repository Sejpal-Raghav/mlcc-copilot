"""
Generate synthetic MLCC training data with realistic non-ideal effects.

Physics modeled:
  1. Voltage derating — Class II ceramics lose capacitance under DC bias
  2. Temperature coefficient — εᵣ drifts with temperature (X7R/X5R/C0G behavior)
  3. Fringing / edge effects — geometry-dependent parasitic capacitance
  4. Parasitic inductance (ESL) — from internal electrodes, causes self-resonance
  5. ESR — electrode resistance + dielectric loss (tan δ)
  6. Measurement noise — ~1-3% to simulate real lab conditions
"""

import os
import numpy as np
import pandas as pd

EPSILON_0 = 8.854e-12


def generate_pinn_dataset(n_samples=50000, seed=42):
    np.random.seed(seed)

    # ── Design parameters (same bounds as original training) ──────────
    epsilon_r = np.random.uniform(500, 10000, n_samples)
    layers    = np.random.randint(10, 501, n_samples).astype(float)
    area      = np.exp(np.random.uniform(np.log(1e-6), np.log(25e-6), n_samples))
    thickness = np.exp(np.random.uniform(np.log(1e-6), np.log(50e-6), n_samples))

    # ── Operating conditions ──────────────────────────────────────────
    v_bias      = np.random.uniform(0, 50, n_samples)       # DC bias voltage (V)
    temperature = np.random.uniform(-40, 125, n_samples)     # Temperature (C)

    # ==================================================================
    # IDEAL PHYSICS
    # ==================================================================
    C_ideal = EPSILON_0 * epsilon_r * area * layers / thickness

    # ==================================================================
    # NON-IDEAL EFFECT 1: Voltage derating
    # Class II ceramics (high-K BaTiO3) lose 30-80% capacitance at rated V.
    # Higher epsilon_r materials have stronger voltage sensitivity.
    # ==================================================================
    v_rated = thickness * 2e7                                  # ~20 V/um
    v_ratio = np.clip(v_bias / np.maximum(v_rated, 1.0), 0, 1)

    # k_voltage: 0.1 for low-K (C0G-like), up to 0.6 for high-K (Y5V-like)
    k_voltage = 0.1 + 0.5 * (epsilon_r - 500) / 9500
    voltage_derating = 1.0 - k_voltage * v_ratio ** 1.8
    voltage_derating = np.clip(voltage_derating, 0.2, 1.0)

    # ==================================================================
    # NON-IDEAL EFFECT 2: Temperature coefficient
    # Low-K  (C0G, eps_r < 1000): ~+/-30 ppm/C (nearly flat)
    # Mid-K  (X7R, 1000-4000):    +/-15% from -55C to +125C
    # High-K (Y5V, > 4000):       +/-80%
    # Parabolic model centered at 25C.
    # ==================================================================
    temp_dev = temperature - 25.0
    tcc = 0.0003 + 0.002 * (epsilon_r - 500) / 9500           # fractional per C
    temp_coeff = 1.0 + tcc * temp_dev - 1e-5 * temp_dev ** 2
    temp_coeff = np.clip(temp_coeff, 0.3, 1.3)

    # ==================================================================
    # NON-IDEAL EFFECT 3: Fringing / edge effects
    # Adds 2-8% for small-area / thick-dielectric geometries.
    # ==================================================================
    aspect_ratio = np.sqrt(area) / thickness
    fringing = 1.0 + 0.08 / (1.0 + 0.1 * aspect_ratio)

    # ==================================================================
    # EFFECTIVE CAPACITANCE
    # ==================================================================
    C_eff = C_ideal * voltage_derating * temp_coeff * fringing

    # ==================================================================
    # PARASITIC INDUCTANCE (ESL)
    # Typical 0.5-2 nH; scales with electrode length and layer count.
    # ==================================================================
    electrode_len = np.sqrt(area)
    esl = 0.5e-9 + 1.5e-9 * (electrode_len / np.sqrt(25e-6)) * (1 + 0.05 * layers / 100)

    # ==================================================================
    # SELF-RESONANT FREQUENCY
    # ==================================================================
    f_res = 1.0 / (2 * np.pi * np.sqrt(C_eff * esl))

    # ==================================================================
    # ESR  (electrode resistance + dielectric loss)
    # ==================================================================
    rho_electrode = 2e-8                                       # Ni electrode resistivity
    R_electrode   = rho_electrode * layers / area * thickness

    # tan(delta): 0.001 for C0G, up to 0.02 for high-K
    tan_delta   = 0.001 + 0.02 * (epsilon_r - 500) / 9500
    R_dielectric = tan_delta / (2 * np.pi * 1e6 * C_eff)      # at 1 MHz reference

    esr = R_electrode + R_dielectric

    # ==================================================================
    # MEASUREMENT NOISE  (~1-3 %)
    # ==================================================================
    C_eff *= 1 + np.random.normal(0, 0.015, n_samples)
    f_res *= 1 + np.random.normal(0, 0.020, n_samples)
    esr   *= 1 + np.random.normal(0, 0.030, n_samples)

    # Enforce physical validity
    C_eff = np.maximum(C_eff, 1e-15)
    f_res = np.maximum(f_res, 1e3)
    esr   = np.maximum(esr,   1e-6)

    df = pd.DataFrame({
        "epsilon_r":          epsilon_r,
        "layers":             layers,
        "area":               area,
        "thickness":          thickness,
        "v_bias":             v_bias,
        "temperature":        temperature,
        "capacitance":        C_eff,
        "resonant_frequency": f_res,
        "esr":                esr,
    })
    return df


if __name__ == "__main__":
    df = generate_pinn_dataset(50000)
    out_path = os.path.join(os.path.dirname(__file__), "mlcc_pinn_dataset.csv")
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} samples -> {out_path}")
    print(f"\nSample ranges:")
    for col in df.columns:
        print(f"  {col:>22s}: {df[col].min():.4g}  to  {df[col].max():.4g}")
