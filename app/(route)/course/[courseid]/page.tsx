"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import CourseInfoCard from "./_components/CourseInfoCard";
import { chapter, Course } from "@/Type/courseType";
import CourseChapters, { ChapterYoutubeVideoMap } from "./_components/CourseChapters";
import { toast } from "sonner";

export default function CoursePreview() {
  const { courseid } = useParams();
  const [courseDetails, setCourseInfo] = useState<Course | undefined>(undefined);
  const [chapterVideos, setChapterVideos] = useState<ChapterYoutubeVideoMap>({});
  const [chapterNotes, setChapterNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [refreshingChapterId, setRefreshingChapterId] = useState<string | null>(null);
  const [generatingNotesChapterId, setGeneratingNotesChapterId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const showYouTubeWarning = (warning?: string | null) => {
    if (!warning) return;
    switch (warning) {
      case "QUOTA_EXCEEDED":
        toast.error("YouTube API daily quota exceeded. Videos will be unavailable until the quota resets (midnight Pacific Time).", { duration: 8000 });
        break;
      case "INVALID_KEY":
        toast.error("YouTube API key is invalid or missing. Please check your YOUTUBE_API_KEY in .env.", { duration: 8000 });
        break;
      case "API_NOT_ENABLED":
        toast.error("YouTube Data API v3 is not enabled for this API key. Enable it in the Google Cloud Console.", { duration: 8000 });
        break;
      case "FORBIDDEN":
        toast.error("YouTube API access is restricted. Check API key restrictions in Google Cloud Console.", { duration: 8000 });
        break;
      default:
        toast.warning("YouTube returned an unexpected error. Some chapter videos may be missing.", { duration: 6000 });
    }
  };

  useEffect(() => {
    if (courseid) {
      CourseInfoDetails();
    }
  }, [courseid]);

  const CourseInfoDetails = async () => {
    const loadingToast = toast.loading("Loading course details...");
    try {
      setIsLoading(true);
      setHasError(false);

      const result = await axios.get("/api/course?courseId=" + String(courseid), {
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (result.status >= 400) {
        setHasError(true);
        const message = (result.data as { error?: string } | undefined)?.error;
        toast.error(message || "Failed to load course details", { id: loadingToast });
        return;
      }

      setCourseInfo(result.data);
      fetchChapterVideos(result.data);

      toast.success("Course details loaded", { id: loadingToast });
    } catch (error) {
      console.error("Failed to load course details:", error);
      setHasError(true);
      toast.error("Failed to load course details", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChapterVideos = async (course: Course) => {
    const chapters = course?.courseLayout?.chapters ?? [];
    if (chapters.length === 0) {
      setChapterVideos({});
      return;
    }

    setIsLoadingVideos(true);
    try {
      const result = await axios.post(
        "/api/youtube-videos",
        {
          courseName: course?.courseLayout?.courseName,
          chapters,
        },
        {
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      if (result.status >= 400) {
        setChapterVideos({});
        return;
      }

      const videos = Array.isArray(result?.data?.videos) ? result.data.videos : [];
      const mappedVideos = videos.reduce((acc: ChapterYoutubeVideoMap, video: any) => {
        if (video?.chapterId) {
          acc[video.chapterId] = video;
        }
        return acc;
      }, {});

      setChapterVideos(mappedVideos);
      showYouTubeWarning(result?.data?.warning);
    } catch (error) {
      console.error("Failed to fetch YouTube videos:", error);
      toast.error("Could not fetch chapter videos from YouTube");
      setChapterVideos({});
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const refreshChapterVideo = async (selectedChapter: chapter) => {
    if (!courseDetails) return;

    const chapterId = selectedChapter.chapterId;
    setRefreshingChapterId(chapterId);

    try {
      const result = await axios.post(
        "/api/youtube-videos",
        {
          courseName: courseDetails?.courseLayout?.courseName,
          chapters: [selectedChapter],
          forceRefresh: true,
        },
        {
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      if (result.status >= 400) {
        toast.error("Could not refresh this chapter video");
        return;
      }

      showYouTubeWarning(result?.data?.warning);
      const refreshedVideo = Array.isArray(result?.data?.videos) ? result.data.videos[0] : null;

      if (!refreshedVideo?.chapterId) {
        toast.error("Could not refresh this chapter video");
        return;
      }

      setChapterVideos((prev) => ({
        ...prev,
        [refreshedVideo.chapterId]: refreshedVideo,
      }));
      toast.success("Chapter video refreshed");
    } catch (error) {
      console.error("Failed to refresh chapter video:", error);
      toast.error("Failed to refresh chapter video");
    } finally {
      setRefreshingChapterId(null);
    }
  };

  const refreshAllChapterVideos = async () => {
    if (!courseDetails) return;

    const chapters = courseDetails?.courseLayout?.chapters ?? [];
    if (chapters.length === 0) return;

    setIsLoadingVideos(true);
    try {
      const result = await axios.post(
        "/api/youtube-videos",
        {
          courseName: courseDetails?.courseLayout?.courseName,
          chapters,
          forceRefresh: true,
        },
        {
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      if (result.status >= 400) {
        toast.error("Failed to refresh all chapter videos");
        return;
      }

      showYouTubeWarning(result?.data?.warning);
      const videos = Array.isArray(result?.data?.videos) ? result.data.videos : [];
      const mappedVideos = videos.reduce((acc: ChapterYoutubeVideoMap, video: any) => {
        if (video?.chapterId) {
          acc[video.chapterId] = video;
        }
        return acc;
      }, {});

      setChapterVideos(mappedVideos);
      toast.success("All chapter videos refreshed");
    } catch (error) {
      console.error("Failed to refresh all chapter videos:", error);
      toast.error("Failed to refresh all chapter videos");
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const generateChapterNotes = async (selectedChapter: chapter) => {
    if (!courseDetails) return;

    const chapterId = selectedChapter.chapterId;
    setGeneratingNotesChapterId(chapterId);

    try {
      const selectedVideo = chapterVideos[chapterId];
      const result = await axios.post("/api/generate-chapter-notes", {
        courseName: courseDetails?.courseLayout?.courseName,
        chapter: selectedChapter,
        video: selectedVideo,
      });

      const notes = (result?.data?.notes as string | undefined)?.trim();
      if (!notes) {
        toast.error("Could not generate notes for this chapter");
        return;
      }

      setChapterNotes((prev) => ({
        ...prev,
        [chapterId]: notes,
      }));
      toast.success("Notes generated");
    } catch (error) {
      console.error("Failed to generate notes:", error);
      toast.error("Failed to generate notes");
    } finally {
      setGeneratingNotesChapterId(null);
    }
  };

  const downloadChapterNotes = (selectedChapter: chapter) => {
    const chapterId = selectedChapter.chapterId;
    const notes = chapterNotes[chapterId];
    if (!notes) {
      toast.error("Generate notes first");
      return;
    }

    const fileName = `${selectedChapter.chapterTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")}-notes.md`;
    const blob = new Blob([notes], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen">
      {/* Top gradient accent */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-8">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="h-6 w-32 rounded-md bg-white/10" />
                  <div className="h-10 w-3/4 rounded-md bg-white/10" />
                  <div className="h-20 w-full rounded-md bg-white/[0.06]" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 rounded-full bg-white/10" />
                    <div className="h-6 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.03] h-48" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/10" />
                  <div className="h-5 w-48 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-8 py-16 text-center backdrop-blur-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-2xl">!</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Unable to load course</h3>
            <p className="mt-2 text-sm text-white/50">Something went wrong. Please try again later.</p>
          </div>
        )}

        {courseDetails && (
          <>
            <CourseInfoCard Course={courseDetails} />
            <CourseChapters
              course={courseDetails}
              chapterVideos={chapterVideos}
              chapterNotes={chapterNotes}
              isLoadingVideos={isLoadingVideos}
              refreshingChapterId={refreshingChapterId}
              generatingNotesChapterId={generatingNotesChapterId}
              onRefreshChapter={refreshChapterVideo}
              onRefreshAllChapters={refreshAllChapterVideos}
              onGenerateNotes={generateChapterNotes}
              onDownloadNotes={downloadChapterNotes}
            />
          </>
        )}
      </div>
    </div>
  );
}