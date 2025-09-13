'use server';

import { z } from 'zod';
import { google } from 'googleapis';

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

  console.log('--- New Form Submission ---');
  console.log('Voter Type:', formData.voterType);
  console.log('Full Name:', formData.fullName);
  console.log('Mobile:', formData.mobile);
  console.log('Address:', formData.address);
  if ('rspNo' in formData && formData.rspNo) {
      console.log('RSP No:', formData.rspNo);
  }
  if ('reason' in formData && formData.reason) {
      console.log('Reason:', formData.reason);
  }
  console.log('Front Photo captured:', !!formData.documentPhotoFront);
  console.log('Back Photo captured:', !!formData.documentPhotoBack);
  console.log('Location:', location);
  console.log('Submitted by:', userAadhaar);
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
            formData.address,
            'rspNo' in formData ? formData.rspNo : '',
            'reason' in formData ? formData.reason : '',
            `${location?.latitude}, ${location?.longitude}`,
            userAadhaar,
            formData.documentPhotoFront ? 'Yes' : 'No',
            formData.documentPhotoBack ? 'Yes' : 'No',
        ]];

        const headerRow = ['Timestamp', 'Voter Type', 'Full Name', 'Mobile', 'Address', 'RSP No', 'Reason/Problem', 'Location', 'Submitted By', 'Front Photo?', 'Back Photo?'];

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
     await new Promise(resolve => setTimeout(resolve, 1500)); 
     console.log("Submission successful (local simulation). No Sheet ID or creds provided.");
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
    try {
        const sheets = await getGoogleSheetsClient(googleCreds);
        const newSheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: `User_Data_${userName.replace(/\s/g, '_')}_${Date.now()}`
                }
            }
        });

        const newSheetId = newSheet.data.spreadsheetId;
        if (!newSheetId) {
            throw new Error("Failed to create new sheet.");
        }

        // Grant writer access to the user
        const drive = google.drive({ version: 'v3', auth: (sheets.auth as any) });
        await drive.permissions.create({
            fileId: newSheetId,
            requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: userEmail,
            }
        });

        if (!masterSheetId) {
            throw new Error("Master Sheet ID is not configured.");
        }
        
        // Log it in the master sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: masterSheetId,
            range: 'A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    new Date().toISOString(),
                    userName,
                    userEmail,
                    newSheet.data.spreadsheetUrl
                ]]
            }
        });
        
        return {
            status: 'success',
            message: 'Sheet created and linked.',
            sheetId: newSheetId,
        };

    } catch (e: any) {
        console.error("Error creating sheet:", e);
        return { status: 'error', message: `Failed to create/share sheet: ${e.message}` };
    }
}
