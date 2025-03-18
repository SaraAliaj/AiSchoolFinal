import React from 'react';
import { X } from 'lucide-react';

interface LessonStartNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string | number;
  lessonName?: string;
}

export const LessonStartNotification: React.FC<LessonStartNotificationProps> = ({
  isOpen,
  onClose,
  lessonId,
  lessonName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md bg-white rounded-lg p-6 m-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">
            Lesson Started
          </h2>
          
          <div className="space-y-4">
            <p className="text-lg text-gray-700">
              A new lesson has started:
            </p>
            
            <p className="text-xl font-medium text-gray-900">
              {lessonName || `Lesson ${lessonId}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 