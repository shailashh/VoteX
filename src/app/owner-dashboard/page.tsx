
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
  },
  {
    id: 3,
    name: 'Michael Chen',
    email: 'm.chen@example.com',
    avatar: 'MC',
    sheet: null,
    status: 'Inactive',
  },
];

export default function OwnerDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState(initialUsers);
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  const handleGeneratePassword = () => {
    const password = Math.random().toString(36).slice(-8);
    setGeneratedPassword(password);
  };
  
  const handleAddUser = () => {
    // This is a mock implementation. In a real app, you would
    // validate the form data and make an API call.
    const newUser = {
      id: users.length + 1,
      name: 'New User', // Replace with form data
      email: 'new.user@example.com', // Replace with form data
      avatar: 'NU',
      sheet: null,
      status: 'Inactive',
    };
    setUsers([...users, newUser]);
    setAddUserOpen(false);
    setGeneratedPassword("");
  };


  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'owner') {
      router.push('/data-entry');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-gray-50/90">
         <Header />
         <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
           <div className="w-full max-w-6xl mx-auto">
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Skeleton className="h-24" />
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Sheets
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
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
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Reviews
                </CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
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
                          <Label htmlFor="aadhar" className="text-right">Aadhaar No.</Label>
                          <Input id="aadhar" placeholder="XXXX XXXX XXXX" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="otp" className="text-right">OTP</Label>
                          <div className="col-span-3 flex gap-2">
                            <Input id="otp" placeholder="6-digit OTP" />
                            <Button variant="outline">Send OTP</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="password" className="text-right">Password</Label>
                           <div className="col-span-3 flex gap-2">
                            <Input id="password" value={generatedPassword} readOnly placeholder="Click to generate" />
                             <Button variant="secondary" onClick={handleGeneratePassword}>
                               <KeyRound className="h-4 w-4" />
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
                              {user.sheet.id}
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Assign Sheet
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
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <FileEdit className="h-4 w-4 text-blue-500" />
                          </Button>
                          {user.sheet && (
                            <Button variant="ghost" size="icon">
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
