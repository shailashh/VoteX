'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ManageSheetsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [serviceAccount, setServiceAccount] = useState('');
    const [masterSheetId, setMasterSheetId] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'owner') {
            router.push('/');
        } else {
            setIsAuthorized(true);
            const storedCreds = localStorage.getItem('googleApiCredentials');
            const storedSheetId = localStorage.getItem('masterSheetId');
            if (storedCreds) {
                setServiceAccount(storedCreds);
            }
            if (storedSheetId) {
                setMasterSheetId(storedSheetId);
            }
        }
    }, [router]);

    const handleSave = () => {
        setSaveSuccess(false);
        if (!serviceAccount.trim() || !masterSheetId.trim()) {
            toast({
                title: 'Error',
                description: 'Please provide both Service Account JSON and Google Sheet ID.',
                variant: 'destructive',
            });
            return;
        }
        try {
            JSON.parse(serviceAccount);
            localStorage.setItem('googleApiCredentials', serviceAccount);
            localStorage.setItem('masterSheetId', masterSheetId);
            toast({
                title: 'Saved!',
                description: 'Your Google Sheets settings have been saved successfully.',
            });
            setSaveSuccess(true);
        } catch (error) {
            console.error("Failed to parse service account JSON:", error);
            toast({
                title: 'Invalid JSON',
                description: 'The service account credentials are not valid JSON. Please copy the entire file content.',
                variant: 'destructive',
            });
        }
    };
    
    if (!isAuthorized) {
        return null;
    }

    return (
        <>
            <Header />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Google Sheets</CardTitle>
                            <CardDescription>
                                Configure your Google Sheets API credentials and settings here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert variant="default">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Setup Instructions</AlertTitle>
                                <AlertDescription>
                                    <ol className="list-decimal list-inside space-y-2 mt-2">
                                        <li>Go to the Google Cloud Console and create a Service Account.</li>
                                        <li>Enable the **Google Sheets API** and **Google Drive API** for your project.</li>
                                        <li>Download the JSON credentials for your service account.</li>
                                        <li>Create a Google Sheet where all the form data will be saved.</li>
                                        <li>Share this Google Sheet with the service account's email address (found in the JSON file) giving it "Editor" access.</li>
                                        <li>Paste the entire content of the JSON credentials file below.</li>
                                        <li>Paste the ID of your Google Sheet.</li>
                                    </ol>
                                </AlertDescription>
                            </Alert>

                            {saveSuccess && (
                                <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertTitle>Settings Saved</AlertTitle>
                                    <AlertDescription>
                                       Your Google Sheets settings have been successfully stored in your browser. You can now navigate to the data entry page.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="service-account">Service Account JSON</Label>
                                <Textarea
                                    id="service-account"
                                    placeholder='Paste your JSON credentials here...'
                                    value={serviceAccount}
                                    onChange={(e) => { setServiceAccount(e.target.value); setSaveSuccess(false); }}
                                    rows={10}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="master-sheet-id">Google Sheet ID</Label>
                                <Input
                                    id="master-sheet-id"
                                    placeholder="Enter the ID of your Google Sheet"
                                    value={masterSheetId}
                                    onChange={(e) => { setMasterSheetId(e.target.value); setSaveSuccess(false); }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    You can find the ID in the sheet URL: `.../spreadsheets/d/`**`SHEET_ID`**`/edit`
                                </p>
                            </div>

                             <div className="flex justify-end gap-2">
                                <Button onClick={handleSave}>
                                    <Save className="mr-2 h-4 w-4" /> Save Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
