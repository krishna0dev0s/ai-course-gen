import { BookOpen, ChartNoAxesColumnIncreasing, Sparkle, Play, Clock } from 'lucide-react';
import React from 'react';
import { Course } from '@/Type/courseType';
import DecryptedText from '@/components/DecryptedText';

type Props = {
  Course: Course | undefined;
};

const CourseInfoCard = ({ Course }: Props) => {
  const courseName = Course?.courseLayout?.courseName ?? 'Untitled Course';
  const courseDescription =
    Course?.courseLayout?.courseDescription ?? 'No description available yet.';
  const courseLevel = Course?.courseLayout?.level ?? 'Beginner';
  const totalChapters = Course?.courseLayout?.totalChapters ?? 0;
  const chapters = Course?.courseLayout?.chapters ?? [];
  const totalTopics = chapters.reduce((acc, ch) => acc + (ch.subContent?.length ?? 0), 0);

  const levelColor = 'from-white/10 to-white/5 text-white/70 border-white/15';

  return (
    <div className="group relative rounded-2xl border border-white/8 bg-white/3 p-8 md:p-10 backdrop-blur-xl transition-all duration-500 hover:border-white/12 hover:bg-white/4">
      {/* Subtle glow on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-linear-to-r from-white/5 via-transparent to-white/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      {/* Corner accent */}
      <div className="pointer-events-none absolute top-0 left-8 h-px w-24 bg-linear-to-r from-white/30 to-transparent" />
      <div className="pointer-events-none absolute top-0 right-8 h-px w-24 bg-linear-to-l from-white/30 to-transparent" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left Section - 3 cols */}
        <div className="md:col-span-3 flex flex-col gap-5">
          {/* Section Label */}
          <div className="flex items-center gap-3">
            <h2 className="flex w-max items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
              <Sparkle className="w-3.5 h-3.5 text-white/50" />
              Course Overview
            </h2>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            <DecryptedText
              text={courseName}
              speed={60}
              maxIterations={10}
              characters="ABCD1234!?"
              className="text-white"
              encryptedClassName="text-white/40"
              animateOn="view"
              revealDirection="start"
              sequential
              useOriginalCharsOnly={false}
            />
          </h1>

          {/* Description */}
          <p className="text-sm md:text-base leading-relaxed text-white/60 max-w-xl">
            {courseDescription}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2.5 mt-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border bg-linear-to-r px-3 py-1 text-xs font-semibold ${levelColor}`}>
              <ChartNoAxesColumnIncreasing className="w-3.5 h-3.5" />
              {courseLevel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-linear-to-r from-white/10 to-white/5 px-3 py-1 text-xs font-semibold text-white/70">
              <BookOpen className="w-3.5 h-3.5" />
              {totalChapters} Chapters
            </span>
            {totalTopics > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-linear-to-r from-white/10 to-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                <Clock className="w-3.5 h-3.5" />
                {totalTopics} Topics
              </span>
            )}
          </div>
        </div>

        {/* Right Section - 2 cols */}
        <div className="md:col-span-2 flex items-center justify-center">
          <div className="relative w-full rounded-2xl border border-white/8 bg-linear-to-br from-white/4 to-white/1 p-6 text-center backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-white/3 to-transparent" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/10">
                <Play className="h-5 w-5 text-white/50" />
              </div>
              <p className="text-sm font-medium text-white/70">
                Chapter videos are fetched from YouTube
              </p>
              <p className="mt-1.5 text-xs text-white/40">
                Scroll down to watch chapter-wise video recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseInfoCard;