import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLesson } from '@/hooks/useLesson';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PlayCircle, StopCircle, Crown } from 'lucide-react';

interface LeadStudentControlsProps {
  currentLessonId?: string;
  isLessonActive: boolean;
  onLessonStart?: () => void;
  onLessonEnd?: () => void;
}

const LeadStudentControls: React.FC<LeadStudentControlsProps> = ({ 
  currentLessonId, 
  isLessonActive,
  onLessonStart,
  onLessonEnd
}) => {
  const { user } = useAuth();
  const { startLesson, endLesson, loading } = useLesson();
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  
  // Only lead students should see these controls
  if (!user || user.role !== 'lead_student') {
    return null;
  }

  const handleStartLesson = async () => {
    if (!currentLessonId) {
      toast({
        title: "Error",
        description: "No lesson selected",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDuration) {
      toast({
        title: "Error",
        description: "Please select a lesson duration",
        variant: "destructive",
      });
      return;
    }

    try {
      await startLesson(currentLessonId);
      if (onLessonStart) onLessonStart();
    } catch (error) {
      console.error("Failed to start lesson:", error);
    }
  };

  const handleEndLesson = async () => {
    if (!currentLessonId) {
      toast({
        title: "Error",
        description: "No active lesson to end",
        variant: "destructive",
      });
      return;
    }

    try {
      await endLesson(currentLessonId);
      if (onLessonEnd) onLessonEnd();
    } catch (error) {
      console.error("Failed to end lesson:", error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-amber-200/50 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-amber-50">
          <Crown className="h-5 w-5 text-amber-700" />
        </div>
        <p className="text-base text-amber-900 font-medium">
          Lead Student Controls
        </p>
      </div>
      
      <p className="text-sm text-amber-800/80 mb-4">
        As the lead student, you have the authority to manage this lesson. Choose wisely!
      </p>
      
      {!isLessonActive ? (
        <>
          <Select value={selectedDuration} onValueChange={setSelectedDuration}>
            <SelectTrigger className="border-amber-100 bg-white text-amber-900 hover:border-amber-200 transition-colors mb-3">
              <SelectValue placeholder="Select duration in minutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 minute</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="20">20 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleStartLesson} 
            disabled={loading || !selectedDuration || !currentLessonId}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Start Lesson
          </Button>
        </>
      ) : (
        <Button 
          onClick={handleEndLesson} 
          disabled={loading || !currentLessonId}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          <StopCircle className="mr-2 h-4 w-4" />
          End Lesson
        </Button>
      )}
    </div>
  );
};

export default LeadStudentControls; 