'use server';

import { z } from 'zod';
import { google } from 'googleapis';
import { getUser, updateUserSubmissions } from './api/users/user-actions';
import { getSettings } from './owner-dashboard/manage-sheets/actions';


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
  userAadhaar: string | null,
  location: { latitude: number, longitude: number } | null,
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

  const { masterSheetId, googleCreds } = await getSettings();

  if (!masterSheetId || !googleCreds) {
     console.error('Sheet not configured. Sheet ID:', masterSheetId, 'Creds exist:', !!googleCreds);
     return {
        message: 'Sheet is not configured. Please check your settings on the Manage Sheets page.',
        status: 'error',
    };
  }
  
  try {
      const sheets = await getGoogleSheetsClient(googleCreds);
      const range = 'Sheet1!A1';
      
      const values = [[
          new Date().toISOString(),
          formData.voterType,
          formData.fullName,
          formData.mobile,
          finalAddress,
          'rspNo' in formData ? formData.rspNo || '' : '',
          'reason' in formData ? formData.reason || '' : '',
          userAadhaar || '',
          submitterName || '',
          formData.documentPhotoFront ? 'Yes' : 'No',
          formData.documentPhotoBack ? 'Yes' : 'No',
      ]];

      const headerRow = ['Timestamp', 'Voter Type', 'Full Name', 'Mobile', 'Address', 'RSP No', 'Reason/Problem', 'Submitted By Aadhaar', 'Submitted By Name', 'Front Photo?', 'Back Photo?'];

      // Check if header exists
      const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: masterSheetId,
          range: 'Sheet1!A1:K1',
      });

      if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
          await sheets.spreadsheets.values.update({
              spreadsheetId: masterSheetId,
              range: 'Sheet1!A1',
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                  values: [headerRow],
              },
          });
      }
      
      await sheets.spreadsheets.values.append({
          spreadsheetId: masterSheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
              values,
          },
      });

      if (userAadhaar) {
        await updateUserSubmissions(userAadhaar);
      }

  } catch(e: any) {
      console.error("Error writing to google sheet: ", e);
       if (e.message && (e.message.toLowerCase().includes('permission') || e.code === 401 || e.code === 403)) {
          return { message: `Failed to save to Google Sheet: Permission Denied (Code: ${e.code}). Please ensure: 1. The Google Sheet is shared with the service account email (client_email in your JSON) as 'Editor'. 2. The Google Sheets & Drive APIs are enabled in your Cloud project.`, status: 'error' };
      }
      return { message: `Failed to save to Google Sheet: ${e.message}`, status: 'error' };
  }


  return {
    message: `Data for ${formData.fullName} submitted successfully!`,
    status: 'success',
  };
}
