'use client';

import DataEntryForm from '@/components/data-entry-form';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

type User = {
  id: number;
  name: string;
  email: string;
  aadhaar: string;
  status: string;
};

export default function DataEntryPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loggedInUserAadhaar = localStorage.getItem('loggedInUser');
    const storedUsers = localStorage.getItem('appUsers');

    if (loggedInUserAadhaar && storedUsers) {
      const users = JSON.parse(storedUsers);
      const user = users.find((u: any) => u.aadhaar === loggedInUserAadhaar);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto">
          {currentUser && (
             <Card className="mb-8">
              <CardHeader>
                <CardTitle>Logged In User</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>Name:</strong> {currentUser.name}</p>
                <p><strong>Aadhaar:</strong> {currentUser.aadhaar}</p>
              </CardContent>
            </Card>
          )}
          <DataEntryForm />
        </div>
      </main>
    </>
  );
}
