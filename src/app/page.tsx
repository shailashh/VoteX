'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building, LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FullPageLoader } from '@/components/ui/loading-spinner';
import { loginPartner, loginOwner } from './api/users/user-actions';


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPartnerLoginOpen, setPartnerLoginOpen] = useState(false);
  const [isOwnerLoginOpen, setOwnerLoginOpen] = useState(false);
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

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
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleOwnerLogin = async () => {
    try {
      const result = await loginOwner(ownerId, ownerPassword);
      if (result.success) {
        localStorage.setItem('userRole', 'owner');
        setUserRole('owner');
        toast({ title: "Login Successful", description: "Welcome, Owner!" });
        router.push('/owner-dashboard');
        setOwnerLoginOpen(false);
      } else {
        toast({ title: "Login Failed", description: result.message, variant: "destructive" });
      }
    } catch(e) {
      toast({ title: "Login Failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handlePartnerLogin = async () => {
    if (!aadhaar || !password) {
      toast({ title: "Login Failed", description: "Please enter Aadhaar and password.", variant: "destructive" });
      return;
    }
    
    try {
      const result = await loginPartner(aadhaar, password);
      if (result.success && result.user) {
          localStorage.setItem('userRole', 'partner');
          localStorage.setItem('loggedInUser', aadhaar); // Store logged in user's aadhaar
          setUserRole('partner');
          toast({ title: "Login Successful", description: `Welcome, ${result.user.name}!` });
          router.push('/data-entry');
          setPartnerLoginOpen(false);
      } else {
          toast({ title: "Login Failed", description: result.message, variant: "destructive" });
      }
    } catch (e) {
       toast({ title: "Login Failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  if (isLoading || userRole) {
    return <FullPageLoader />;
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
            <span className="text-4xl font-bold">VoteX</span>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
          <CardDescription>Please select your role to continue.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Dialog open={isOwnerLoginOpen} onOpenChange={setOwnerLoginOpen}>
              <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full h-16 text-lg"
                >
                    <Building className="mr-3 h-6 w-6" />
                    Login as Owner
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Owner Login</DialogTitle>
                  <DialogDescription>
                    Enter your ID and password to access the dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ownerId" className="text-right">
                      ID
                    </Label>
                    <Input
                      id="ownerId"
                      placeholder="Your owner ID"
                      className="col-span-3"
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ownerPassword" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="ownerPassword"
                      type="password"
                      className="col-span-3"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleOwnerLogin}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isPartnerLoginOpen} onOpenChange={setPartnerLoginOpen}>
              <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full h-16 text-lg"
                >
                    <User className="mr-3 h-6 w-6" />
                    Login as Partner
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Partner Login</DialogTitle>
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
                  <Button type="button" onClick={handlePartnerLogin}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </CardContent>
         <CardFooter className="flex flex-col items-center justify-center pt-6 text-sm text-muted-foreground gap-2">
          <p>Helpline: 9067488062 / 7021417737</p>
          <p>Built by Shailesh Developers</p>
        </CardFooter>
      </Card>
    </main>
  );
}
