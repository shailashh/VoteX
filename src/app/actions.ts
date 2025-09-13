'use server';

import { z } from 'zod';

const formSchema = z.object({
  user: z.string().min(1, 'User selection is required.'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  age: z.coerce.number().min(1, 'Age is required.'),
  address: z.string().min(10, 'Address must be at least 10 characters.'),
  photo: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

type FormState = {
  message: string;
  status: 'success' | 'error';
};

export async function submitForm(
  data: z.infer<typeof formSchema>
): Promise<FormState> {
  const validatedFields = formSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Invalid data provided.',
      status: 'error',
    };
  }

  console.log('--- New Form Submission ---');
  console.log('User:', validatedFields.data.user);
  console.log('Full Name:', validatedFields.data.fullName);
  console.log('Age:', validatedFields.data.age);
  console.log('Address:', validatedFields.data.address);
  console.log(
    'Photo captured:',
    validatedFields.data.photo ? 'Yes' : 'No'
  );
  console.log('Location:', validatedFields.data.location);
  console.log('---------------------------');
  
  await new Promise(resolve => setTimeout(resolve, 1500)); 

  return {
    message: `Data for ${validatedFields.data.fullName} submitted successfully!`,
    status: 'success',
  };
}
