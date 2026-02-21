import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chapter, Course } from '@/Type/courseType';
import { Button } from '@/components/ui/button';
import { Dot, RefreshCw, FileText, Download, Play, RotateCw } from 'lucide-react';
import React, { useState } from 'react';

export type ChapterYoutubeVideo = {
  chapterId: string;
  chapterTitle: string;
  videoId: string | null;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
  watchUrl: string | null;
  embedUrl: string | null;
};

export type ChapterYoutubeVideoMap = Record<string, ChapterYoutubeVideo>;

type Props = {
  course: Course | undefined;
  chapterVideos: ChapterYoutubeVideoMap;
  chapterNotes: Record<string, string>;
  isLoadingVideos: boolean;
  refreshingChapterId: string | null;
  generatingNotesChapterId: string | null;
  onRefreshChapter: (selectedChapter: chapter) => void;
  onRefreshAllChapters: () => void;
  onGenerateNotes: (selectedChapter: chapter) => void;
  onDownloadNotes: (selectedChapter: chapter) => void;
};

function getYouTubeEmbedUrl(chapterTitle: string, courseName?: string) {
  const query = encodeURIComponent(`${courseName ?? ''} ${chapterTitle} tutorial`.trim());
  return `https://www.youtube.com/embed?listType=search&list=${query}`;
}

function CourseChapters({
  course,
  chapterVideos,
  chapterNotes,
  isLoadingVideos,
  refreshingChapterId,
  generatingNotesChapterId,
  onRefreshChapter,
  onRefreshAllChapters,
  onGenerateNotes,
  onDownloadNotes,
}: Props) {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const chapters = course?.courseLayout?.chapters ?? [];

  return (
    <div className="w-full space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/10">
            <Play className="h-4 w-4 text-white/60" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Chapters</h2>
            <p className="text-xs text-white/40">{chapters.length} chapters available</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="group border-white/10 bg-white/4 text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white transition-all"
          onClick={onRefreshAllChapters}
          disabled={isLoadingVideos}
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoadingVideos ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isLoadingVideos ? 'Refreshing...' : 'Refresh all'}
        </Button>
      </div>

      {/* Chapters list */}
      <div className="space-y-3">
        {chapters.map((chapter, index) => {
          const chapterKey = chapter.chapterId ?? String(index);
          const fetchedVideo = chapterVideos[chapterKey];
          const chapterNote = chapterNotes[chapterKey];
          const videoUrl = fetchedVideo?.embedUrl || null;
          const isExpanded = expandedChapter === index;

          return (
            <div
              key={index}
              className={`group/card relative rounded-xl border transition-all duration-300 ${
                isExpanded
                  ? 'border-white/15 bg-white/5 shadow-[0_0_24px_rgba(255,255,255,0.04)]'
                  : 'border-white/6 bg-white/2 hover:border-white/10 hover:bg-white/3'
              } backdrop-blur-sm overflow-hidden`}
            >
              {/* Chapter header - clickable */}
              <button
                onClick={() => setExpandedChapter(isExpanded ? null : index)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                {/* Number badge */}
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 ${
                  isExpanded
                    ? 'bg-white/20 text-white ring-1 ring-white/25 shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                    : 'bg-white/6 text-white/60 ring-1 ring-white/10 group-hover/card:bg-white/10 group-hover/card:text-white/80'
                }`}>
                  {index + 1}
                </span>

                {/* Title */}
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm md:text-base font-semibold truncate transition-colors ${
                    isExpanded ? 'text-white' : 'text-white/80 group-hover/card:text-white'
                  }`}>
                    {chapter.chapterTitle}
                  </h3>
                  <p className="text-xs text-white/30 mt-0.5">
                    {chapter.subContent?.length ?? 0} topics
                  </p>
                </div>

                {/* Status badges */}
                <div className="hidden sm:flex items-center gap-2">
                  {chapterNote && (
                    <span className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/60 ring-1 ring-white/10">
                      <FileText className="h-3 w-3" /> Notes
                    </span>
                  )}
                  {fetchedVideo?.videoId && (
                    <span className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/60 ring-1 ring-white/10">
                      <Play className="h-3 w-3" /> Video
                    </span>
                  )}
                </div>

                {/* Expand indicator */}
                <svg
                  className={`h-5 w-5 shrink-0 text-white/30 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="animate-[fadeIn_0.25s_ease-out] border-t border-white/6 px-5 py-5">
                  {/* Action buttons */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-white/10 bg-white/4 text-xs text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); onRefreshChapter(chapter); }}
                      disabled={refreshingChapterId === chapter.chapterId}
                    >
                      <RotateCw className={`mr-1.5 h-3 w-3 ${refreshingChapterId === chapter.chapterId ? 'animate-spin' : ''}`} />
                      {refreshingChapterId === chapter.chapterId ? 'Refreshing...' : 'Refresh video'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-white/10 bg-white/4 text-xs text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); onGenerateNotes(chapter); }}
                      disabled={generatingNotesChapterId === chapter.chapterId}
                    >
                      <FileText className={`mr-1.5 h-3 w-3 ${generatingNotesChapterId === chapter.chapterId ? 'animate-pulse' : ''}`} />
                      {generatingNotesChapterId === chapter.chapterId ? 'Creating...' : 'Create Notes'}
                    </Button>
                    {chapterNote && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-white/10 bg-white/4 text-xs text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); onDownloadNotes(chapter); }}
                      >
                        <Download className="mr-1.5 h-3 w-3" />
                        Download Notes
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Topics list */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Topics covered</p>
                      {chapter?.subContent?.map((content, subIndex) => (
                        <div key={subIndex} className="flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-white/3">
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/6 text-[10px] font-bold text-white/40">
                            {subIndex + 1}
                          </span>
                          <p className="text-sm text-white/60">{content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Video player */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Video preview</p>
                      <div className="overflow-hidden rounded-xl border border-white/8 bg-black/30">
                        {videoUrl ? (
                          <iframe
                            title={`${chapter.chapterTitle} YouTube Preview`}
                            src={videoUrl}
                            loading="lazy"
                            className="block aspect-video w-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                          />
                        ) : (
                          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-4 text-center bg-linear-to-br from-white/2 to-transparent">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/6 ring-1 ring-white/10">
                              <Play className="h-5 w-5 text-white/30" />
                            </div>
                            <p className="text-xs text-white/40">Preview unavailable</p>
                            {fetchedVideo?.watchUrl && (
                              <Button asChild variant="outline" size="sm" className="h-7 border-white/10 bg-white/4 text-xs text-white/60 hover:bg-white/8 hover:text-white">
                                <a href={fetchedVideo.watchUrl} target="_blank" rel="noreferrer">
                                  Watch on YouTube
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="border-t border-white/6 px-3 py-2 text-[11px] text-white/40 truncate">
                          {isLoadingVideos
                            ? <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Finding best video...</span>
                            : fetchedVideo?.title || 'No video found yet'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes section */}
                  {chapterNote && (
                    <div className="mt-5 rounded-xl border border-white/6 bg-white/2 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-white/50" />
                        <h3 className="text-sm font-semibold text-white/80">Revision Notes</h3>
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-4 text-xs leading-relaxed text-white/55 scrollbar-thin">
                        {chapterNote}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CourseChapters;