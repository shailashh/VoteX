'use client';
import Link from 'next/link';
import { ShieldCheck, User } from 'lucide-react';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';

export default function Header() {
    const pathname = usePathname();
    const isDataEntry = pathname === '/';
    const isDashboard = pathname === '/owner-dashboard';

    return (
        <header className="bg-white border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-2">
                             <ShieldCheck className="h-7 w-7 text-primary" />
                             <span className="font-bold text-xl">VoteX</span>
                        </div>
                        <nav className="hidden md:flex items-center h-full">
                            <Link href="/" className={`text-sm font-medium flex items-center h-full px-1 pt-1 ${isDataEntry ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Data Entry</Link>
                            <Link href="/owner-dashboard" className={`text-sm font-medium flex items-center h-full px-1 pt-1 ml-8 ${isDashboard ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Owner Dashboard</Link>
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600 hidden sm:block">Welcome, User</span>
                        <Button variant="outline">
                            <User className="h-4 w-4 mr-2" />
                            Profile
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
