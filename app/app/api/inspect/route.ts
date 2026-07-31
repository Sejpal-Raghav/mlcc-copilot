import { NextRequest, NextResponse } from 'next/server';
import { inspectImageCNN } from '@/lib/models';
import { query, isDbAvailable } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

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

        // Process image directly in Node.js using sharp
        const { data } = await sharp(buffer)
            .resize(128, 128, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Convert to Float32Array and normalize to [0, 1]
        const floatArray = new Float32Array(128 * 128);
        for (let i = 0; i < data.length; i++) {
            floatArray[i] = data[i] / 255.0;
        }

        // Inspect using CNN
        const result = await inspectImageCNN(floatArray);

        // Save to DB (non-blocking)
        if (isDbAvailable()) {
            query(
                `INSERT INTO inspections (defect, defect_type, confidence) VALUES ($1, $2, $3)`,
                [result.defect, result.defectType, result.confidence]
            ).catch(err => console.warn('DB write failed (non-fatal):', err.message));
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error("Inspect Error:", err);
        return NextResponse.json({ error: "Inspection failed" }, { status: 500 });
    }
}
