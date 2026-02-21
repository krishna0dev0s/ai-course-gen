"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  BookOpen,
  Flame,
  TrendingUp,
  Calendar,
  BarChart3,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type CourseItem = {
  id: number;
  courseId: string;
  courseName: string;
  type: string;
  createdAT?: string;
};

/* ─── helpers ─── */

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getWeekLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function getLast6Months(): string[] {
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(
      d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    );
  }
  return months;
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = [...new Set(dates.map((d) => d.split("T")[0]))].sort(
    (a, b) => b.localeCompare(a)
  );

  const today = new Date().toISOString().split("T")[0];
  if (unique[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (unique[0] !== yesterday.toISOString().split("T")[0]) return 0;
  }

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    prev.setDate(prev.getDate() - 1);
    if (prev.toISOString().split("T")[0] === unique[i]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/* ─── stat card ─── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/12 hover:bg-white/4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-white/30">{sub}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/6">
          <Icon className="h-4 w-4 text-white/50" />
        </div>
      </div>
    </div>
  );
}

/* ─── custom tooltip ─── */

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/80 px-3 py-2 backdrop-blur-xl shadow-lg">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value}</p>
    </div>
  );
}

/* ─── pie colors ─── */
const PIE_COLORS = [
  "rgba(255,255,255,0.5)",
  "rgba(255,255,255,0.35)",
  "rgba(255,255,255,0.25)",
  "rgba(255,255,255,0.15)",
  "rgba(255,255,255,0.10)",
];

/* ─── main page ─── */

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      setIsLoading(true);
      try {
        const res = await axios.get("/api/course", {
          validateStatus: (s) => s >= 200 && s < 600,
        });
        const items = Array.isArray(res?.data?.courses)
          ? res.data.courses
          : [];
        setCourses(items);
      } catch {
        /* silent */
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn]);

  /* computed data */
  const streak = useMemo(
    () =>
      computeStreak(
        courses.map((c) => c.createdAT ?? "").filter(Boolean)
      ),
    [courses]
  );

  const weeklyData = useMemo(() => {
    const days = getLast7Days();
    const counts: Record<string, number> = {};
    days.forEach((d) => (counts[d] = 0));
    courses.forEach((c) => {
      if (!c.createdAT) return;
      const key = c.createdAT.split("T")[0];
      if (counts[key] !== undefined) counts[key]++;
    });
    return days.map((d) => ({
      day: getWeekLabel(d),
      courses: counts[d],
    }));
  }, [courses]);

  const monthlyData = useMemo(() => {
    const months = getLast6Months();
    const counts: Record<string, number> = {};
    months.forEach((m) => (counts[m] = 0));
    courses.forEach((c) => {
      if (!c.createdAT) return;
      const key = getMonthKey(c.createdAT);
      if (counts[key] !== undefined) counts[key]++;
    });
    return months.map((m) => ({ month: m, courses: counts[m] }));
  }, [courses]);

  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    courses.forEach((c) => {
      map[c.type] = (map[c.type] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [courses]);

  const streakDays = useMemo(() => {
    const days = getLast7Days();
    const dateSet = new Set(
      courses.map((c) => c.createdAT?.split("T")[0] ?? "")
    );
    return days.map((d) => ({
      day: getWeekLabel(d),
      active: dateSet.has(d),
    }));
  }, [courses]);

  const thisWeekCount = useMemo(
    () => weeklyData.reduce((s, d) => s + d.courses, 0),
    [weeklyData]
  );

  /* ─── render ─── */

  const skeleton = (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-white/6 bg-white/2"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-72 rounded-xl border border-white/6 bg-white/2"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-80 bg-linear-to-b from-white/3 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/10">
            <LayoutDashboard className="h-5 w-5 text-white/60" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="text-sm text-white/40">
              Your learning overview at a glance
            </p>
          </div>
        </div>

        {!isLoaded || isLoading ? (
          skeleton
        ) : !isSignedIn ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 px-8 py-20 text-center backdrop-blur-sm">
            <LayoutDashboard className="h-12 w-12 text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white/80">
              Sign in to view your dashboard
            </h3>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={BookOpen}
                label="Total Courses"
                value={courses.length}
                sub="All time"
              />
              <StatCard
                icon={Flame}
                label="Current Streak"
                value={`${streak}d`}
                sub={streak > 0 ? "Keep it up!" : "Create a course today"}
              />
              <StatCard
                icon={TrendingUp}
                label="This Week"
                value={thisWeekCount}
                sub="Courses created"
              />
              <StatCard
                icon={Zap}
                label="Course Types"
                value={typeData.length}
                sub="Categories explored"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Weekly Activity – Area Chart */}
              <div className="rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-white/40" />
                  <h2 className="text-sm font-semibold text-white/70">
                    Weekly Activity
                  </h2>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient
                          id="areaGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgba(255,255,255,0.3)"
                          />
                          <stop
                            offset="100%"
                            stopColor="rgba(255,255,255,0)"
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip content={<GlassTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="courses"
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth={2}
                        fill="url(#areaGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Trend – Bar Chart */}
              <div className="rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-white/40" />
                  <h2 className="text-sm font-semibold text-white/70">
                    Monthly Trend
                  </h2>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip content={<GlassTooltip />} />
                      <Bar
                        dataKey="courses"
                        radius={[6, 6, 0, 0]}
                        fill="rgba(255,255,255,0.15)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Streak Heatmap */}
              <div className="rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white/40" />
                  <h2 className="text-sm font-semibold text-white/70">
                    7-Day Streak
                  </h2>
                </div>
                <div className="flex items-end justify-between gap-2 pt-2">
                  {streakDays.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`h-10 w-10 rounded-lg transition-colors ${
                          d.active
                            ? "bg-white/25 ring-1 ring-white/30"
                            : "bg-white/4 ring-1 ring-white/6"
                        }`}
                      />
                      <span className="text-[10px] text-white/30">
                        {d.day}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-white/50" />
                  <span className="text-sm text-white/50">
                    {streak > 0
                      ? `${streak} day streak — don't break it!`
                      : "Start your streak today!"}
                  </span>
                </div>
              </div>

              {/* Course Type Distribution */}
              <div className="lg:col-span-2 rounded-xl border border-white/6 bg-white/2 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-white/40" />
                  <h2 className="text-sm font-semibold text-white/70">
                    Course Type Distribution
                  </h2>
                </div>
                {typeData.length === 0 ? (
                  <p className="text-sm text-white/30 py-8 text-center">
                    No course data yet
                  </p>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={typeData}
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {typeData.map((_entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<GlassTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2">
                      {typeData.map((t, i) => (
                        <div key={t.name} className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="text-xs text-white/50">
                            {t.name}
                          </span>
                          <span className="text-xs font-medium text-white/70">
                            {t.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
