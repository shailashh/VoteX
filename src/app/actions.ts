'use server';

import { z } from 'zod';
import { google } from 'googleapis';
import { getUser, updateUserSubmissions } from './api/users/user-actions';
import { getSettings } from './owner-dashboard/manage-sheets/actions';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Readable } from 'stream';

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
            'https://www.googleapis.com/auth/drive.file'
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

function extractDriveFolderIdFromUrl(url: string | undefined | null): string {
    if (!url) {
        return '';
    }
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return url;
}

async function uploadPhotoToDrive(drive: any, photoDataUrl: string, fileName: string, folderId: string): Promise<string> {
    const mimeType = photoDataUrl.split(';')[0].split(':')[1];
    const base64Data = photoDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
        name: fileName,
        parents: [folderId],
    };
    const media = {
        mimeType: mimeType,
        body: stream,
    };
    
    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    if (!file.data.webViewLink) {
        throw new Error('Could not get a shareable link for the uploaded file. Please check folder sharing settings.');
    }
    
    return file.data.webViewLink;
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

  const { masterSheetId, googleCreds, driveFolderId } = await getSettings();

  if (!masterSheetId || !googleCreds || !driveFolderId) {
     return {
        message: 'Master Sheet ID, Google Credentials, or Drive Folder ID are not configured. Please check your settings on the Manage Sheets page.',
        status: 'error',
    };
  }
  
  const spreadsheetId = extractSheetIdFromUrl(masterSheetId);
  const finalDriveFolderId = extractDriveFolderIdFromUrl(driveFolderId);

  let frontPhotoLink = '';
  let backPhotoLink = '';

  try {
      const auth = await getGoogleAuth(googleCreds);
      const drive = google.drive({ version: 'v3', auth });
      const now = new Date();
      const timeZone = 'Asia/Kolkata';
      const zonedDate = toZonedTime(now, timeZone);
      const fileTimestamp = format(zonedDate, 'yyyy-MM-dd_HH-mm-ss');

      try {
          frontPhotoLink = await uploadPhotoToDrive(drive, formData.documentPhotoFront, `${formData.fullName.replace(/\s+/g, '_')}_front_${fileTimestamp}.jpg`, finalDriveFolderId);
          backPhotoLink = await uploadPhotoToDrive(drive, formData.documentPhotoBack, `${formData.fullName.replace(/\s+/g, '_')}_back_${fileTimestamp}.jpg`, finalDriveFolderId);
      } catch (driveError: any) {
           if (driveError.code === 403) {
              return { message: `Google Drive Error: Permission Denied (Code: 403). Please ensure: 1. The Google Drive folder is shared with the service account email as 'Editor'. 2. The folder's general access is 'Anyone with the link'. 3. The Google Drive API is enabled in your Cloud project.`, status: 'error' };
          }
          if (driveError.code === 404) {
              return { message: `Google Drive Error: Folder Not Found (Code: 404). The 'Google Drive Folder ID' in your settings is incorrect. Please verify it.`, status: 'error' };
          }
          return { message: `Failed to upload photos to Google Drive: ${driveError.message}`, status: 'error' };
      }
      
      const sheets = google.sheets({ version: 'v4', auth });
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
          frontPhotoLink,
          backPhotoLink,
      ]];

      const headerRow = ['Timestamp', 'Voter Type', 'Full Name', 'Mobile', 'Address', 'RSP No', 'Reason/Problem', 'Submitted By Aadhaar', 'Submitted By Name', 'Front Photo Link', 'Back Photo Link'];
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
