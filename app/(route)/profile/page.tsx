"use client";

import React, { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Camera,
  ExternalLink,
  LogOut,
  ChevronRight,
  Key,
  Bell,
  Palette,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "sonner";
import Image from "next/image";

type CourseItem = {
  id: number;
  courseId: string;
  courseName: string;
  type: string;
  createdAT?: string;
};

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      setLoadingCourses(true);
      try {
        const res = await axios.get("/api/course", {
          validateStatus: (s) => s >= 200 && s < 600,
        });
        setCourses(
          Array.isArray(res?.data?.courses) ? res.data.courses : []
        );
      } catch {
        /* silent */
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <User className="h-12 w-12 text-white/20" />
        <h2 className="text-lg font-semibold text-white/70">
          Sign in to view your profile
        </h2>
      </div>
    );
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  const totalCourses = courses.length;
  const recentCourses = courses.slice(0, 3);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-80 bg-linear-to-b from-white/3 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10 space-y-6">
        {/* ─── Profile Header Card ─── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/6 bg-white/2 backdrop-blur-sm">
          {/* Banner gradient */}
          <div className="h-28 bg-linear-to-r from-white/6 via-white/3 to-white/6" />

          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="relative -mt-14 mb-4 flex items-end gap-4">
              <div className="relative group">
                <div className="h-24 w-24 rounded-2xl border-4 border-[#0a0a12] overflow-hidden bg-white/10">
                  {user.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.fullName ?? "Avatar"}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/60">
                      {(user.firstName?.[0] ?? user.username?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  title="Change avatar"
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() =>
                    toast.info("Use Clerk's account portal to change your avatar")
                  }
                >
                  <Camera className="h-5 w-5 text-white/80" />
                </button>
              </div>

              <div className="pb-1">
                <h1 className="text-xl font-bold text-white">
                  {user.fullName ?? user.username ?? "User"}
                </h1>
                <p className="text-sm text-white/40">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox
                label="Courses"
                value={loadingCourses ? "..." : totalCourses}
              />
              <StatBox label="Joined" value={joinDate} />
              <StatBox
                label="Email verified"
                value={
                  user.primaryEmailAddress?.verification?.status === "verified"
                    ? "Yes"
                    : "No"
                }
              />
            </div>
          </div>
        </div>

        {/* ─── Account Details ─── */}
        <div className="rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm space-y-1">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            Account Details
          </h2>

          <DetailRow icon={User} label="Full name" value={user.fullName ?? "—"} />
          <DetailRow
            icon={Mail}
            label="Email"
            value={user.primaryEmailAddress?.emailAddress ?? "—"}
          />
          <DetailRow
            icon={Globe}
            label="Username"
            value={user.username ?? "—"}
          />
          <DetailRow icon={Calendar} label="Member since" value={joinDate} />
          <DetailRow
            icon={Shield}
            label="Auth provider"
            value={
              user.externalAccounts?.[0]?.provider
                ? capitalize(user.externalAccounts[0].provider)
                : "Email"
            }
          />
        </div>

        {/* ─── Quick Settings ─── */}
        <div className="rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm space-y-1">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            Quick Settings
          </h2>

          <SettingRow
            icon={Key}
            label="Security & passwords"
            onClick={() => router.push("/user-profile")}
          />
          <SettingRow
            icon={Bell}
            label="Notification preferences"
            onClick={() => toast.info("Coming soon")}
          />
          <SettingRow
            icon={Palette}
            label="Appearance"
            onClick={() => toast.info("Coming soon")}
          />
          <SettingRow
            icon={ExternalLink}
            label="Manage account (Clerk)"
            onClick={() => router.push("/user-profile")}
          />
        </div>

        {/* ─── Recent Courses ─── */}
        <div className="rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Recent Courses
            </h2>
            {totalCourses > 3 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-white/40 hover:text-white/70"
                onClick={() => router.push("/my-courses")}
              >
                View all
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>

          {loadingCourses ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-white/4"
                />
              ))}
            </div>
          ) : recentCourses.length === 0 ? (
            <p className="text-sm text-white/30 py-4 text-center">
              No courses yet
            </p>
          ) : (
            <div className="space-y-1">
              {recentCourses.map((course) => (
                <button
                  key={course.id}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/4"
                  onClick={() => router.push(`/course/${course.courseId}`)}
                >
                  <div>
                    <p className="text-sm text-white/80 line-clamp-1">
                      {course.courseName}
                    </p>
                    <p className="text-[10px] text-white/30">
                      {course.type}
                      {course.createdAT &&
                        ` · ${new Date(course.createdAT).toLocaleDateString()}`}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-white/20" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Danger Zone ─── */}
        <div className="rounded-xl border border-red-500/10 bg-red-500/2 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-red-400/60 uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Sign out of your account</p>
              <p className="text-xs text-white/30">
                You will be redirected to the home page
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/20 bg-red-500/5 text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── sub components ─── */

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/3 px-3 py-2.5 text-center">
      <p className="text-lg font-bold text-white">
        {typeof value === "number" ? value : value}
      </p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <Icon className="h-4 w-4 text-white/30 shrink-0" />
      <span className="text-sm text-white/40 w-32 shrink-0">{label}</span>
      <span className="text-sm text-white/80 truncate">{value}</span>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/4"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 text-white/30" />
      <span className="text-sm text-white/70 flex-1">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-white/20" />
    </button>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
