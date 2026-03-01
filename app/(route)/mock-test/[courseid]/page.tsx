"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock3, CheckCircle2, XCircle, Brain, ListChecks, Sparkles, Target, Trophy, AlertTriangle } from "lucide-react";

type CourseResponse = {
  courseId: string;
  courseName: string;
  courseLayout?: {
    courseName?: string;
    totalChapters?: number;
    chapters?: Array<{ chapterId?: string; chapterTitle?: string }>;
  };
};

type MockQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type MockTestPayload = {
  courseId: string;
  courseName: string;
  totalQuestions: number;
  questions: MockQuestion[];
};

function formatRemainingTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function MockTestPage() {
  const { courseid } = useParams<{ courseid: string }>();

  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [isCourseLoading, setIsCourseLoading] = useState(true);
  const [isEligible, setIsEligible] = useState(false);

  const [questionsCount, setQuestionsCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [test, setTest] = useState<MockTestPayload | null>(null);

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadCourse = async () => {
      if (!courseid) return;

      setIsCourseLoading(true);
      try {
        const res = await axios.get(`/api/course?courseId=${encodeURIComponent(courseid)}`, {
          validateStatus: (status) => status >= 200 && status < 600,
        });

        if (res.status >= 400) {
          toast.error("Could not load course for mock test");
          return;
        }

        if (!mounted) return;
        const courseData = res.data as CourseResponse;
        setCourse(courseData);

        const storageKey = `course-progress:${courseData.courseId}`;
        const saved = localStorage.getItem(storageKey);
        const progress = saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
        const totalChapters = courseData?.courseLayout?.chapters?.length ?? 0;
        const completed = Object.values(progress).filter(Boolean).length;

        setIsEligible(totalChapters > 0 && completed >= totalChapters);
      } catch (error) {
        console.error("Failed to load course", error);
        toast.error("Failed to load course for mock test");
      } finally {
        if (mounted) setIsCourseLoading(false);
      }
    };

    loadCourse();
    return () => {
      mounted = false;
    };
  }, [courseid]);

  useEffect(() => {
    if (!started || submitted) return;
    if (remainingSeconds <= 0) {
      setSubmitted(true);
      toast.info("Time is up. Your mock test has been submitted.");
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, submitted, remainingSeconds]);

  const currentQuestion = test?.questions?.[activeIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const remainingCount = useMemo(
    () => (test ? Math.max(0, test.questions.length - answeredCount) : 0),
    [test, answeredCount]
  );

  const scoreSummary = useMemo(() => {
    if (!submitted || !test) return { score: 0, total: 0, percentage: 0 };

    const score = test.questions.reduce((sum, question) => {
      return answers[question.id] === question.correctAnswer ? sum + 1 : sum;
    }, 0);

    const total = test.questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    return { score, total, percentage };
  }, [submitted, test, answers]);

  const generateMockTest = async () => {
    if (!course?.courseId) return;

    setIsGenerating(true);
    try {
      const res = await axios.post(
        "/api/mock-test",
        { courseId: course.courseId, totalQuestions: questionsCount },
        { validateStatus: (status) => status >= 200 && status < 600 }
      );

      if (res.status >= 400) {
        toast.error(res.data?.error || "Could not generate mock test");
        return;
      }

      const payload = res.data as MockTestPayload;
      if (!Array.isArray(payload?.questions) || payload.questions.length === 0) {
        toast.error("No questions were generated");
        return;
      }

      setTest(payload);
      setSubmitted(false);
      setStarted(false);
      setActiveIndex(0);
      setAnswers({});
      setRemainingSeconds(Math.max(600, payload.questions.length * 90));
      toast.success("AI mock test generated");
    } catch (error) {
      console.error("Failed to generate mock test", error);
      toast.error("Failed to generate mock test");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectAnswer = (questionId: string, option: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const submitTest = () => {
    setSubmitted(true);
    setStarted(false);
    toast.success("Mock test submitted");
  };

  if (isCourseLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <Card className="border-white/10 bg-white/3 text-white">
          <CardContent className="p-6">Loading mock test setup...</CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <Card className="border-red-500/30 bg-red-500/10 text-white">
          <CardContent className="p-6">Course not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-white/4 via-transparent to-transparent" />

      <Card className="border-white/10 bg-white/3 text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-white/70" /> AI Mock Test
            </CardTitle>
            <Badge variant="outline" className="border-white/20 text-white/80">
              {course.courseLayout?.courseName || course.courseName}
            </Badge>
          </div>
          <p className="text-sm text-white/60">
            Complete your chapters first, then generate AI-based questions and attempt a timed online mock test.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-white/45">Mode</p>
              <p className="text-sm font-medium text-white/90">Timed + MCQ</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-white/45">Source</p>
              <p className="text-sm font-medium text-white/90">Course Chapters</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-white/45">Scoring</p>
              <p className="text-sm font-medium text-white/90">Instant Feedback</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!isEligible && (
        <Card className="border-yellow-500/30 bg-yellow-500/10 text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          <CardContent className="p-6 space-y-3">
            <p className="text-sm text-white/90 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-300" />
              <span>
              Mock test unlocks after course completion. Please mark all chapters as complete from your course page.
              </span>
            </p>
            <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href={`/course/${course.courseId}`}>Go to Course</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isEligible && (
        <Card className="border-white/10 bg-white/3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" /> Generate Questions via AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[10, 15, 20].map((count) => (
                <Button
                  key={count}
                  variant={questionsCount === count ? "default" : "outline"}
                  className={
                    questionsCount === count
                      ? "bg-white text-black hover:bg-white/90"
                      : "border-white/20 bg-transparent text-white hover:bg-white/10"
                  }
                  onClick={() => setQuestionsCount(count)}
                  disabled={isGenerating}
                >
                  {count} Questions
                </Button>
              ))}
            </div>

            <Button onClick={generateMockTest} disabled={isGenerating} className="bg-white text-black hover:bg-white/90">
              {isGenerating ? "Generating..." : "Generate AI Mock Test"}
            </Button>
          </CardContent>
        </Card>
      )}

      {test && (
        <Card className="border-white/10 bg-white/3 text-white shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/45">Questions</p>
                <p className="text-sm font-semibold text-white">{test.questions.length}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/45">Answered</p>
                <p className="text-sm font-semibold text-white">{answeredCount}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/45">Remaining</p>
                <p className="text-sm font-semibold text-white">{remainingCount}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/45">Status</p>
                <p className="text-sm font-semibold text-white">{submitted ? "Submitted" : started ? "In Progress" : "Not Started"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <ListChecks className="h-4 w-4" /> {answeredCount}/{test.questions.length} answered
              </div>
              {started && !submitted && (
                <div className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-1.5 text-sm">
                  <Clock3 className="h-4 w-4" /> {formatRemainingTime(remainingSeconds)}
                </div>
              )}

              {!started && !submitted && (
                <Button
                  onClick={() => setStarted(true)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Start Test
                </Button>
              )}

              {started && !submitted && (
                <Button onClick={submitTest} variant="destructive">
                  Submit Test
                </Button>
              )}
            </div>

            <Progress value={(answeredCount / test.questions.length) * 100} className="h-2" />

            {started && !submitted && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <p className="text-xs uppercase tracking-wide text-white/50">Question Navigator</p>
                <div className="flex flex-wrap gap-2">
                  {test.questions.map((question, index) => {
                    const isCurrent = index === activeIndex;
                    const isAnswered = Boolean(answers[question.id]);
                    return (
                      <button
                        key={question.id}
                        onClick={() => setActiveIndex(index)}
                        className={`h-8 min-w-8 rounded-md border px-2 text-xs font-medium transition ${
                          isCurrent
                            ? "border-white/40 bg-white/20 text-white"
                            : isAnswered
                            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                        aria-label={`Go to question ${index + 1}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {started && !submitted && currentQuestion && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white/60">Question {activeIndex + 1}</p>
                    <Badge variant="outline" className="border-white/20 text-white/70">
                      <Target className="mr-1 h-3 w-3" /> Single Choice
                    </Badge>
                  </div>
                  <p className="mt-1 text-base text-white">{currentQuestion.question}</p>
                </div>

                <div className="grid gap-2">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = answers[currentQuestion.id] === option;
                    return (
                      <button
                        key={`${currentQuestion.id}-${index}`}
                        onClick={() => selectAnswer(currentQuestion.id, option)}
                        className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                          isSelected
                            ? "border-white/35 bg-white/16 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[11px] text-white/70">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{option}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={() => setActiveIndex((prev) => Math.min(test.questions.length - 1, prev + 1))}
                    disabled={activeIndex === test.questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {submitted && (
              <div className="space-y-4">
                <Separator className="bg-white/10" />
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm text-white/60">Your Score</p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {scoreSummary.score}/{scoreSummary.total} ({scoreSummary.percentage}%)
                      </p>
                    </div>
                    <Badge
                      className={`text-xs ${
                        scoreSummary.percentage >= 80
                          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                          : scoreSummary.percentage >= 50
                          ? "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30"
                          : "bg-red-500/20 text-red-200 border border-red-400/30"
                      }`}
                    >
                      <Trophy className="mr-1 h-3 w-3" />
                      {scoreSummary.percentage >= 80 ? "Excellent" : scoreSummary.percentage >= 50 ? "Good Attempt" : "Keep Practicing"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {test.questions.map((question, index) => {
                    const selected = answers[question.id];
                    const isCorrect = selected === question.correctAnswer;

                    return (
                      <div key={question.id} className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2">
                        <p className="text-sm text-white/80">Q{index + 1}. {question.question}</p>
                        <div className="flex items-center gap-2 text-sm">
                          {isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-white/70">Your answer: {selected || "Not answered"}</span>
                        </div>
                        {!isCorrect && (
                          <p className="text-sm text-emerald-300">Correct answer: {question.correctAnswer}</p>
                        )}
                        <p className="text-xs text-white/55">{question.explanation}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    onClick={generateMockTest}
                    disabled={isGenerating}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    {isGenerating ? "Generating..." : "Generate New Test"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={() => {
                      setSubmitted(false);
                      setStarted(false);
                      setActiveIndex(0);
                      setAnswers({});
                      setRemainingSeconds(Math.max(600, test.questions.length * 90));
                    }}
                  >
                    Retry Same Test
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
