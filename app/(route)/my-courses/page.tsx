"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen,
  RefreshCw,
  Trash2,
  Pencil,
  ExternalLink,
  Search,
  Plus,
} from "lucide-react";
import Link from "next/link";

type CourseListItem = {
  id: number;
  courseId: string;
  courseName: string;
  type: string;
  createdAT?: string;
};

export default function MyCoursesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCourses = async () => {
    if (!isSignedIn) {
      setCourses([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await axios.get("/api/course", {
        validateStatus: (status) => status >= 200 && status < 600,
      });

      if (result.status === 401) {
        setCourses([]);
        return;
      }

      if (result.status >= 400) {
        const message = (result.data as { error?: string } | undefined)?.error;
        toast.error(message || "Unable to load courses");
        return;
      }

      const items = Array.isArray(result?.data?.courses)
        ? result.data.courses
        : [];
      setCourses(items);
    } catch {
      toast.error("Unable to load courses right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    loadCourses();
  }, [isLoaded, isSignedIn]);

  const deleteCourse = async (courseId: string) => {
    try {
      await axios.delete(`/api/course?courseId=${encodeURIComponent(courseId)}`);
      setCourses((prev) => prev.filter((c) => c.courseId !== courseId));
      toast.success("Course deleted");
    } catch {
      toast.error("Failed to delete course");
    }
  };

  const renameCourse = async (course: CourseListItem) => {
    const updatedName = window.prompt(
      "Enter new course name",
      course.courseName
    );
    if (!updatedName || updatedName.trim() === course.courseName) return;

    try {
      const result = await axios.patch("/api/course", {
        courseId: course.courseId,
        courseName: updatedName.trim(),
      });

      setCourses((prev) =>
        prev.map((c) =>
          c.courseId === course.courseId
            ? {
                ...c,
                courseName:
                  result?.data?.courseName ?? updatedName.trim(),
              }
            : c
        )
      );
      toast.success("Course renamed");
    } catch {
      toast.error("Failed to rename course");
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-80 bg-linear-to-b from-white/3 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/10">
              <BookOpen className="h-5 w-5 text-white/60" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                My Courses
              </h1>
              <p className="text-sm text-white/40">
                {courses.length} course{courses.length !== 1 ? "s" : ""} created
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/4 text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white"
              onClick={loadCourses}
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              className="border border-white/15 bg-white/8 text-white hover:bg-white/15"
              asChild
            >
              <Link href="/">
                <Plus className="mr-2 h-3.5 w-3.5" />
                New Course
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        {courses.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/4 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:bg-white/6 transition-all backdrop-blur-sm"
            />
          </div>
        )}

        {/* Content */}
        {!isLoaded || isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm"
              >
                <div className="h-5 w-3/4 rounded bg-white/8 mb-3" />
                <div className="h-4 w-1/3 rounded bg-white/6 mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 w-16 rounded-lg bg-white/6" />
                  <div className="h-8 w-16 rounded-lg bg-white/6" />
                </div>
              </div>
            ))}
          </div>
        ) : !isSignedIn ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 px-8 py-20 text-center backdrop-blur-sm">
            <BookOpen className="h-12 w-12 text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white/80">
              Sign in to view your courses
            </h3>
            <p className="mt-2 text-sm text-white/40">
              Your generated courses will appear here
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 px-8 py-20 text-center backdrop-blur-sm">
            <BookOpen className="h-12 w-12 text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white/80">
              {searchQuery ? "No matching courses" : "No courses yet"}
            </h3>
            <p className="mt-2 text-sm text-white/40">
              {searchQuery
                ? "Try a different search term"
                : "Create your first course from the home page"}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                className="mt-4 border border-white/15 bg-white/8 text-white hover:bg-white/15"
                asChild
              >
                <Link href="/">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create Course
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group relative rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/12 hover:bg-white/4"
              >
                {/* Course info */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white/90 leading-snug line-clamp-2 mb-1.5">
                    {course.courseName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-white/6 px-2 py-0.5 text-[10px] font-medium text-white/50 ring-1 ring-white/8">
                      {course.type}
                    </span>
                    {course.createdAT && (
                      <span className="text-[10px] text-white/30">
                        {new Date(course.createdAT).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-8 flex-1 border border-white/10 bg-white/6 text-xs text-white/80 hover:bg-white/12 hover:text-white"
                    onClick={() => router.push(`/course/${course.courseId}`)}
                  >
                    <ExternalLink className="mr-1.5 h-3 w-3" />
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-white/8 bg-white/4 text-white/50 hover:bg-white/8 hover:text-white"
                    onClick={() => renameCourse(course)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-white/8 bg-white/4 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                    onClick={() => deleteCourse(course.courseId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
