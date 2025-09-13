'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Grid,
  Search,
  FileEdit,
  ExternalLink,
  Trash2,
  PlusCircle,
  Database,
  Upload,
  FileText,
  UserPlus,
  KeyRound,
  Shield,
  Copy,
  Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createSheetForUser } from '../actions';

const initialUsers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'JD',
    sheet: {
      name: 'User_Data_John_Doe',
      id: '1BxiMVs0XRA5nFMdKvBd...',
    },
    status: 'Active',
    aadhaar: '123456789012',
    password: 'password123',
    submissions: 25,
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    avatar: 'SJ',
    sheet: {
      name: 'User_Data_Sarah_Johnson',
      id: '1BxiMVs0XRA5nFMdKvBd...',
    },
    status: 'Active',
    aadhaar: '234567890123',
    password: 'password456',
    submissions: 12,
  },
  {
    id: 3,
    name: 'Michael Chen',
    email: 'm.chen@example.com',
    avatar: 'MC',
    sheet: null,
    status: 'Inactive',
    aadhaar: '345678901234',
    password: 'password789',
    submissions: 0,
  },
];

// Mock database in localStorage
const getUsersFromStorage = () => {
  if (typeof window === 'undefined') return initialUsers;
  const storedUsers = localStorage.getItem('appUsers');
  if (storedUsers) {
    try {
        const parsedUsers = JSON.parse(storedUsers);
        // Ensure all users have a submissions count
        return parsedUsers.map((u: any) => ({ ...u, submissions: u.submissions || 0 }));
    } catch(e) {
        localStorage.setItem('appUsers', JSON.stringify(initialUsers));
        return initialUsers;
    }
  } else {
    localStorage.setItem('appUsers', JSON.stringify(initialUsers));
    return initialUsers;
  }
};

const saveUsersToStorage = (users: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('appUsers', JSON.stringify(users));
};

export default function OwnerDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState(getUsersFromStorage);
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [newAadhaar, setNewAadhaar] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isCreatingSheet, setIsCreatingSheet] = useState<number | null>(null);


  const handleGeneratePassword = () => {
    const password = Math.random().toString(36).slice(-8);
    setGeneratedPassword(password);
  };
  
  const handleAddUser = () => {
    if (!newAadhaar || newAadhaar.length !== 12 || !/^\d+$/.test(newAadhaar)) {
        toast({ title: "Validation Error", description: "Please enter a valid 12-digit Aadhaar number.", variant: "destructive" });
        return;
    }
    if (!generatedPassword) {
        toast({ title: "Validation Error", description: "Please generate a password for the user.", variant: "destructive" });
        return;
    }

    const name = `User ${users.length + 1}`;
    const email = newUserEmail || `user${users.length + 1}@example.com`;

    const newUser = {
      id: users.length + 1,
      name: name,
      email: email,
      avatar: name.split(' ').map(n => n[0]).join(''),
      sheet: null,
      status: 'Inactive',
      aadhaar: newAadhaar,
      password: generatedPassword,
      submissions: 0,
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);

    toast({ title: "User Added", description: `User with Aadhaar ${newAadhaar} has been created.` });

    setAddUserOpen(false);
    setGeneratedPassword("");
    setNewAadhaar("");
    setNewUserEmail("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Password copied to clipboard." });
  }

  const handleAssignSheet = async (user: any) => {
    setIsCreatingSheet(user.id);
    const googleCreds = localStorage.getItem('googleApiCredentials');
    const masterSheetId = localStorage.getItem('masterSheetId');

    if (!googleCreds || !masterSheetId) {
      toast({
        title: "Configuration Missing",
        description: "Please configure Google Sheets credentials and Master Sheet ID in 'Manage Sheets'.",
        variant: "destructive"
      });
      setIsCreatingSheet(null);
      return;
    }

    const result = await createSheetForUser(user.name, user.email, masterSheetId, googleCreds);

    if (result.status === 'success' && result.sheetId) {
        const updatedUsers = users.map(u => u.id === user.id ? { ...u, sheet: { id: result.sheetId, name: `User_Data_${user.name}` } } : u);
        setUsers(updatedUsers);
        saveUsersToStorage(updatedUsers);
        toast({ title: "Sheet Created", description: `Sheet for ${user.name} created successfully.` });
    } else {
        toast({ title: "Error", description: result.message, variant: 'destructive' });
    }
    setIsCreatingSheet(null);
  };


  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'owner') {
      router.push('/');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);
  
  useEffect(() => {
    setUsers(getUsersFromStorage());
  }, []);

  if (!isAuthorized) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-gray-50/90">
         <Header />
         <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
           <div className="w-full max-w-6xl mx-auto">
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
             </div>
             <Skeleton className="h-[400px]" />
           </div>
         </main>
       </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Sheets
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter(u => u.sheet).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Submissions
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.reduce((acc, user) => acc + (user.submissions || 0), 0)}</div>
              </CardContent>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>User Management</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-8 w-full md:w-64"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                   <Dialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="mr-2 h-4 w-4" /> Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Enter the details for the new user. An initial password will be generated.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">Email</Label>
                          <Input id="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="aadhar" className="text-right">Aadhaar No.</Label>
                          <Input id="aadhar" value={newAadhaar} onChange={e => setNewAadhaar(e.target.value)} placeholder="XXXX XXXX XXXX" className="col-span-3" maxLength={12}/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="password" className="text-right">Password</Label>
                           <div className="col-span-3 flex gap-2">
                            <Input id="password" value={generatedPassword} readOnly placeholder="Click to generate" />
                             <Button variant="secondary" onClick={handleGeneratePassword}>
                               <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedPassword)} disabled={!generatedPassword}>
                               <Copy className="h-4 w-4" />
                            </Button>
                           </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={handleAddUser}>
                            <Shield className="mr-2 h-4 w-4" />
                            Save User
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Assigned Sheet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{user.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.sheet ? (
                          <div>
                            <div>{user.sheet.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Grid className="h-3 w-3" />
                              <a href={`https://docs.google.com/spreadsheets/d/${user.sheet.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{user.sheet.id.substring(0,15)}...</a>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleAssignSheet(user)} disabled={isCreatingSheet === user.id}>
                            {isCreatingSheet === user.id ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                            ) : (
                                <><PlusCircle className="mr-2 h-4 w-4" />Assign Sheet</>
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === 'Active' ? 'default' : 'secondary'
                          }
                          className={
                            user.status === 'Active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-100/80'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                       <TableCell>
                        <div className="font-medium text-center">{user.submissions}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <FileEdit className="h-4 w-4 text-blue-500" />
                          </Button>
                          {user.sheet && (
                            <Button variant="ghost" size="icon" onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${user.sheet.id}`, "_blank")}>
                              <ExternalLink className="h-4 w-4 text-yellow-500" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
