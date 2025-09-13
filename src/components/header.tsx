'use client';
import Link from 'next/link';
import { LogOut, Menu, User, Database, Settings, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { updateUserStatus } from '@/app/api/users/user-actions';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
  }, []);

  const handleLogout = async () => {
    const loggedInUserAadhaar = localStorage.getItem('loggedInUser');
    if (loggedInUserAadhaar) {
      try {
        await updateUserStatus(loggedInUserAadhaar, 'Inactive');
      } catch (error) {
        console.error("Failed to update user status on logout:", error);
      }
    }
    localStorage.removeItem('userRole');
    localStorage.removeItem('loggedInUser');
    router.push('/');
  };

  const isDataEntry = pathname === '/data-entry';
  const isDashboard = pathname === '/owner-dashboard';
  const isManageSheets = pathname === '/owner-dashboard/manage-sheets';

  const canViewDashboard = userRole === 'owner';

  const navLinks = [
    { href: '/data-entry', label: 'Data Entry', icon: User, show: userRole === 'partner' },
    {
      href: '/owner-dashboard',
      label: 'Owner Dashboard',
      icon: Database,
      show: canViewDashboard,
    },
    {
      href: '/owner-dashboard/manage-sheets',
      label: 'Manage Sheets',
      icon: Settings,
      show: canViewDashboard,
    },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href={userRole === 'owner' ? '/owner-dashboard' : '/data-entry'} className="flex items-center space-x-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <span className="font-bold text-xl">VoteX</span>
            </Link>
            <nav className="hidden md:flex items-center h-full space-x-8">
              {navLinks.map(
                (link) =>
                  link.show && (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-sm font-medium flex items-center h-full px-1 pt-1 ${
                        pathname === link.href
                          ? 'border-b-2 border-primary text-primary'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              Welcome, {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'}
            </span>
            <Button variant="outline" onClick={handleLogout} className="hidden sm:inline-flex">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                     <SheetTitle className="flex items-center space-x-2">
                        <ShieldCheck className="h-7 w-7 text-primary" />
                        <span className="font-bold text-xl">VoteX Menu</span>
                     </SheetTitle>
                  </SheetHeader>
                    <nav className="flex-1 flex flex-col gap-2 p-4">
                        {navLinks.map((link) => link.show && (
                           <SheetClose asChild key={link.href}>
                             <Link
                                href={link.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-all hover:bg-muted ${
                                pathname === link.href
                                    ? 'bg-muted text-primary'
                                    : 'text-muted-foreground'
                                }`}
                            >
                                <link.icon className="h-5 w-5" />
                                {link.label}
                            </Link>
                           </SheetClose> 
                        ))}
                    </nav>
                    <div className="mt-auto p-4 border-t">
                       <Button variant="outline" onClick={handleLogout} className="w-full">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
