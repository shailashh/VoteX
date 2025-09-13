
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Building, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isWorkerLoginOpen, setWorkerLoginOpen] = useState(false);
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role) {
      setUserRole(role);
      // Redirect based on role if already logged in
      if (role === 'owner') {
        router.push('/owner-dashboard');
      } else {
        router.push('/data-entry');
      }
    }
  }, [router]);

  const handleOwnerLogin = () => {
    localStorage.setItem('userRole', 'owner');
    setUserRole('owner');
    router.push('/owner-dashboard');
  };

  const handleWorkerLogin = () => {
    if (!aadhaar || !password) {
      toast({ title: "Login Failed", description: "Please enter Aadhaar and password.", variant: "destructive" });
      return;
    }

    const storedUsers = localStorage.getItem('appUsers');
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    
    const foundUser = users.find((user: any) => user.aadhaar === aadhaar && user.password === password);

    if (foundUser) {
      localStorage.setItem('userRole', 'worker');
      setUserRole('worker');
      toast({ title: "Login Successful", description: `Welcome, ${foundUser.name}!` });
      router.push('/data-entry');
      setWorkerLoginOpen(false);
    } else {
      toast({ title: "Login Failed", description: "Invalid Aadhaar or password.", variant: "destructive" });
    }
  };

  if (userRole) {
    // Render a loading state or null while redirecting
    return null;
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to VoteX</CardTitle>
          <CardDescription>Please select your role to continue.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Button
                variant="outline"
                className="w-full h-16 text-lg"
                onClick={handleOwnerLogin}
            >
                <Building className="mr-3 h-6 w-6" />
                Login as Owner
            </Button>
            <Dialog open={isWorkerLoginOpen} onOpenChange={setWorkerLoginOpen}>
              <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full h-16 text-lg"
                >
                    <User className="mr-3 h-6 w-6" />
                    Login as Worker
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Worker Login</DialogTitle>
                  <DialogDescription>
                    Enter your Aadhaar number and password to login.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="aadhaar" className="text-right">
                      Aadhaar
                    </Label>
                    <Input
                      id="aadhaar"
                      placeholder="12-digit number"
                      className="col-span-3"
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value)}
                      maxLength={12}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      className="col-span-3"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleWorkerLogin}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </CardContent>
      </Card>
    </main>
  );
}

    