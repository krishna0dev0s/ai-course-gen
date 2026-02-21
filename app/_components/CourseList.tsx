"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type CourseListItem = {
  id: number;
  courseId: string;
  courseName: string;
  type: string;
  createdAT?: string;
};

const CourseList = () => {
  const route = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [isHydrated, setIsHydrated] = useState(false);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const loadCourses = async () => {
    if (!isSignedIn) {
      setCourses([]);
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await axios.get('/api/course', {
        validateStatus: (status) => status >= 200 && status < 600,
      });

      if (result.status === 401) {
        setCourses([]);
        setLoadError(null);
        return;
      }

      if (result.status >= 400) {
        const message = (result.data as { error?: string } | undefined)?.error;
        setLoadError(message || 'Unable to load courses right now.');
        return;
      }

      const items = Array.isArray(result?.data?.courses) ? result.data.courses : [];
      setCourses(items);
      setLoadError(null);
    } catch (error) {
      setLoadError('Unable to load courses right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isHydrated || !isLoaded) return;
    loadCourses();
  }, [isHydrated, isLoaded, isSignedIn]);

  const isAuthReady = isHydrated && isLoaded;

  const openCourse = (courseId: string) => {
    route.push(`/course/${courseId}`);
  };

  const deleteCourse = async (courseId: string) => {
    try {
      await axios.delete(`/api/course?courseId=${encodeURIComponent(courseId)}`);
      setCourses((prev) => prev.filter((item) => item.courseId !== courseId));
      toast.success('Course deleted');
    } catch (error) {
      console.error('Failed to delete course:', error);
      toast.error('Failed to delete course');
    }
  };

  const renameCourse = async (course: CourseListItem) => {
    const updatedName = window.prompt('Enter new course name', course.courseName);
    if (!updatedName || updatedName.trim() === course.courseName) return;

    try {
      const result = await axios.patch('/api/course', {
        courseId: course.courseId,
        courseName: updatedName.trim(),
      });

      setCourses((prev) =>
        prev.map((item) =>
          item.courseId === course.courseId
            ? { ...item, courseName: result?.data?.courseName ?? updatedName.trim() }
            : item
        )
      );
      toast.success('Course renamed');
    } catch (error) {
      console.error('Failed to rename course:', error);
      toast.error('Failed to rename course');
    }
  };

  return (
    <section className="mx-auto mt-8 max-w-6xl px-4 pb-10 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your Courses</h2>
        <Button variant="outline" size="sm" onClick={loadCourses} disabled={!isAuthReady || isLoading || !isSignedIn}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {loadError && (
        <Card className="mb-4 border-border/60 bg-background/60 backdrop-blur-md">
          <CardContent className="py-4 text-sm text-destructive">
            {loadError}
          </CardContent>
        </Card>
      )}

      {!isAuthReady ? (
        <Card className="border-border/60 bg-background/60 backdrop-blur-md">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Loading your courses...
          </CardContent>
        </Card>
      ) : !isSignedIn ? (
        <Card className="border-border/60 bg-background/60 backdrop-blur-md">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Sign in to view and manage your saved courses.
          </CardContent>
        </Card>
      ) : courses.length === 0 ? (
        <Card className="border-border/60 bg-background/60 backdrop-blur-md">
          <CardContent className="py-8 text-sm text-muted-foreground">
            No courses yet. Create one from the generator above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="border-border/60 bg-background/60 backdrop-blur-md transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base leading-snug break-words">{course.courseName}</CardTitle>
                <p className="text-xs text-muted-foreground">Type: {course.type}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button size="sm" className="w-full sm:w-auto" onClick={() => openCourse(course.courseId)}>
                  Open
                </Button>
                <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => renameCourse(course)}>
                  Rename
                </Button>
                <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => deleteCourse(course.courseId)}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default CourseList;