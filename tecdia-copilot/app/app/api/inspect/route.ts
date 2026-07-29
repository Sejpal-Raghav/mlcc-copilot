import { NextRequest, NextResponse } from 'next/server';
import { extractFeatures } from '@/lib/features';
import { inspectImageFeatures } from '@/lib/models';
import { query } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File | null;

        if (!file) {
            return NextResponse.json({ error: "No image file provided" }, { status: 400 });
        }

        const validTypes = ['image/jpeg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only JPEG/PNG allowed." }, { status: 400 });
        }
        
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save buffer temporarily to pass to python script
        const tempPath = path.join(os.tmpdir(), `upload_${Date.now()}_${file.name}`);
        await writeFile(tempPath, buffer);

        // Extract features
        const features = await extractFeatures(tempPath);

        // Inspect
        const result = await inspectImageFeatures(features);

        // Save to DB
        await query(
            `INSERT INTO inspections (defect, defect_type, confidence) VALUES ($1, $2, $3)`,
            [result.defect, result.defectType, result.confidence]
        );

        return NextResponse.json({ ...result, features });
    } catch (err) {
        console.error("Inspect Error:", err);
        return NextResponse.json({ error: "Inspection failed" }, { status: 500 });
    }
}
