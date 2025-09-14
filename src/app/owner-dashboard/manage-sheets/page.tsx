'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ManageSheetsPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'owner') {
            router.push('/');
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    if (!isAuthorized) {
        return null;
    }

    return (
        <>
            <Header />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Google Sheets</CardTitle>
                            <CardDescription>
                                Configure Google Sheets integration using environment variables.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert variant="default">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Important: Configuration has moved!</AlertTitle>
                                <AlertDescription>
                                    <p className="mb-4">
                                        For better security and reliability, Google Sheets settings are no longer stored in your browser. They must be configured using **Environment Variables** in your project deployment settings.
                                    </p>
                                    <ol className="list-decimal list-inside space-y-3">
                                        <li>
                                            <strong>Create a Service Account & JSON Credentials:</strong>
                                            <ul className="list-disc list-inside pl-5 mt-1 text-xs text-muted-foreground">
                                                <li>Go to the Google Cloud Console and create a Service Account.</li>
                                                <li>Enable the **Google Sheets API** and **Google Drive API**.</li>
                                                <li>Download the JSON credentials file for your service account.</li>
                                            </ul>
                                        </li>
                                        <li>
                                            <strong>Set up your Google Sheet:</strong>
                                            <ul className="list-disc list-inside pl-5 mt-1 text-xs text-muted-foreground">
                                                <li>Create a new Google Sheet where all form data will be saved.</li>
                                                <li>Share this sheet with the service account's email (found in the JSON file) and give it "Editor" access.</li>
                                            </ul>
                                        </li>
                                        <li>
                                            <strong>Set Environment Variables:</strong>
                                            <p className="text-xs text-muted-foreground mt-1">In your hosting environment (like Firebase App Hosting), set the following two variables:</p>
                                            <div className="space-y-2 mt-2 font-mono text-xs bg-muted p-3 rounded-md">
                                                <p>
                                                    <span className="font-semibold">MASTER_SHEET_ID</span>="<span className="text-primary">[Your Google Sheet ID]</span>"
                                                </p>
                                                <p>
                                                    <span className="font-semibold">GOOGLE_API_CREDENTIALS</span>="<span className="text-primary">[Paste the entire content of the JSON credentials file here]</span>"
                                                </p>
                                            </div>
                                             <p className="text-xs text-muted-foreground mt-2">
                                                The Sheet ID can be found in the sheet's URL: `.../spreadsheets/d/`**`SHEET_ID`**`/edit`
                                            </p>
                                        </li>
                                    </ol>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
