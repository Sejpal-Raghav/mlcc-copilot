import { query } from "@/lib/db";
import { Database, AlertCircle, Clock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    let designs = [];
    let inspections = [];
    let error = null;

    try {
        const designsRes = await query(`SELECT * FROM designs ORDER BY created_at DESC LIMIT 50`);
        designs = designsRes.rows;

        const inspectionsRes = await query(`SELECT * FROM inspections ORDER BY created_at DESC LIMIT 50`);
        inspections = inspectionsRes.rows;
    } catch (err: any) {
        error = err.message || "Failed to load history";
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-200 pb-4">
                <Database className="w-5 h-5 text-zinc-900" />
                <h2 className="text-lg font-semibold text-zinc-900 uppercase tracking-wide">System Logs</h2>
            </div>
            
            {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div>
                        <div className="font-semibold mb-1">Database Connection Error</div>
                        <div>{error}. Ensure Postgres is running.</div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-zinc-200">
                <div className="p-4 border-b border-zinc-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-900">Inference History</h3>
                </div>
                {designs.length === 0 ? (
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 text-center py-12">No records found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Parameters (εᵣ, N, A, d)</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Prediction</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-zinc-100">
                                {designs.map((d: any) => (
                                    <tr key={d.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-500 font-mono">{new Date(d.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-900 font-mono">
                                            {Number(d.epsilon_r).toFixed(1)}, {d.layers}, {Number(d.area).toExponential(2)}, {Number(d.thickness).toExponential(2)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-900 font-mono">{Number(d.predicted_capacitance).toExponential(4)} F</td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider border ${d.pass_fail ? 'border-zinc-300 text-zinc-700 bg-zinc-50' : 'border-zinc-400 text-zinc-900 bg-zinc-200'}`}>
                                                {d.pass_fail ? 'PASS' : 'FAIL'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-white border border-zinc-200">
                <div className="p-4 border-b border-zinc-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-900">Inspection History</h3>
                </div>
                {inspections.length === 0 ? (
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 text-center py-12">No records found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Classification</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-zinc-100">
                                {inspections.map((i: any) => (
                                    <tr key={i.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-500 font-mono">{new Date(i.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold uppercase tracking-wider border ${!i.defect ? 'border-zinc-300 text-zinc-700 bg-zinc-50' : 'border-zinc-400 text-zinc-900 bg-zinc-200'}`}>
                                                {i.defect ? 'DEFECT' : 'CLEAR'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-900 font-mono uppercase tracking-widest">{i.defect_type || '-'}</td>
                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-900 font-mono">{(Number(i.confidence) * 100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
