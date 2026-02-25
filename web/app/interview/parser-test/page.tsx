
"use client";

import { useState } from 'react';
import { GlobalHeader } from "@/components/layout/global-header";

export default function JobParserTestPage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleParse = async () => {
        if (!url) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/interview/parse-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to parse');
            }

            setResult(data.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <GlobalHeader />
            <main className="flex-1 container max-w-2xl mx-auto py-12 px-4">
                <h1 className="text-3xl font-bold mb-6">Job Posting Parser Test</h1>
                <p className="text-muted-foreground mb-8">
                    Enter a job posting URL (e.g., Saramin, Wanted) to extract information without database connection.
                </p>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.saramin.co.kr/..."
                            className="flex-1 px-4 py-2 border rounded-md bg-background"
                        />
                        <button
                            onClick={handleParse}
                            disabled={loading || !url}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                        >
                            {loading ? 'Parsing...' : 'Parse URL'}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                            Error: {error}
                        </div>
                    )}

                    {result && (
                        <div className="mt-8 p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                            <h2 className="text-xl font-semibold mb-4">Parsed Result</h2>

                            {result.image && (
                                <img src={result.image} alt="Preview" className="w-full h-48 object-cover mb-4 rounded bg-muted" />
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                                    <p className="text-lg">{result.title}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                                    <p className="font-medium">{result.company || 'N/A'}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Description (Summary)</label>
                                    <p className="text-sm text-gray-600 line-clamp-4">{result.description}</p>
                                </div>

                                <div className="pt-4 border-t">
                                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-60">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
