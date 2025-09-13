'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, AlertTriangle, User, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitForm } from '@/app/actions';
import { updateUserStatus, updateUserSubmissions, getUser } from '@/app/api/users/user-actions';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CameraCapture } from '@/components/camera-capture';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { useLocation, type Location } from '@/hooks/use-location';
import { ShieldCheck } from 'lucide-react';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  age: z.coerce.number().min(18, { message: 'You must be at least 18.' }).max(120),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
  photo: z.string().min(1, 'A photo is required.'),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 'Step 1', title: 'Personal Info', fields: ['fullName', 'age', 'address'], icon: User },
  { id: 'Step 2', title: 'Photo & Location', fields: ['photo'], icon: MapPin },
  { id: 'Step 3', title: 'Review & Submit', fields: [], icon: ShieldCheck },
];

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center justify-center">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center text-center w-24">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${
                index <= currentStep ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              {index + 1}
            </div>
            <p className={`mt-2 text-sm ${index <= currentStep ? 'text-primary font-medium' : 'text-gray-500'}`}>{step.title}</p>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-auto border-t-2 mx-4 ${index < currentStep ? 'border-primary' : 'border-gray-300'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function DataEntryForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { location, error: locationError, startTracking, stopTracking, isTracking } = useLocation();
  const [isOnline, setIsOnline] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      age: '' as any,
      address: '',
      photo: '',
    },
    mode: "onTouched"
  });

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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if(typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Start tracking when moving to step 2 or 3, stop if going back to step 1
    if (currentStep >= 1 && !isTracking) {
      startTracking();
    } else if (currentStep === 0 && isTracking) {
      stopTracking();
    }
  }, [currentStep, isTracking, startTracking, stopTracking]);
  
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


  const watchedValues = useWatch({ control: form.control });

  type FieldName = keyof FormData;

  const nextStep = async () => {
    const fields = steps[currentStep].fields as FieldName[];
    const output = await form.trigger(fields, { shouldFocus: true });
    
    if (!output) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(step => step + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(step => step + 1);
    }
  };

  const processForm = async (data: FormData) => {
    setIsSubmitting(true);
    
    if (!location) {
        toast({
            title: 'Location Error',
            description: locationError || "Could not get your location. Please ensure location services are enabled and permissions are granted.",
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }


    try {
      const loggedInUserAadhaar = localStorage.getItem('loggedInUser');
      const googleCreds = localStorage.getItem('googleApiCredentials');

      let sheetId: string | undefined;
      
      if (loggedInUserAadhaar) {
          const currentUser = await getUser(loggedInUserAadhaar);
          if (currentUser && currentUser.sheet) {
              sheetId = currentUser.sheet.id;
          }
      }

      if (!sheetId) {
        toast({ title: 'Error', description: "No sheet assigned to your user account. Contact the owner.", variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }


      const result = await submitForm({ 
        ...data, 
        location, 
        user: loggedInUserAadhaar || 'Unknown User',
        sheetId,
        googleCreds: googleCreds || undefined,
      }); 
      
      if (result.status === 'success') {
        if (loggedInUserAadhaar) {
          await updateUserSubmissions(loggedInUserAadhaar);
        }
        
        toast({
          title: 'Success!',
          description: result.message,
          variant: 'default',
        });
        form.reset();
        setCurrentStep(0);
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
        const errorMessage = error.message || "An unexpected error occurred during submission.";
        toast({
            title: 'Submission Error',
            description: errorMessage,
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <CardTitle className="text-2xl font-bold text-center">Personal Information</CardTitle>
            <CardDescription className="text-center mb-6">Please fill out all required fields to continue</CardDescription>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-muted-foreground" />
                      Enter your legal name as it appears on official documents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age *</FormLabel>
                    <FormControl><Input type="number" placeholder="18" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl><Textarea placeholder="123 Main St, Anytown, USA" {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <CardTitle className="text-2xl font-bold text-center">Photo & Location</CardTitle>
            <CardDescription className="text-center mb-6">Capture a live photo for verification</CardDescription>
             <FormField
              control={form.control}
              name="photo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CameraCapture
                      onCapture={(dataUrl) => field.onChange(dataUrl)}
                      photo={field.value || null}
                    />
                  </FormControl>
                  <FormMessage className="text-center"/>
                </FormItem>
              )}
            />
          </>
        );
      case 2:
        return (
            <>
            <CardTitle className="text-2xl font-bold text-center">Review & Submit</CardTitle>
            <CardDescription className="text-center mb-6">Please review your information before submitting.</CardDescription>
             <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  {watchedValues.photo && (
                      <Image src={watchedValues.photo} alt="Your photo" width={160} height={120} className="rounded-lg object-cover" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Full Name</h3>
                  <p>{watchedValues.fullName}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Age</h3>
                  <p>{watchedValues.age}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Address</h3>
                  <p>{watchedValues.address}</p>
                </div>
                <div>
                    <h3 className="font-semibold">Current Location</h3>
                    {location ? (
                        <p>{`Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`}</p>
                    ) : (
                        <p className="text-muted-foreground">{locationError || "Fetching location..."}</p>
                    )}
                </div>


                 {(locationError || !isOnline) && (
                     <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Cannot Submit</AlertTitle>
                        <AlertDescription>{locationError || "You are offline. Please check your connection."}</AlertDescription>
                    </Alert>
                )}
            </div>
            </>
        )
      default:
        return null;
    }
  };


  return (
    <>
      <Stepper currentStep={currentStep} />
      <Card className="w-full shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processForm)}>
            <CardContent className="pt-6 min-h-[420px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </CardContent>

            <CardFooter className="justify-between border-t pt-4">
              <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0}>
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
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
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
