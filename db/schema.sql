CREATE TABLE IF NOT EXISTS designs (
    id SERIAL PRIMARY KEY,
    epsilon_r NUMERIC NOT NULL,
    layers NUMERIC NOT NULL,
    area NUMERIC NOT NULL,
    thickness NUMERIC NOT NULL,
    predicted_capacitance NUMERIC NOT NULL,
    predicted_resonant_freq NUMERIC NOT NULL,
    predicted_esr NUMERIC NOT NULL,
    pass_fail BOOLEAN NOT NULL,
    confidence TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    defect BOOLEAN NOT NULL,
    defect_type TEXT,
    confidence NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
