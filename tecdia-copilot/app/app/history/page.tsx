import { query } from "@/lib/db";

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
            <h2 className="text-2xl font-semibold mb-6">History & Yield Trends</h2>
            
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md">
                    Error loading database: {error}. Is Postgres running?
                </div>
            )}

            <div className="bg-white shadow sm:rounded-lg p-6">
                <h3 className="text-xl font-medium mb-4">Design Submissions</h3>
                {designs.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">No designs submitted yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Params (εᵣ, N, A, d)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted Cap</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass/Fail</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {designs.map((d: any) => (
                                    <tr key={d.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(d.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {Number(d.epsilon_r).toFixed(1)}, {d.layers}, {Number(d.area).toExponential(2)}, {Number(d.thickness).toExponential(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{Number(d.predicted_capacitance).toExponential(4)} F</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${d.pass_fail ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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

            <div className="bg-white shadow sm:rounded-lg p-6">
                <h3 className="text-xl font-medium mb-4">Inspection History</h3>
                {inspections.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">No inspections performed yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Defect Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {inspections.map((i: any) => (
                                    <tr key={i.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(i.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${!i.defect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {i.defect ? 'DEFECT' : 'CLEAN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{i.defect_type || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(Number(i.confidence) * 100).toFixed(1)}%</td>
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
