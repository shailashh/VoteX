'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
  Search,
  FileEdit,
  Trash2,
  UserPlus,
  KeyRound,
  Copy,
  RotateCcw,
  Users,
  Shield,
  Phone,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FullPageLoader } from '@/components/ui/loading-spinner';
import {
    getUsers,
    addUser,
    updateUser,
    deleteUser,
} from '../api/users/user-actions';
import { getSettings } from '../owner-dashboard/manage-sheets/actions';
import Link from 'next/link';


export default function OwnerDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [isEditUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newAadhaar, setNewAadhaar] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [masterSheetId, setMasterSheetId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
      const settings = await getSettings();
      setMasterSheetId(settings.masterSheetId);
    } catch (error) {
      console.error("Data fetching error:", error);
      toast({ title: "Data fetching error", description: "Could not load user data. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'owner') {
      router.push('/');
    } else {
      fetchUsers();
    }
  }, [router, fetchUsers]);

  const handleGeneratePassword = () => {
    const password = Math.random().toString(36).slice(-8);
    setGeneratedPassword(password);
  };
  
  const handleAddUser = async () => {
    if (!newUserName.trim()) {
        toast({ title: "Validation Error", description: "Please enter the user's name.", variant: "destructive" });
        return;
    }
    if (!newAadhaar || newAadhaar.length !== 12 || !/^\d+$/.test(newAadhaar)) {
        toast({ title: "Validation Error", description: "Please enter a valid 12-digit Aadhaar number.", variant: "destructive" });
        return;
    }
    if (!newUserPhone || newUserPhone.length !== 10 || !/^\d+$/.test(newUserPhone)) {
        toast({ title: "Validation Error", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
        return;
    }
    if (!generatedPassword) {
        toast({ title: "Validation Error", description: "Please generate a password for the user.", variant: "destructive" });
        return;
    }

    const email = newUserEmail || `user${users.length + 1}@example.com`;

    const newUser = {
      name: newUserName,
      email: email,
      aadhaar: newAadhaar,
      phone: newUserPhone,
      password: generatedPassword,
    };

    try {
        const addedUser = await addUser(newUser);
        setUsers(prevUsers => [...prevUsers, addedUser]);
        toast({ title: "User Added", description: `${newUserName} has been created.` });

        setAddUserOpen(false);
        setGeneratedPassword("");
        setNewAadhaar("");
        setNewUserEmail("");
        setNewUserName("");
        setNewUserPhone("");
    } catch(e) {
        toast({ title: "Error", description: "Failed to add user.", variant: "destructive" });
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    
    try {
        const updated = await updateUser(editingUser.id, { name: editingUser.name, email: editingUser.email, phone: editingUser.phone });
        setUsers(users.map(u => u.id === editingUser.id ? updated : u));
        toast({ title: "User Updated", description: `${editingUser.name}'s details have been updated.` });
        setEditUserOpen(false);
        setEditingUser(null);
    } catch(e) {
        toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser({ ...user });
    setEditUserOpen(true);
  };

  const copyToClipboard = (text: string, type: string = "Password") => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${type} copied to clipboard.` });
  }
  
  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId);
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, status: 'Deleted' } : user
      );
      setUsers(updatedUsers);
      toast({ title: "User Deleted", description: "The user has been moved to the deleted section." });
    } catch(e) {
       toast({ title: "Error", description: "Failed to delete user.", variant: 'destructive' });
    }
  };

  const handleRecoverUser = async (userId: number) => {
    try {
        const updated = await updateUser(userId, { status: 'Inactive' });
        const updatedUsers = users.map(user => 
          user.id === userId ? updated : user
        );
        setUsers(updatedUsers);
        toast({ title: "User Recovered", description: "The user has been restored to the main list." });
    } catch(e) {
        toast({ title: "Error", description: "Failed to recover user.", variant: "destructive" });
    }
  };
  
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = user.name?.toLowerCase().includes(searchLower) ||
                            user.email?.toLowerCase().includes(searchLower) ||
                            user.phone?.includes(searchTerm) ||
                            user.aadhaar?.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || (user.status !== 'Deleted' && statusFilter === 'active_inactive') || user.status === statusFilter;
      
      if (statusFilter === 'all') return user.status !== 'Deleted';
      if (statusFilter === 'Active') return user.status === 'Active';
      if (statusFilter === 'Inactive') return user.status === 'Inactive';

      return matchesSearch;

    }).filter(user => user.status !== 'Deleted');
  }, [users, searchTerm, statusFilter]);

  const activeUsers = useMemo(() => filteredUsers.filter(u => u.status !== 'Deleted'), [filteredUsers]);
  const deletedUsers = useMemo(() => users.filter(u => u.status === 'Deleted'), [users]);
  const totalSubmissions = useMemo(() => users.reduce((acc, user) => acc + (user.submissions || 0), 0), [users]);


  if (isLoading) {
    return <FullPageLoader />;
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
                  Total Users
                </CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeUsers.length}</div>
              </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{users.filter(u => u.status === 'Active').length}</div>
                </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Submissions
                </CardTitle>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubmissions}</div>
              </CardContent>
            </Card>
            {masterSheetId && (
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                          Master Sheet Link
                      </CardTitle>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                          ID: {masterSheetId}
                      </p>
                      <Button asChild size="sm">
                          <Link href={`https://docs.google.com/spreadsheets/d/${masterSheetId}`} target="_blank">
                              Open Google Sheet
                          </Link>
                      </Button>
                  </CardContent>
              </Card>
            )}
          </div>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  User Management
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-8 w-full md:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchUsers}>
                    <RefreshCw className="h-4 w-4" />
                    <span className="sr-only">Refresh</span>
                  </Button>
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
                          <Label htmlFor="name" className="text-right">Name</Label>
                          <Input id="name" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Full Name" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">Email</Label>
                          <Input id="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com (Optional)" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="aadhar" className="text-right">Aadhaar No.</Label>
                          <Input id="aadhar" value={newAadhaar} onChange={e => setNewAadhaar(e.target.value)} placeholder="XXXX XXXX XXXX" className="col-span-3" maxLength={12}/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">Phone No.</Label>
                          <Input id="phone" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} placeholder="10-digit number" className="col-span-3" maxLength={10}/>
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
                            <UserPlus className="mr-2 h-4 w-4" />
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
                    <TableHead>Status</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                  {activeUsers.map((user) => (
                    <TableRow key={user.id}>
                        <>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {user.email}
                                </div>
                                {user.phone && (
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {user.phone}
                                  </div>
                                )}
                                {user.aadhaar && (
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    {user.aadhaar}
                                  </div>
                                )}
                                {user.password && (
                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                    <KeyRound className="h-3 w-3" />
                                    <span>{user.password}</span>
                                    <button onClick={() => copyToClipboard(user.password, "Password")} className="ml-1 opacity-50 hover:opacity-100">
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
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
                            <div className="font-medium text-center">{user.submissions || 0}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                                <FileEdit className="h-4 w-4 text-blue-500" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will move the user to the deleted section. They can be recovered later.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                        Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {deletedUsers.length > 0 && (
             <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Deleted Users
                </CardTitle>
                <CardDescription>
                  These users have been deleted. You can recover them at any time.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'U'}</AvatarFallback>
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
                          <div className="font-medium text-center">{user.submissions}</div>
                        </TableCell>
                        <TableCell>
                           <Button variant="outline" size="sm" onClick={() => handleRecoverUser(user.id)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Recover
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the details for {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input id="edit-name" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">Email</Label>
                <Input id="edit-email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">Phone No.</Label>
                <Input id="edit-phone" value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={handleEditUser}>
                Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
