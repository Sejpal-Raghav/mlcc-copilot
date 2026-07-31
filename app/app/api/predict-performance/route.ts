import { NextRequest, NextResponse } from 'next/server';
import { predictPerformance } from '@/lib/models';


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



        return NextResponse.json(result);
    } catch (err) {
        console.error("Predict Error:", err);
        return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
    }
}
