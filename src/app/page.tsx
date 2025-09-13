'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role) {
      setUserRole(role);
      router.push('/data-entry');
    }
  }, [router]);

  const handleLogin = (role: 'owner' | 'worker') => {
    localStorage.setItem('userRole', role);
    setUserRole(role);
    router.push('/data-entry');
  };

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
                onClick={() => handleLogin('owner')}
            >
                <Building className="mr-3 h-6 w-6" />
                Login as Owner
            </Button>
            <Button
                 variant="outline"
                className="w-full h-16 text-lg"
                onClick={() => handleLogin('worker')}
            >
                <User className="mr-3 h-6 w-6" />
                Login as Worker
            </Button>
        </CardContent>
      </Card>
    </main>
  );
}
