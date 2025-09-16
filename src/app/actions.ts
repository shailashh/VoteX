'use server';

import { z } from 'zod';
import { google } from 'googleapis';
import { getUser, updateUserSubmissions } from './api/users/user-actions';
import { getSettings } from './owner-dashboard/manage-sheets/actions';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

async function getGoogleAuth(creds: string) {
    const credentials = JSON.parse(creds);
    return new google.auth.GoogleAuth({
        credentials,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });
}

function extractSheetIdFromUrl(url: string | undefined | null): string {
    if (!url) {
        return '';
    }
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return url; // Assume it's an ID if no match
}


export async function submitForm(
  data: any,
  userAadhaar: string | null,
  location: { latitude: number, longitude: number } | null,
): Promise<FormState> {
  const validatedFields = formSchema.safeParse(data);

  if (!validatedFields.success) {
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
     return {
        message: 'Master Sheet ID or Google Credentials are not configured. Please check your settings on the Manage Sheets page.',
        status: 'error',
    };
  }
  
  const spreadsheetId = extractSheetIdFromUrl(masterSheetId);
  
  try {
      const auth = await getGoogleAuth(googleCreds);
      const sheets = google.sheets({ version: 'v4', auth });
      const now = new Date();
      const timeZone = 'Asia/Kolkata';
      const zonedDate = toZonedTime(now, timeZone);
      const formattedTimestamp = format(zonedDate, 'dd/MM/yyyy HH:mm:ss');
      
      const values = [[
          formattedTimestamp,
          formData.voterType,
          formData.fullName,
          formData.mobile,
          finalAddress,
          'rspNo' in formData ? formData.rspNo || '' : '',
          'reason' in formData ? formData.reason || '' : '',
          userAadhaar || '',
          submitterName || '',
          formData.documentPhotoFront, // Save Base64 data directly
          formData.documentPhotoBack, // Save Base64 data directly
      ]];

      const headerRow = ['Timestamp', 'Voter Type', 'Full Name', 'Mobile', 'Address', 'RSP No', 'Reason/Problem', 'Submitted By Aadhaar', 'Submitted By Name', 'Front Photo', 'Back Photo'];
      const sheetName = 'Sheet1';
      try {
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:L1`,
        });

        if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [headerRow],
                },
            });
        }
        
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });
      } catch (sheetError: any) {
          if (sheetError.code === 403) {
              return { message: `Google Sheets Error: Permission Denied (Code: 403). Please ensure your Google Sheet is shared with the service account email ('client_email' from your JSON) as 'Editor'.`, status: 'error' };
          }
          if (sheetError.code === 404) {
               return { message: `Google Sheets Error: Sheet Not Found (Code: 404). The Master Sheet ID in your settings is incorrect. Please verify it.`, status: 'error'};
          }
          return { message: `Failed to save to Google Sheet: ${sheetError.message}`, status: 'error' };
      }

      if (userAadhaar) {
        await updateUserSubmissions(userAadhaar);
      }

  } catch(e: any) {
       return { message: `An unexpected error occurred: ${e.message}`, status: 'error' };
  }

  return {
    message: `Data for ${formData.fullName} submitted successfully!`,
    status: 'success',
  };
}
