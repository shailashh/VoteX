import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OwnerDashboard() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50/90">
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-8">
              Owner Dashboard
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This is the owner dashboard. Content coming soon!</p>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
