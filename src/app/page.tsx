import DataEntryForm from '@/components/data-entry-form';
import Header from '@/components/header';
import { usePathname } from 'next/navigation'

export default function Home() {

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50/90">
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto">
          <DataEntryForm />
        </div>
      </main>
    </div>
  );
}
