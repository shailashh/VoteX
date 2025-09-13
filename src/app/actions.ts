'use server';

import { z } from 'zod';
import { google } from 'googleapis';

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
  sheetId: z.string().optional(),
  googleCreds: z.string().optional(),
});

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
  
  const { sheetId, googleCreds, ...formData } = validatedFields.data;

  console.log('--- New Form Submission ---');
  console.log('User:', formData.user);
  console.log('Full Name:', formData.fullName);
  console.log('Age:', formData.age);
  console.log('Address:', formData.address);
  console.log(
    'Photo captured:',
    formData.photo ? 'Yes' : 'No'
  );
  console.log('Location:', formData.location);
  console.log('---------------------------');
  
  if (sheetId && googleCreds) {
    try {
        const sheets = await getGoogleSheetsClient(googleCreds);
        const range = 'A1';
        
        const values = [[
            new Date().toISOString(),
            formData.fullName,
            formData.age,
            formData.address,
            `${formData.location?.latitude}, ${formData.location?.longitude}`,
            formData.user,
            formData.photo ? 'Yes' : 'No'
        ]];

        // Check if header exists
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'A1:G1',
        });

        if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: 'A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [['Timestamp', 'Full Name', 'Age', 'Address', 'Location', 'Submitted By', 'Photo Captured?']],
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
  }


  return {
    message: `Data for ${validatedFields.data.fullName} submitted successfully!`,
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
