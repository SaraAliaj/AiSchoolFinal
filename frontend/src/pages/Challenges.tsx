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
import { CheckCircle, Clock, Trophy } from "lucide-react";

interface Challenge {
  id: string;
  courseId: string;
  courseName: string;
  lessonId: string;
  lessonName: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  timeLimit: number; // in minutes
}

const challenges: Challenge[] = [
  {
    id: "1",
    courseId: "react",
    courseName: "React Development",
    lessonId: "lesson1",
    lessonName: "Introduction to React",
    title: "Create a Simple Component",
    description: "Create a React component that displays a greeting message with a prop for the user's name.",
    points: 100,
    completed: false,
    timeLimit: 30
  },
  {
    id: "2",
    courseId: "react",
    courseName: "React Development",
    lessonId: "lesson2",
    lessonName: "Components & Props",
    title: "Build a Card Component",
    description: "Create a reusable card component that accepts title, content, and image props.",
    points: 150,
    completed: false,
    timeLimit: 45
  },
  // Add more challenges...
];

export default function Challenges() {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const handleStartChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setAnswer("");
    setTimeLeft(challenge.timeLimit * 60); // Convert minutes to seconds
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement actual submission logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Simulate successful submission
      challenges.find(c => c.id === selectedChallenge?.id)!.completed = true;
      setSelectedChallenge(null);
      setAnswer("");
    } catch (error) {
      console.error('Failed to submit challenge:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Challenges</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">Total Points: 250</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => (
          <Card key={challenge.id} className="relative">
            {challenge.completed && (
              <div className="absolute top-2 right-2">
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{challenge.courseName}</p>
                  <CardTitle className="mt-1">{challenge.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{challenge.lessonName}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{challenge.timeLimit} mins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold">{challenge.points} pts</span>
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => handleStartChallenge(challenge)}
                  disabled={challenge.completed}
                >
                  {challenge.completed ? "Completed" : "Start Challenge"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedChallenge?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time Left: {timeLeft ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>{selectedChallenge?.points} points</span>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Challenge Description:</h3>
                  <p>{selectedChallenge?.description}</p>
                </div>
                <Textarea
                  placeholder="Write your solution here..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedChallenge(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Solution"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
