'use server';

import { z } from 'zod';
import { google } from 'googleapis';
import { getUser } from './api/users/user-actions';

const baseSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  mobile: z.string().length(10, 'Mobile number must be 10 digits.'),
  address: z.string().min(10, 'Address must be at least 10 characters.'),
  documentPhotoFront: z.string().min(1, 'Front document photo is required.'),
  documentPhotoBack: z.string().min(1, 'Back document photo is required.'),
});

const formSchema = z.discriminatedUnion('voterType', [
  baseSchema.extend({
    voterType: z.literal('Existing Voter'),
    rspNo: z.string().min(1, 'RSP No is required.'),
  }),
  baseSchema.extend({
    voterType: z.literal('Other State Voter'),
    rspNo: z.string().min(1, 'RSP No is required.'),
  }),
  baseSchema.extend({
    voterType: z.literal('No Voter 18+'),
    rspNo: z.string().optional(), // Not present for this type
  }),
  baseSchema.extend({
    voterType: z.literal('Voter Issue'),
    reason: z.string().min(5, 'Reason must be at least 5 characters.'),
    rspNo: z.string().optional(), // Not present for this type
  }),
]);


type FormState = {
  message: string;
  status: 'success' | 'error';
};

async function getGoogleSheetsClient(creds: string) {
    const credentials = JSON.parse(creds);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file'
        ],
    });
    return google.sheets({ version: 'v4', auth });
}


export async function submitForm(
  data: any,
  sheetId: string | null,
  googleCreds: string | null,
  userAadhaar: string | null,
  location: { latitude: number, longitude: number } | null
): Promise<FormState> {
  const validatedFields = formSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Invalid data provided. Please check all fields.',
      status: 'error',
    };
  }
  
  const formData = validatedFields.data;
  
  let finalAddress = formData.address;
  if (location) {
    finalAddress += ` (Location: ${location.latitude}, ${location.longitude})`;
  }

  let submitterName = '';
  if(userAadhaar) {
    const user = await getUser(userAadhaar);
    if (user) {
        submitterName = user.name;
    }
  }


  console.log('--- New Form Submission ---');
  console.log('Voter Type:', formData.voterType);
  console.log('Full Name:', formData.fullName);
  console.log('Mobile:', formData.mobile);
  console.log('Address:', finalAddress);
  if ('rspNo' in formData && formData.rspNo) {
      console.log('RSP No:', formData.rspNo);
  }
  if ('reason' in formData && formData.reason) {
      console.log('Reason:', formData.reason);
  }
  console.log('Front Photo captured:', !!formData.documentPhotoFront);
  console.log('Back Photo captured:', !!formData.documentPhotoBack);
  console.log('Submitted by Aadhaar:', userAadhaar);
  console.log('Submitted by Name:', submitterName);
  console.log('---------------------------');
  
  if (sheetId && googleCreds) {
    try {
        const sheets = await getGoogleSheetsClient(googleCreds);
        const range = 'A1';
        
        const values = [[
            new Date().toISOString(),
            formData.voterType,
            formData.fullName,
            formData.mobile,
            finalAddress,
            'rspNo' in formData ? formData.rspNo : '',
            'reason' in formData ? formData.reason : '',
            userAadhaar,
            submitterName,
            formData.documentPhotoFront ? 'Yes' : 'No',
            formData.documentPhotoBack ? 'Yes' : 'No',
        ]];

        const headerRow = ['Timestamp', 'Voter Type', 'Full Name', 'Mobile', 'Address', 'RSP No', 'Reason/Problem', 'Submitted By Aadhaar', 'Submitted By Name', 'Front Photo?', 'Back Photo?'];

        // Check if header exists
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'A1:K1',
        });

        if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: 'A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [headerRow],
                },
            });
        }
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });
    } catch(e: any) {
        console.error("Error writing to google sheet: ", e);
        return { message: `Failed to save to Google Sheet: ${e.message}`, status: 'error' };
    }
  } else {
     return {
        message: 'Sheet is not configured. Please contact the owner.',
        status: 'error',
    };
  }


  return {
    message: `Data for ${formData.fullName} submitted successfully!`,
    status: 'success',
  };
}

type SheetActionState = {
    message: string;
    status: 'success' | 'error';
    sheetId?: string;
};

export async function createSheetForUser(userName: string, userEmail: string, masterSheetId: string, googleCreds: string): Promise<SheetActionState> {
    // This function is no longer needed as we are using a single sheet.
    // We can keep it here but it won't be called from the UI.
    return {
        status: 'success',
        message: 'This feature is disabled.',
    };
}
