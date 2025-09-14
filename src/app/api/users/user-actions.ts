'use server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'users.json');

async function readUsers() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, start with an empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureDataDirectory();
      await writeUsers([]);
      return [];
    }
    console.error("Error reading users file:", error);
    throw new Error("Could not read user data.");
  }
}

async function writeUsers(data: any) {
  await ensureDataDirectory();
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
    } catch(e) {
        console.error("Could not create data directory", e);
    }
}

export async function getUsers() {
  return await readUsers();
}

export async function getUser(aadhaar: string) {
    const users = await readUsers();
    return users.find((u: any) => u.aadhaar === aadhaar) || null;
}

export async function addUser(newUser: any) {
  const users = await readUsers();
  const newUserWithDefaults = {
    id: users.length > 0 ? Math.max(...users.map((u: any) => u.id)) + 1 : 1,
    ...newUser,
    avatar: newUser.name.split(' ').map((n: string) => n[0]).join(''),
    sheet: null, // Sheet is no longer assigned per user
    status: 'Inactive',
    submissions: 0,
  };
  users.push(newUserWithDefaults);
  await writeUsers(users);
  return newUserWithDefaults;
}

export async function updateUser(userId: number, updatedData: any) {
  const users = await readUsers();
  const userIndex = users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  users[userIndex] = { ...users[userIndex], ...updatedData };
  await writeUsers(users);
  return users[userIndex];
}

export async function deleteUser(userId: number) {
    const users = await readUsers();
    const userIndex = users.findIndex((u: any) => u.id === userId);
    if (userIndex === -1) {
        throw new Error('User not found');
    }
    users[userIndex].status = 'Deleted';
    await writeUsers(users);
    return users[userIndex];
}

export async function updateUserStatus(aadhaar: string, status: 'Active' | 'Inactive') {
    const users = await readUsers();
    const userIndex = users.findIndex((u: any) => u.aadhaar === aadhaar);
    if (userIndex > -1) {
        if (users[userIndex].status !== status) {
            users[userIndex].status = status;
            await writeUsers(users);
        }
    }
    return users[userIndex] || null;
}

export async function updateUserSubmissions(aadhaar: string) {
    const users = await readUsers();
    const userIndex = users.findIndex((u: any) => u.aadhaar === aadhaar);
    if (userIndex > -1) {
        users[userIndex].submissions = (users[userIndex].submissions || 0) + 1;
        await writeUsers(users);
    }
    return users[userIndex] || null;
}

export async function updateUserSheet(userId: number, sheet: any) {
    // This function is no longer needed as we are using a single sheet.
    // Kept to avoid breaking imports, but it does nothing.
    const users = await readUsers();
    const user = users.find((u: any) => u.id === userId);
    return user || null;
}

export async function loginPartner(aadhaar: string, password: string) {
    const users = await readUsers();
    const user = users.find((u: any) => u.aadhaar === aadhaar && u.password === password);
    if (user) {
        if (user.status === 'Deleted') {
            return { success: false, message: 'Your account has been deleted. Please contact the owner.' };
        }
        return { success: true, user };
    }
    return { success: false, message: 'Invalid Aadhaar or password.' };
}

export async function loginOwner(ownerId: string, ownerPassword: string) {
     if (ownerId === 'owner42467' && ownerPassword === 'shailesh42467') {
         return { success: true };
     }
     return { success: false, message: 'Invalid ID or password.' };
}
