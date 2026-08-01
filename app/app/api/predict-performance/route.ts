import { NextRequest, NextResponse } from 'next/server';
import { predictPerformance } from '@/lib/models';


import { z } from 'zod';

const predictSchema = z.object({
    epsilon_r: z.number().min(1).max(20000),
    layers: z.number().int().min(1).max(5000),
    area: z.number().min(1e-9).max(1),
    thickness: z.number().min(1e-9).max(1),
    v_bias: z.number().min(0).max(100),
    temperature: z.number().min(-273).max(300)
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        const parseResult = predictSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ 
                error: "Invalid numeric parameters", 
                details: parseResult.error.format() 
            }, { status: 400 });
        }
        
        const { epsilon_r, layers, area, thickness, v_bias, temperature } = parseResult.data;

        // Get prediction from model
        const result = await predictPerformance(epsilon_r, layers, area, thickness, v_bias, temperature);



        return NextResponse.json(result);
    } catch (err) {
        console.error("Predict Error:", err);
        return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
    }
}
