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
import { getSettings, saveSettings } from './actions';
import { FullPageLoader } from '@/components/ui/loading-spinner';

function extractFolderIdFromUrl(url: string | undefined | null): string {
    if (!url) {
        return '';
    }
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return url; // Assume it's an ID if no match
}

export default function ManageSheetsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [googleCreds, setGoogleCreds] = useState('');
    const [masterSheetId, setMasterSheetId] = useState('');
    const [driveFolderId, setDriveFolderId] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const settings = await getSettings();
            setGoogleCreds(settings.googleCreds || '');
            setMasterSheetId(settings.masterSheetId || '');
            setDriveFolderId(settings.driveFolderId || '');
        } catch (error) {
            console.error("Failed to load settings:", error);
            toast({
                title: "Error",
                description: "Could not load saved settings.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'owner') {
            router.push('/');
        } else {
            setIsAuthorized(true);
            loadSettings();
        }
    }, [router, loadSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        setErrorMessage('');
        
        const trimmedSheetId = masterSheetId.trim();
        if (!trimmedSheetId) {
            setErrorMessage('Master Sheet ID is required.');
            setSaveStatus('error');
            setIsSaving(false);
            return;
        }

        const trimmedFolderId = extractFolderIdFromUrl(driveFolderId.trim());
        if (!trimmedFolderId) {
            setErrorMessage('Google Drive Folder ID is required.');
            setSaveStatus('error');
            setIsSaving(false);
            return;
        }

        let trimmedCreds = googleCreds.trim();
        if (!trimmedCreds) {
            setErrorMessage('Google API Credentials are required.');
            setSaveStatus('error');
            setIsSaving(false);
            return;
        }

        try {
            JSON.parse(trimmedCreds);
        } catch (error) {
            setErrorMessage('Invalid JSON format in Google API Credentials. Please paste the full, unmodified JSON content.');
            setSaveStatus('error');
            setIsSaving(false);
            return;
        }

        try {
            const result = await saveSettings({ 
                masterSheetId: trimmedSheetId, 
                googleCreds: trimmedCreds,
                driveFolderId: trimmedFolderId
            });
            if (result.success) {
                toast({
                    title: 'Settings Saved',
                    description: 'Your configuration has been permanently saved.',
                });
                setSaveStatus('success');
                setDriveFolderId(trimmedFolderId); // Show the extracted ID in the input
            } else {
                setErrorMessage(result.error || "An unknown error occurred.");
                setSaveStatus('error');
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'An unexpected error occurred while saving.');
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isAuthorized || isLoading) {
        return <FullPageLoader />;
    }

    return (
        <>
            <Header />
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Google Integration</CardTitle>
                            <CardDescription>
                                Securely store your Google API credentials, Sheet ID, and Drive Folder ID.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           {saveStatus === 'success' && (
                                <Alert variant="default" className="bg-green-50 border-green-200">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800">Settings Saved Successfully!</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        Your configuration has been updated.
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
                                    placeholder="Enter the ID or full URL of your main Google Sheet"
                                    value={masterSheetId}
                                    onChange={(e) => setMasterSheetId(e.target.value)}
                                    disabled={isSaving}
                                />
                                <p className="text-sm text-muted-foreground">
                                    You can paste the full URL or just the ID.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="drive-folder-id">Google Drive Folder ID</Label>
                                <Input
                                    id="drive-folder-id"
                                    placeholder="Enter the ID or full URL of your Google Drive folder"
                                    value={driveFolderId}
                                    onChange={(e) => setDriveFolderId(e.target.value)}
                                    disabled={isSaving}
                                />
                                <p className="text-sm text-muted-foreground">
                                    You can paste the full URL or just the folder's ID from the URL.
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
                                    disabled={isSaving}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Ensure the Google Sheets & Drive APIs are enabled and the folder/sheet is shared with the service account email as 'Editor'.
                                </p>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
