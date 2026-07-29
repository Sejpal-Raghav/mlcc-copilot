import { NextRequest, NextResponse } from 'next/server';
import { predictPerformance } from '@/lib/models';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { epsilon_r, layers, area, thickness } = body;

        if (
            typeof epsilon_r !== 'number' || epsilon_r <= 0 ||
            typeof layers !== 'number' || layers <= 0 ||
            typeof area !== 'number' || area <= 0 ||
            typeof thickness !== 'number' || thickness <= 0
        ) {
            return NextResponse.json({ error: "Invalid numeric parameters" }, { status: 400 });
        }

        // Get prediction from model
        const result = await predictPerformance(epsilon_r, layers, area, thickness);

        // Save to database
        await query(
            `INSERT INTO designs (epsilon_r, layers, area, thickness, predicted_capacitance, predicted_resonant_freq, predicted_esr, pass_fail, confidence)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                epsilon_r, layers, area, thickness,
                result.capacitance, result.resonantFrequency, result.esr,
                result.passFail, result.confidence
            ]
        );

        return NextResponse.json(result);
    } catch (err) {
        console.error("Predict Error:", err);
        return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
    }
}
