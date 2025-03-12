import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface LessonLayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
}

export default function LessonLayout({ 
  children, 
  title, 
  onBack 
}: LessonLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b py-3 px-6 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </header>
      
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
} 