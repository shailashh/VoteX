import DataEntryForm from '@/components/data-entry-form';
import { Link } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center justify-center rounded-full bg-primary p-3">
                 <Link className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-headline">
              DataLink Forms
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Please fill out the form to submit your information.
            </p>
        </div>
        <DataEntryForm />
      </div>
    </main>
  );
}
