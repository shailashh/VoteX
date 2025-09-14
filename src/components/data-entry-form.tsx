'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, AlertTriangle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitForm } from '@/app/actions';
import { updateUserStatus, updateUserSubmissions } from '@/app/api/users/user-actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CameraCapture } from '@/components/camera-capture';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLocation, type Location } from '@/hooks/use-location';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const baseSchema = z.object({
  fullName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  mobile: z.string().length(10, { message: 'Mobile number must be 10 digits.' }),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
  documentPhotoFront: z.string().min(1, { message: 'Front document photo is required.' }),
  documentPhotoBack: z.string().min(1, { message: 'Back document photo is required.' }),
});

const formSchema = z.discriminatedUnion('voterType', [
  baseSchema.extend({
    voterType: z.literal('Existing Voter'),
    rspNo: z.string().min(1, { message: 'RSP No is required.' }),
  }),
  baseSchema.extend({
    voterType: z.literal('Other State Voter'),
    rspNo: z.string().min(1, { message: 'RSP No is required.' }),
  }),
  baseSchema.extend({
    voterType: z.literal('No Voter 18+'),
    rspNo: z.string().optional(),
  }),
  baseSchema.extend({
    voterType: z.literal('Voter Issue'),
    reason: z.string().min(5, { message: 'Reason must be at least 5 characters.' }),
    rspNo: z.string().optional(),
  }),
]);


type FormData = z.infer<typeof formSchema>;

export default function DataEntryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { location, error: locationError, startTracking, stopTracking } = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [googleCreds, setGoogleCreds] = useState<string | null>(null);
  const [masterSheetId, setMasterSheetId] = useState<string | null>(null);

  const form = useForm<any>({ // Using `any` due to complexity of discriminated union with react-hook-form
    resolver: zodResolver(formSchema),
    defaultValues: {
      voterType: 'Existing Voter',
      fullName: '',
      mobile: '',
      address: '',
      rspNo: '',
      reason: '',
      documentPhotoFront: '',
      documentPhotoBack: '',
    },
    mode: "onTouched"
  });

  const voterType = useWatch({ control: form.control, name: 'voterType' });

  const handleUpdateUserStatus = async (status: 'Active' | 'Inactive') => {
    const loggedInUserAadhaar = localStorage.getItem('loggedInUser');
    if (!loggedInUserAadhaar) return;
    try {
      await updateUserStatus(loggedInUserAadhaar, status);
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };
  
  useEffect(() => {
    startTracking();
     // Load credentials from localStorage when component mounts
    setGoogleCreds(localStorage.getItem('googleApiCredentials'));
    setMasterSheetId(localStorage.getItem('masterSheetId'));
    return () => stopTracking();
  }, [startTracking, stopTracking]);


  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if(typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (locationError) {
      handleUpdateUserStatus('Inactive');
      toast({ title: 'Location Error', description: locationError, variant: 'destructive' });
    } else if (!isOnline) {
      handleUpdateUserStatus('Inactive');
      toast({ title: 'Network Error', description: 'You are offline. Please check your internet connection.', variant: 'destructive' });
    } else {
      handleUpdateUserStatus('Active');
    }
  }, [locationError, isOnline, toast]);


  const processForm = async (data: FormData) => {
    setIsSubmitting(true);
    
    if (!location) {
        toast({
            title: 'Location Error',
            description: locationError || "Could not get your location. Please ensure location services are enabled.",
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }

    try {
      const loggedInUserAadhaar = localStorage.getItem('loggedInUser');
      const storedCreds = localStorage.getItem('googleApiCredentials');
      const storedSheetId = localStorage.getItem('masterSheetId');
      
      if (!storedSheetId || !storedCreds) {
        toast({ title: 'Error', description: "Sheet is not configured. Please contact the owner.", variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const result = await submitForm(data, storedSheetId, storedCreds, loggedInUserAadhaar, location); 
      
      if (result.status === 'success') {
        if (loggedInUserAadhaar) {
          await updateUserSubmissions(loggedInUserAadhaar);
        }
        
        toast({ title: 'Success!', description: result.message });
        form.reset();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (error: any) {
        toast({ title: 'Submission Error', description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const renderConditionalFields = () => {
    return (
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Enter legal name as per document
              </FormLabel>
              <FormControl><Input placeholder="Enter full name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile No</FormLabel>
              <FormControl><Input placeholder="Enter 10-digit mobile number" {...field} maxLength={10} type="tel" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {voterType === 'Voter Issue' && (
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason/Problem</FormLabel>
                <FormControl><Textarea placeholder="Describe the issue" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl><Textarea placeholder="Enter full address" {...field} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {(voterType === 'Existing Voter' || voterType === 'Other State Voter') && (
          <FormField
            control={form.control}
            name="rspNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RSP No</FormLabel>
                <FormControl><Input placeholder="Enter RSP No." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="space-y-8">
            <FormField
              control={form.control}
              name="documentPhotoFront"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CameraCapture
                      title="Document Photo Front"
                      onCapture={(dataUrl) => field.onChange(dataUrl)}
                      photo={field.value || null}
                    />
                  </FormControl>
                  <FormMessage className="text-center" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documentPhotoBack"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CameraCapture
                      title="Document Photo Back"
                      onCapture={(dataUrl) => field.onChange(dataUrl)}
                      photo={field.value || null}
                    />
                  </FormControl>
                  <FormMessage className="text-center" />
                </FormItem>
              )}
            />
        </div>
      </div>
    );
  };

  return (
      <Card className="w-full shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processForm)}>
            <CardHeader>
                <CardTitle>Data Entry</CardTitle>
                <CardDescription>Select the type of voter and fill in the details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="voterType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voter Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a voter type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Existing Voter">Existing Voter</SelectItem>
                        <SelectItem value="Other State Voter">Other State Voter</SelectItem>
                        <SelectItem value="No Voter 18+">No Voter 18+</SelectItem>
                        <SelectItem value="Voter Issue">Voter Issue (if any)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {voterType && renderConditionalFields()}

              {(locationError || !isOnline) && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Cannot Submit</AlertTitle>
                  <AlertDescription>{locationError || "You are offline. Please check your connection."}</AlertDescription>
                </Alert>
              )}

            </CardContent>

            <CardFooter className="justify-end border-t pt-4">
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid || !location || !isOnline}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
