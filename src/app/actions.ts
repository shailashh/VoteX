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


async function getDriveFolderId(drive: any, folderName: string): Promise<string> {
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id, name)',
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    } else {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        if (!folder.data.id) {
            throw new Error("Could not create Google Drive folder. Please ensure the service account has 'Editor' permissions on your Google Drive's root or relevant parent folder.");
        }
        return folder.data.id;
    }
}


async function uploadPhotoToDrive(drive: any, photoDataUrl: string, fileName: string): Promise<string> {
    const folderName = "VoteX Document Photos";
    const folderId = await getDriveFolderId(drive, folderName);

    const mimeType = photoDataUrl.substring(photoDataUrl.indexOf(':') + 1, photoDataUrl.indexOf(';'));
    const base64Data = photoDataUrl.substring(photoDataUrl.indexOf(',') + 1);
    const photoBuffer = Buffer.from(base64Data, 'base64');
    const photoStream = Readable.from(photoBuffer);

    const fileMetadata = {
        name: fileName,
        parents: [folderId],
    };
    const media = {
        mimeType: mimeType,
        body: photoStream,
    };

    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });
    
    // The permission to make files public is often restricted.
    // It's better to share the parent folder "VoteX Document Photos" once.
    // The link in webViewLink will work if the folder is shared with "Anyone with the link".
    if (!file.data.webViewLink) {
        throw new Error("File uploaded to Drive, but could not get a webViewLink.");
    }
    
    return file.data.webViewLink;
}


function extractSheetIdFromUrl(url: string | undefined | null): string {
    if (!url) {
        return '';
    }
    if (url.includes('/spreadsheets/d/')) {
        const parts = url.split('/d/');
        if (parts.length > 1) {
            return parts[1].split('/')[0];
        }
    }
    return url;
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
        message: 'Sheet is not configured. Please check your settings on the Manage Sheets page.',
        status: 'error',
    };
  }
  
  const spreadsheetId = extractSheetIdFromUrl(masterSheetId);

  try {
      const auth = await getGoogleAuth(googleCreds);
      const drive = google.drive({ version: 'v3', auth });
      
      let frontPhotoLink = '';
      let backPhotoLink = '';
      
      try {
        const now = new Date();
        const timeZone = 'Asia/Kolkata';
        const zonedDate = toZonedTime(now, timeZone);
        const fileTimestamp = format(zonedDate, 'yyyyMMdd_HHmmss');
        
        const frontPhotoFileName = `${formData.fullName.replace(/\s+/g, '_')}_${fileTimestamp}_front.jpg`;
        const backPhotoFileName = `${formData.fullName.replace(/\s+/g, '_')}_${fileTimestamp}_back.jpg`;

        [frontPhotoLink, backPhotoLink] = await Promise.all([
            uploadPhotoToDrive(drive, formData.documentPhotoFront, frontPhotoFileName),
            uploadPhotoToDrive(drive, formData.documentPhotoBack, backPhotoFileName)
        ]);
      } catch(driveError: any) {
          if (driveError.code === 403) {
            return { message: `Google Drive Error: Permission Denied (Code: 403). Please ensure: 1. The 'VoteX Document Photos' folder in your Google Drive is shared with the service account email ('client_email' from your JSON) as 'Editor'. 2. The Google Drive API is enabled in your Cloud project.`, status: 'error' };
          }
          return { message: `Failed to upload photo to Google Drive: ${driveError.message}`, status: 'error'};
      }


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
          frontPhotoLink,
          backPhotoLink,
      ]];

      const headerRow = ['Timestamp', 'Voter Type', 'Full Name', 'Mobile', 'Address', 'RSP No', 'Reason/Problem', 'Submitted By Aadhaar', 'Submitted By Name', 'Front Photo Link', 'Back Photo Link'];

      try {
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A1:K1',
        });

        if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [headerRow],
                },
            });
        }
        
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });
      } catch (sheetError: any) {
          if (sheetError.code === 403) {
              return { message: `Google Sheets Error: Permission Denied (Code: 403). Please ensure your Google Sheet is shared with the service account email ('client_email' from your JSON) as 'Editor'.`, status: 'error' };
          }
          if (sheetError.message && sheetError.message.toLowerCase().includes('not found')) {
               return { message: `Google Sheets Error: Sheet Not Found. Please double-check that the "Master Sheet ID" in your settings is correct and you have shared the sheet.`, status: 'error'};
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
