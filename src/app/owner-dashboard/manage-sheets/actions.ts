'use server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'settings.json');

type Settings = {
  masterSheetId: string | null;
  googleCreds: string | null;
  driveFolderId: string | null;
};

async function readSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    const parsedData = JSON.parse(data);
    // Ensure all keys exist to prevent undefined errors
    return {
      masterSheetId: parsedData.masterSheetId || null,
      googleCreds: parsedData.googleCreds || null,
      driveFolderId: parsedData.driveFolderId || null
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureDataDirectory();
      const defaultSettings = { masterSheetId: null, googleCreds: null, driveFolderId: null };
      await writeSettings(defaultSettings);
      return defaultSettings;
    }
    console.error("Error reading settings file:", error);
    throw new Error("Could not read settings data.");
  }
}

async function writeSettings(data: Settings) {
  await ensureDataDirectory();
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function ensureDataDirectory() {
    try {
        await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
    } catch(e) {
        console.error("Could not create data directory", e);
    }
}

export async function getSettings(): Promise<Settings> {
  return await readSettings();
}

export async function saveSettings(newSettings: Settings): Promise<{ success: boolean; error?: string }> {
    try {
        await writeSettings(newSettings);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to save settings:", error);
        return { success: false, error: error.message };
    }
}
