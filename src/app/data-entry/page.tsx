'use client';

import DataEntryForm from '@/components/data-entry-form';
import Header from '@/components/header';

export default function DataEntryPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto">
          <DataEntryForm />
        </div>
      </main>
    </>
  );
}
