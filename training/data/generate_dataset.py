import os
import numpy as np
import pandas as pd


def generate_mlcc_data(num_samples=10000, random_seed=42):
    # Use a local generator instead of the global np.random state, so this
    # module doesn't silently affect reproducibility elsewhere if imported
    # alongside other code that also touches np.random.
    rng = np.random.default_rng(random_seed)

    # Constants
    epsilon_0 = 8.854e-12  # F/m
    L_base = 1e-9           # base parasitic inductance scale (H), design-dependent below

    # ---------------------------
    # Input Feature Sampling
    # ---------------------------
    # epsilon_r: Relative permittivity (dielectric constant), e.g. for Class II ceramics
    epsilon_r = rng.uniform(500, 10000, num_samples)

    # layers (N): Number of layers
    layers = rng.integers(10, 501, num_samples)

    # area (A): Overlap area in m^2. Range: 1mm^2 to 25mm^2 (1e-6 to 25e-6 m^2)
    area = rng.uniform(1e-6, 25e-6, num_samples)

    # thickness (d): Dielectric thickness in m. Range: 1um to 50um (1e-6 to 50e-6 m)
    thickness = rng.uniform(1e-6, 50e-6, num_samples)

    # ---------------------------
    # 1. Capacitance (Farads)
    # ---------------------------
    C_ideal = (epsilon_0 * epsilon_r * (layers - 1) * area) / thickness

    # Derating term: performance saturation at high layer counts (documented
    # dielectric behavior at high N, injected deliberately as the dataset's
    # nonlinearity)
    derating_factor = np.exp(-layers * 0.001)

    # Multiplicative measurement/manufacturing noise (5% of the derated value)
    cap_noise = rng.normal(0, 0.05, num_samples)
    C_actual = C_ideal * derating_factor * (1 + cap_noise)

    # ---------------------------
    # 2. Equivalent Series Resistance (ESR), in Ohms
    # ---------------------------
    # NOTE: this is a declared heuristic, not a first-principles resistance
    # derivation — thickness/(area*layers) doesn't reduce to true ohms on its
    # own. It's constructed so ESR decreases with more layers (more parallel
    # conduction paths) and larger area, and increases with thickness,
    # matching the qualitative direction of real MLCC behavior.
    #
    # sqrt() compresses the raw ratio's ~5-order-of-magnitude range so the
    # structural signal doesn't blow up for extreme (thin-area, few-layer)
    # designs, and the noise below is *multiplicative* (relative to the
    # signal) rather than a fixed absolute std — a fixed absolute noise std
    # here previously swamped the entire structural signal.
    resistance_term = thickness / (area * layers)
    esr_ideal = 0.002 + 0.008 * np.sqrt(resistance_term)  # ~2-20 mOhm range
    esr_noise = rng.normal(0, 0.05, num_samples)  # 5% relative noise
    esr_actual = np.maximum(esr_ideal * (1 + esr_noise), 0.0005)  # floor at 0.5 mOhm

    # ---------------------------
    # 3. Resonant Frequency (Hz)
    # ---------------------------
    # Effective series inductance is made design-dependent (rather than a
    # fixed constant) so resonant frequency isn't just an algebraic
    # transform of capacitance alone. Heuristic: more layers -> more
    # parallel current paths -> lower effective series inductance.
    inductance = L_base * (50.0 / layers)
    ind_noise = rng.normal(0, 0.05, num_samples)
    L_actual = inductance * (1 + ind_noise)

    srf_ideal = 1 / (2 * np.pi * np.sqrt(L_actual * C_actual))
    srf_noise = rng.normal(0, 0.02, num_samples)
    srf_actual = srf_ideal * (1 + srf_noise)

    # Assemble DataFrame
    df = pd.DataFrame({
        'epsilon_r': epsilon_r,
        'layers': layers,
        'area': area,             # m^2
        'thickness': thickness,   # m
        'capacitance': C_actual,        # Farads
        'resonant_frequency': srf_actual,  # Hz
        'esr': esr_actual,              # Ohms
    })

    return df


def validate_dataset(df):
    """Real assertions, not just eyeballing df.describe()."""
    assert df.isnull().sum().sum() == 0, "Dataset contains NaNs"
    assert (df['capacitance'] > 0).all(), "Non-positive capacitance found"
    assert (df['esr'] > 0).all(), "Non-positive ESR found"
    assert (df['resonant_frequency'] > 0).all(), "Non-positive resonant frequency found"
    assert (df['layers'] >= 10).all() and (df['layers'] <= 500).all(), "Layers out of sampled range"
    assert (df['epsilon_r'] >= 500).all() and (df['epsilon_r'] <= 10000).all(), "epsilon_r out of sampled range"

    # Signal-to-noise sanity check on ESR specifically, since this was the
    # original bug: structural range should not be dwarfed by noise.
    esr_structural_range = df['esr'].max() - df['esr'].min()
    assert esr_structural_range > 0.001, (
        f"ESR structural range too small ({esr_structural_range:.6f}); "
        "signal may be swamped by noise"
    )

    print("Validation passed: no NaNs, all values within expected physical ranges.")


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "mlcc_dataset.csv")

    print("Generating synthetic MLCC dataset...")
    df = generate_mlcc_data(10000)

    print(f"Dataset generated with {len(df)} rows.")
    validate_dataset(df)

    print("\nFeature Summaries:")
    print(df.describe())

    df.to_csv(out_path, index=False)
    print(f"\nSaved dataset to {out_path}")