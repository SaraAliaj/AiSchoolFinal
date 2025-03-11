import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Clock, Trophy } from "lucide-react";

interface Quiz {
  id: string;
  courseId: string;
  courseName: string;
  date: string;
  title: string;
  description: string;
  questions: {
    id: string;
    question: string;
    points: number;
  }[];
  timeLimit: number; // in minutes
  completed: boolean;
  totalPoints: number;
}

const quizzes: Quiz[] = [
  {
    id: "1",
    courseId: "react",
    courseName: "React Development",
    date: "2025-02-23", // Friday
    title: "React Fundamentals Quiz",
    description: "Test your knowledge of React basics, components, and state management.",
    questions: [
      {
        id: "q1",
        question: "Explain the difference between state and props in React. Provide examples of when to use each.",
        points: 20
      }
    ],
    timeLimit: 45,
    completed: false,
    totalPoints: 50
  },
  {
    id: "2",
    courseId: "sql",
    courseName: "SQL Mastery",
    date: "2025-03-23", // Next Friday
    title: "SQL Joins and Queries",
    description: "Test your understanding of SQL joins, subqueries, and advanced query techniques.",
    questions: [
      {
        id: "q1",
        question: "Explain the difference between INNER JOIN and LEFT JOIN with examples.",
        points: 25
      }
    ],
    timeLimit: 60,
    completed: false,
    totalPoints: 50
  }
];

export default function Quizzes() {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(quiz.timeLimit * 60); // Convert minutes to seconds
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement actual submission logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Simulate successful submission
      quizzes.find(q => q.id === selectedQuiz?.id)!.completed = true;
      setSelectedQuiz(null);
      setAnswers({});
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Weekly Quizzes</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">Total Points Available: 100</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="relative">
            {quiz.completed && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{quiz.courseName}</p>
                  <CardTitle className="mt-1">{quiz.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(quiz.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{quiz.timeLimit} mins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold">{quiz.totalPoints} pts</span>
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => handleStartQuiz(quiz)}
                  disabled={quiz.completed}
                >
                  {quiz.completed ? "Completed" : "Start Quiz"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedQuiz} onOpenChange={() => setSelectedQuiz(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedQuiz?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time Left: {timeLeft ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Question {currentQuestionIndex + 1} of {selectedQuiz?.questions.length}</span>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {selectedQuiz?.questions.map((question, index) => (
                  <div key={question.id} className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">Question {index + 1}:</h3>
                        <span className="text-sm text-muted-foreground">{question.points} points</span>
                      </div>
                      <p className="mt-2">{question.question}</p>
                    </div>
                    <Textarea
                      placeholder="Write your answer here..."
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedQuiz(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
