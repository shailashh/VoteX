'use client';

import DataEntryForm from '@/components/data-entry-form';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, useCallback } from 'react';
import { getUser } from '../api/users/user-actions';

type User = {
  id: number;
  name: string;
  email: string;
  aadhaar: string;
  status: string;
};

export default function DataEntryPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchCurrentUser = useCallback(async (aadhaar: string) => {
    const user = await getUser(aadhaar);
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    const loggedInUserAadhaar = localStorage.getItem('loggedInUser');
    if (loggedInUserAadhaar) {
      fetchCurrentUser(loggedInUserAadhaar);
    }
  }, [fetchCurrentUser]);

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
