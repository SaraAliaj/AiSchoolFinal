import React from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LessonLayoutProps {
  children: React.ReactNode;
  isLesson1?: boolean;
}

export function LessonLayout({ children, isLesson1 = false }: LessonLayoutProps) {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal">
        {/* Main Content */}
        <ResizablePanel defaultSize={70}>
          <ScrollArea className="h-full">
            <div className="p-6">
              {children}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 