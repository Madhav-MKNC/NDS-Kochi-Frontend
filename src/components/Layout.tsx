"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, BookOpen, Phone, Receipt, BarChart3, LogOut, User, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { authApi, type User as ApiUser, ApiServiceError, apiUtils } from "@/lib/api";

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (view: "dashboard" | "book-seva" | "calling-seva" | "expenses") => void;
}

type ViewType = "dashboard" | "book-seva" | "calling-seva" | "expenses";

export default function Layout({ children, onNavigate }: LayoutProps) {
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Initialize theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      if (apiUtils.isAuthenticated()) {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      if (error instanceof ApiServiceError && error.status === 401) {
        // User is not authenticated, this will be handled by the auth interceptor
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const toggleTheme = useCallback(() => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleNavigation = useCallback((view: ViewType) => {
    setCurrentView(view);
    onNavigate(view);
    setIsSheetOpen(false);
  }, [onNavigate]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
      toast.success("Logged out successfully");
      // The auth interceptor will handle token removal and redirect
    } catch (error) {
      if (error instanceof ApiServiceError) {
        console.error("Logout error:", error.message);
        // Still remove token locally even if API call fails
        apiUtils.removeToken();
        window.location.href = '/';
      } else {
        toast.error("An error occurred during logout");
      }
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const getUserInitials = useCallback((name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  }, []);

  const navigationItems = [
    {
      key: "dashboard" as ViewType,
      label: "Dashboard",
      icon: BarChart3,
      description: "Overview and analytics"
    },
    {
      key: "book-seva" as ViewType,
      label: "Book Seva",
      icon: BookOpen,
      description: "Book distribution records"
    },
    {
      key: "calling-seva" as ViewType,
      label: "Calling Seva",
      icon: Phone,
      description: "Calling seva management"
    },
    {
      key: "expenses" as ViewType,
      label: "Expenses",
      icon: Receipt,
      description: "Expense tracking"
    }
  ];

  const NavigationContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <nav className={`space-y-2 ${isMobile ? 'p-4' : 'p-6'}`}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.key;

        return (
          <Button
            key={item.key}
            variant={isActive ? "default" : "ghost"}
            className={`w-full justify-start gap-3 ${isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            onClick={() => handleNavigation(item.key)}
          >
            <Icon className="h-4 w-4" />
            <div className="flex-1 text-left">
              <div className="font-medium">{item.label}</div>
              {!isMobile && (
                <div className="text-xs opacity-70">{item.description}</div>
              )}
            </div>
          </Button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center gap-4">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img
                      src="/logo.jpg"
                      alt="Logo"
                      className="rounded-md"
                    />
                  </div>
                  <div>
                    <h2 className="font-heading font-semibold text-foreground">NDS-Kochi</h2>
                    <p className="text-xs text-muted-foreground">Management System</p>
                  </div>
                </div>
                <NavigationContent isMobile />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="rounded-md"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-heading font-semibold text-foreground">NDS-Kochi</h1>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-muted">
                      {getUserInitials(currentUser?.name, currentUser?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-foreground">
                      {currentUser?.name || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentUser?.email || "Loading..."}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium text-foreground">
                    {currentUser?.name || "User"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentUser?.email || "Loading..."}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="sm:hidden" onClick={toggleTheme}>
                  {isDarkMode ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Dark Mode
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {loggingOut ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-80 border-r border-border bg-card">
          <Card className="m-4 border-border">
            <NavigationContent />
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}