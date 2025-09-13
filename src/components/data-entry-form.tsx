'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, ArrowRight, Send, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitForm } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CameraCapture } from '@/components/camera-capture';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// Mock user data
const users = [
  { id: 'user-1', name: 'Alice' },
  { id: 'user-2', name: 'Bob' },
  { id: 'user-3', name: 'Charlie' },
];

const formSchema = z.object({
  user: z.string().min(1, 'Please select a user.'),
  fullName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  age: z.coerce.number().min(18, { message: 'You must be at least 18.' }).max(120),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
  photo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 'Step 1', title: 'User Selection', fields: ['user'] },
  { id: 'Step 2', title: 'Personal Information', fields: ['fullName', 'age'] },
  { id: 'Step 3', title: 'Address', fields: ['address'] },
  { id: 'Step 4', title: 'Live Photo', fields: ['photo'] },
];

export default function DataEntryForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user: '',
      fullName: '',
      age: undefined,
      address: '',
      photo: '',
    },
    mode: "onTouched"
  });

  type FieldName = keyof FormData;

  const next = async () => {
    const fields = steps[currentStep].fields as FieldName[];
    const output = await form.trigger(fields, { shouldFocus: true });

    if (!output) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(step => step + 1);
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(step => step - 1);
    }
  };

  const processForm = async (data: FormData) => {
    setIsSubmitting(true);
    setLocationError(null);

    try {
      const location = await new Promise<{ latitude: number, longitude: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error("Geolocation is not supported by your browser."));
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
          (error) => reject(error)
        );
      });

      const result = await submitForm({ ...data, location });
      
      if (result.status === 'success') {
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
        let errorMessage = "An unknown error occurred while capturing location.";
        if (error.code === 1) { // PERMISSION_DENIED
            errorMessage = "Please allow location access to submit the form.";
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        setLocationError(errorMessage);
        toast({
            title: 'Location Error',
            description: errorMessage,
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const progressValue = ((currentStep + 1) / (steps.length)) * 100;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>Step {currentStep + 1} of {steps.length}</CardDescription>
          </div>
        </div>
        <Progress value={progressValue} className="mt-4" />
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(processForm)}>
          <CardContent className="min-h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 0 && (
                  <FormField
                    control={form.control}
                    name="user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select User</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select the user for this entry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.name}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl><Input type="number" placeholder="25" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                {currentStep === 2 && (
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Address</FormLabel>
                        <FormControl><Textarea placeholder="123 Main St, Anytown, USA" {...field} rows={4} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {currentStep === 3 && (
                   <FormField
                    control={form.control}
                    name="photo"
                    render={({ field }) => (
                      <FormItem>
                         <FormLabel>Live Photo</FormLabel>
                        <FormControl>
                            <CameraCapture 
                                onCapture={(dataUrl) => field.onChange(dataUrl)}
                                photo={field.value || null}
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </motion.div>
            </AnimatePresence>
            {locationError && currentStep === steps.length -1 && (
                 <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Submission Blocked</AlertTitle>
                    <AlertDescription>{locationError}</AlertDescription>
                </Alert>
            )}
          </CardContent>

          <CardFooter className="justify-between">
            <Button type="button" variant="outline" onClick={prev} disabled={currentStep === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={next}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
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
  );
}
