'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ManageSheetsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [googleCreds, setGoogleCreds] = useState('');
    const [masterSheetId, setMasterSheetId] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const loadSettings = useCallback(() => {
        const savedCreds = localStorage.getItem('googleApiCredentials');
        const savedSheetId = localStorage.getItem('masterSheetId');
        if (savedCreds) {
            setGoogleCreds(savedCreds);
        }
        if (savedSheetId) {
            setMasterSheetId(savedSheetId);
        }
    }, []);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'owner') {
            router.push('/');
        } else {
            setIsAuthorized(true);
            loadSettings();
        }
    }, [router, loadSettings]);

    const handleSave = () => {
        setSaveStatus('idle');
        setErrorMessage('');
        
        const trimmedSheetId = masterSheetId.trim();
        if (!trimmedSheetId) {
            setErrorMessage('Master Sheet ID is required.');
            setSaveStatus('error');
            return;
        }

        const trimmedCreds = googleCreds.trim();
        if (!trimmedCreds) {
            setErrorMessage('Google API Credentials are required.');
            setSaveStatus('error');
            return;
        }

        try {
            // Validate JSON format
            JSON.parse(trimmedCreds);
            localStorage.setItem('googleApiCredentials', trimmedCreds);
            localStorage.setItem('masterSheetId', trimmedSheetId);
            
            // Reload state from localstorage to ensure UI is in sync
            loadSettings();

            toast({
                title: 'Settings Saved',
                description: 'Google Sheets credentials and Master Sheet ID have been updated.',
            });
            setSaveStatus('success');
        } catch (error) {
            setErrorMessage('Invalid JSON format in Google API Credentials. Please paste the full, unmodified JSON content.');
            setSaveStatus('error');
            console.error('Failed to parse and save Google credentials:', error);
            toast({
                title: 'Error Saving Settings',
                description: 'The provided Google API Credentials are not valid JSON.',
                variant: 'destructive',
            });
        }
    };
    
    if (!isAuthorized) {
        return null; // or a loading spinner
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
                                Securely store your Google API credentials and Master Sheet ID. This information is saved only in your browser's local storage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           {saveStatus === 'success' && (
                                <Alert variant="default" className="bg-green-50 border-green-200">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800">Settings Saved Successfully!</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        Your Google Sheets configuration has been updated.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {saveStatus === 'error' && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error Saving</AlertTitle>
                                    <AlertDescription>{errorMessage}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="master-sheet-id">Master Sheet ID</Label>
                                <Input
                                    id="master-sheet-id"
                                    placeholder="Enter the ID of your main Google Sheet"
                                    value={masterSheetId}
                                    onChange={(e) => setMasterSheetId(e.target.value)}
                                />
                                <p className="text-sm text-muted-foreground">
                                    The ID is the long string in the sheet's URL: `.../spreadsheets/d/`**`SHEET_ID`**`/edit`
                                </p>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="google-creds">Google API Credentials (JSON)</Label>
                                <Textarea
                                    id="google-creds"
                                    placeholder="Paste the entire content of your service account's JSON credentials file here."
                                    value={googleCreds}
                                    onChange={(e) => setGoogleCreds(e.target.value)}
                                    rows={10}
                                    className="font-mono text-xs"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Ensure you have enabled the Google Sheets API and Google Drive API for your service account.
                                </p>
                            </div>
                            <Button onClick={handleSave}>Save Settings</Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
