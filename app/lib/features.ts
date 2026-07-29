import { spawn } from 'child_process';
import path from 'path';

/**
 * Extracts CV features by calling the Python contingency script.
 * Returns [edge_density, contour_count, contour_area_var, contour_area_max]
 */
export async function extractFeatures(imagePath: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), '..', 'training', 'models', 'extract_features_cli.py');
        const pythonPath = path.join(process.cwd(), '..', 'training', 'venv', 'Scripts', 'python.exe');

        const py = spawn(pythonPath, [scriptPath, imagePath]);
        let output = '';
        let errorOutput = '';

        py.stdout.on('data', (data) => {
            output += data.toString();
        });

        py.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        py.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
            }
            try {
                const parsed = JSON.parse(output);
                if (parsed.error) {
                    reject(new Error(parsed.error));
                } else {
                    resolve(parsed.features);
                }
            } catch (err) {
                reject(new Error('Failed to parse Python output'));
            }
        });
    });
}
