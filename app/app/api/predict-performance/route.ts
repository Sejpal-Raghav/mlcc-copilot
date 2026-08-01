import { NextRequest, NextResponse } from 'next/server';
import { predictPerformance } from '@/lib/models';


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { epsilon_r, layers, area, thickness, v_bias, temperature } = body;

        const isValid = (v: any, min: number) => typeof v === 'number' && !isNaN(v) && isFinite(v) && v >= min;

        if (
            !isValid(epsilon_r, 1) ||
            !isValid(layers, 1) ||
            !isValid(area, 1e-9) ||
            !isValid(thickness, 1e-9) ||
            !isValid(v_bias, 0) ||
            !isValid(temperature, -273)
        ) {
            return NextResponse.json({ error: "Invalid numeric parameters" }, { status: 400 });
        }

        // Get prediction from model
        const result = await predictPerformance(epsilon_r, layers, area, thickness, v_bias, temperature);



        return NextResponse.json(result);
    } catch (err) {
        console.error("Predict Error:", err);
        return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
    }
}
