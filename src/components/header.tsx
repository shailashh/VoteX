'use client';
import Link from 'next/link';
import { ShieldCheck, User, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setUserRole(role);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userRole');
        router.push('/');
    };
    
    const isDataEntry = pathname === '/data-entry';
    const isDashboard = pathname === '/owner-dashboard';

    const canViewDashboard = userRole === 'owner';

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
                            <Link href="/data-entry" className={`text-sm font-medium flex items-center h-full px-1 pt-1 ${isDataEntry ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Data Entry</Link>
                            {canViewDashboard && (
                                <Link href="/owner-dashboard" className={`text-sm font-medium flex items-center h-full px-1 pt-1 ml-8 ${isDashboard ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Owner Dashboard</Link>
                            )}
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600 hidden sm:block">Welcome, {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'}</span>
                         <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
