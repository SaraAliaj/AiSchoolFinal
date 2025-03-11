import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";

interface Question {
  id: string;
  question: string;
  points: number;
}

export default function QuizContent() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(2700); // 45:00 minutes
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isQuizOpen, setIsQuizOpen] = useState(true);

  const questions: Question[] = [
    {
      id: "q1",
      question: "Explain the difference between INNER JOIN and LEFT JOIN with examples.",
      points: 25
    }
  ];

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitQuestion = async () => {
    if (!answers[currentQuestion.id]?.trim()) return;

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Submitted answer for question:', currentQuestion.id);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isQuizOpen} onOpenChange={setIsQuizOpen}>
      <DialogContent className="sm:max-w-[600px] p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-6">
            <h2 className="text-base font-semibold">
              SQL Joins and Queries
            </h2>
            <span className="text-sm text-muted-foreground">
              Time Left: 45:00
            </span>
          </div>
          <span className="text-sm">
            Question 1 of 1
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="text-[10px] text-red-500">*</div>
            <div className="text-sm text-muted-foreground">
              25 points
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm">Question 1:</p>
            <p className="text-sm">{currentQuestion.question}</p>
          </div>
          
          <div className="relative">
            <div className="text-[10px] text-red-500 absolute -top-2 right-0">*</div>
            <Textarea
              placeholder="Write your answer here..."
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="min-h-[200px] resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 mt-6">
          <Button
            onClick={handleSubmitQuestion}
            disabled={isSubmitting || !answers[currentQuestion.id]?.trim()}
            size="sm"
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
