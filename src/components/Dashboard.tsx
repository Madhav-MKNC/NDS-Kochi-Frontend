"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { BookOpen, Phone, DollarSign } from "lucide-react";

interface DashboardProps {
  onNavigate: (view: "book-seva" | "calling-seva" | "expenses") => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("currentUserName");
    if (stored) setCurrentUser(stored);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Sat Saheb 🙏
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className="hover:shadow-lg cursor-pointer"
          onClick={() => onNavigate("book-seva")}
        >
          <CardHeader className="flex flex-col items-center p-4">
            <BookOpen className="w-8 h-8 text-primary mb-2" />
            <CardTitle className="text-lg">Book Seva</CardTitle>
          </CardHeader>
          <CardDescription className="text-center pb-4">
            Navigate to Book Seva page
          </CardDescription>
        </Card>

        <Card 
          className="hover:shadow-lg cursor-pointer"
          onClick={() => onNavigate("calling-seva")}
        >
          <CardHeader className="flex flex-col items-center p-4">
            <Phone className="w-8 h-8 text-primary mb-2" />
            <CardTitle className="text-lg">Calling Seva</CardTitle>
          </CardHeader>
          <CardDescription className="text-center pb-4">
            Navigate to Calling Seva page
          </CardDescription>
        </Card>

        <Card 
          className="hover:shadow-lg cursor-pointer"
          onClick={() => onNavigate("expenses")}
        >
          <CardHeader className="flex flex-col items-center p-4">
            <DollarSign className="w-8 h-8 text-primary mb-2" />
            <CardTitle className="text-lg">Expenses</CardTitle>
          </CardHeader>
          <CardDescription className="text-center pb-4">
            Navigate to Expenses page
          </CardDescription>
        </Card>
      </div>
    </div>
  );
}
