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
import { Save, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ManageSheetsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [serviceAccount, setServiceAccount] = useState('');
    const [masterSheetId, setMasterSheetId] = useState('');

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
        try {
            if (serviceAccount) {
                JSON.parse(serviceAccount);
                localStorage.setItem('googleApiCredentials', serviceAccount);
            }
            if (masterSheetId) {
                localStorage.setItem('masterSheetId', masterSheetId);
            }
            toast({
                title: 'Saved!',
                description: 'Your Google Sheets settings have been saved.',
            });
        } catch (error) {
            toast({
                title: 'Invalid JSON',
                description: 'The service account credentials are not valid JSON.',
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
                                        <li>Create a Google Sheet to be your "Master Sheet" for logging user sheet creations.</li>
                                        <li>Share this Master Sheet with the service account's email address (found in the JSON file) giving it "Editor" access.</li>
                                        <li>Paste the entire content of the JSON file below.</li>
                                        <li>Paste the ID of your master Google Sheet.</li>
                                    </ol>
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label htmlFor="service-account">Service Account JSON</Label>
                                <Textarea
                                    id="service-account"
                                    placeholder='Paste your JSON credentials here...'
                                    value={serviceAccount}
                                    onChange={(e) => setServiceAccount(e.target.value)}
                                    rows={10}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="master-sheet-id">Master Google Sheet ID</Label>
                                <Input
                                    id="master-sheet-id"
                                    placeholder="Enter the ID of your main Google Sheet"
                                    value={masterSheetId}
                                    onChange={(e) => setMasterSheetId(e.target.value)}
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
