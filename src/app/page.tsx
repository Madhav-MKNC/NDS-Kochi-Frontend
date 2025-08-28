"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import Auth from "@/components/Auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import BookSevaSection from "@/components/BookSevaSection";
import CallingSevaSection from "@/components/CallingSevaSection";
import ExpensesSection from "@/components/ExpensesSection";

type ViewType = "login" | "dashboard" | "book-seva" | "calling-seva" | "expenses";

export default function Page() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<ViewType>("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on mount
    const token = localStorage.getItem("access_token");
    if (token) {
      setIsAuthenticated(true);
      setCurrentView("dashboard");
    } else {
      setIsAuthenticated(false);
      setCurrentView("login");
    }
  }, []);

  const handleSuccessfulLogin = () => {
    setIsAuthenticated(true);
    setCurrentView("dashboard");
  };

  const handleNavigation = (view: ViewType) => {
    setCurrentView(view);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "book-seva":
        return <BookSevaSection />;
      case "calling-seva":
        return <CallingSevaSection />;
      case "expenses":
        return <ExpensesSection />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Auth onSuccessfulLogin={handleSuccessfulLogin} />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Layout onNavigate={handleNavigation}>
        <div className="container mx-auto max-w-7xl px-4 py-6">
          {renderMainContent()}
        </div>
      </Layout>
      <Toaster position="top-right" />
    </ProtectedRoute>
  );
}