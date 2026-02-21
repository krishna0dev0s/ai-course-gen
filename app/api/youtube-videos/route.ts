import { NextRequest, NextResponse } from "next/server";

type ChapterInput = {
  chapterId?: string;
  chapterTitle?: string;
  subContent?: string[];
};

type YoutubeVideoResult = {
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

type CachedVideoEntry = {
  expiresAt: number;
  value: YoutubeVideoResult;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const youtubeVideoCache = new Map<string, CachedVideoEntry>();

function buildQuery(courseName: string, chapter: ChapterInput) {
  const chapterTitle = chapter.chapterTitle ?? "";
  const topics = (chapter.subContent ?? []).slice(0, 3).join(" ");
  return `"${chapterTitle}" ${topics} explained tutorial`.trim();
}

function buildFallbackQuery(chapter: ChapterInput) {
  const chapterTitle = chapter.chapterTitle ?? "";
  const topics = (chapter.subContent ?? []).slice(0, 2).join(" ");
  return `${chapterTitle} ${topics} tutorial for beginners`.trim();
}

function chapterIdentity(index: number, chapter: ChapterInput) {
  return chapter.chapterId ?? `${chapter.chapterTitle ?? "chapter"}-${index}`;
}

function getCachedVideo(cacheKey: string) {
  const entry = youtubeVideoCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    youtubeVideoCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function setCachedVideo(cacheKey: string, value: YoutubeVideoResult) {
  youtubeVideoCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
}

function extractKeywords(chapter: ChapterInput) {
  const rawText = `${chapter.chapterTitle ?? ""} ${(chapter.subContent ?? []).join(" ")}`.toLowerCase();
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "for",
    "to",
    "of",
    "in",
    "with",
    "on",
    "by",
    "from",
    "using",
    "use",
    "understanding",
    "introduction",
    "basics",
  ]);

  return Array.from(
    new Set(
      rawText
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word))
    )
  );
}

function scoreCandidate(chapter: ChapterInput, title?: string, description?: string) {
  const normalizedTitle = (title ?? "").toLowerCase();
  const normalizedDescription = (description ?? "").toLowerCase();
  const searchableText = `${normalizedTitle} ${normalizedDescription}`;
  const keywords = extractKeywords(chapter);

  let score = 0;
  for (const keyword of keywords) {
    if (normalizedTitle.includes(keyword)) score += 4;
    else if (normalizedDescription.includes(keyword)) score += 2;
  }

  const chapterTitle = (chapter.chapterTitle ?? "").toLowerCase().trim();
  if (chapterTitle && normalizedTitle.includes(chapterTitle)) score += 8;

  if (searchableText.includes("full course")) score -= 8;
  if (searchableText.includes("complete course")) score -= 6;
  if (searchableText.includes("roadmap")) score -= 4;
  if (searchableText.includes("shorts")) score -= 8;

  if (searchableText.includes("explained")) score += 2;
  if (searchableText.includes("tutorial")) score += 2;

  return score;
}

async function searchYouTubeVideos(query: string, youtubeApiKey: string, videoDuration: "medium" | "long") {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "6",
    q: query,
    order: "relevance",
    videoDuration,
    key: youtubeApiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const reason = parseYouTubeApiError(response.status, errorBody);
    return { ok: false, items: [] as any[], reason };
  }

  const data = await response.json();
  return { ok: true, items: Array.isArray(data?.items) ? data.items : [], reason: null };
}

function parseYouTubeApiError(status: number, body: any): string | null {
  const errors = Array.isArray(body?.error?.errors) ? body.error.errors : [];
  const firstReason = errors[0]?.reason ?? "";
  const message = body?.error?.message ?? "";

  if (status === 403) {
    if (firstReason === "quotaExceeded" || message.includes("quota")) {
      return "QUOTA_EXCEEDED";
    }
    if (firstReason === "forbidden" || firstReason === "accessNotConfigured") {
      return "API_NOT_ENABLED";
    }
    return "FORBIDDEN";
  }
  if (status === 400 && (firstReason === "keyInvalid" || message.includes("API key"))) {
    return "INVALID_KEY";
  }
  if (status === 401) {
    return "INVALID_KEY";
  }
  return "UNKNOWN";
}

async function fetchEmbeddableVideoIds(videoIds: string[], youtubeApiKey: string) {
  if (videoIds.length === 0) {
    return new Set<string>();
  }

  const uniqueIds = Array.from(new Set(videoIds.filter(Boolean))).slice(0, 25);
  if (uniqueIds.length === 0) {
    return new Set<string>();
  }

  const params = new URLSearchParams({
    part: "status",
    id: uniqueIds.join(","),
    key: youtubeApiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return new Set<string>();
  }

  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  const embeddableIds = new Set<string>();

  for (const item of items) {
    const id = item?.id;
    if (typeof id === "string" && item?.status?.embeddable) {
      embeddableIds.add(id);
    }
  }

  return embeddableIds;
}

export async function POST(req: NextRequest) {
  try {
    const { courseName, chapters, forceRefresh } = (await req.json()) as {
      courseName?: string;
      chapters?: ChapterInput[];
      forceRefresh?: boolean;
    };

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: "chapters are required" }, { status: 400 });
    }

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY is not configured" }, { status: 500 });
    }

    const fallbackCourseName = courseName?.trim() || "course";
    const videos: YoutubeVideoResult[] = [];
    let apiWarning: string | null = null;

    for (let index = 0; index < chapters.length; index++) {
      const chapter = chapters[index];
      const chapterKey = chapterIdentity(index, chapter);
      const query = buildQuery(fallbackCourseName, chapter);
      const fallbackQuery = buildFallbackQuery(chapter);
      const cacheKey = `${fallbackCourseName}::${query}`;

      const cachedVideo = forceRefresh ? null : getCachedVideo(cacheKey);
      if (cachedVideo && !forceRefresh) {
        videos.push({
          ...cachedVideo,
          chapterId: chapterKey,
          chapterTitle: chapter.chapterTitle ?? `Chapter ${index + 1}`,
        });
        continue;
      }

      const mediumSearch = await searchYouTubeVideos(query, youtubeApiKey, "medium");

      // Surface quota/key errors immediately
      if (!mediumSearch.ok && mediumSearch.reason) {
        apiWarning = apiWarning ?? mediumSearch.reason;
        if (mediumSearch.reason === "QUOTA_EXCEEDED" || mediumSearch.reason === "INVALID_KEY" || mediumSearch.reason === "API_NOT_ENABLED") {
          // No point continuing; every subsequent call will also fail
          const emptyResult: YoutubeVideoResult = {
            chapterId: chapterKey,
            chapterTitle: chapter.chapterTitle ?? `Chapter ${index + 1}`,
            videoId: null, title: null, description: null, thumbnailUrl: null,
            channelTitle: null, publishedAt: null, watchUrl: null, embedUrl: null,
          };
          videos.push(emptyResult);
          continue;
        }
      }

      const longSearch = mediumSearch.items.length > 0
        ? { ok: true, items: [] as any[], reason: null }
        : await searchYouTubeVideos(query, youtubeApiKey, "long");
      const fallbackSearch = mediumSearch.items.length > 0 || longSearch.items.length > 0
        ? { ok: true, items: [] as any[], reason: null }
        : await searchYouTubeVideos(fallbackQuery, youtubeApiKey, "medium");

      const candidateItems = [...mediumSearch.items, ...longSearch.items, ...fallbackSearch.items];

      if (candidateItems.length === 0) {
        const emptyResult: YoutubeVideoResult = {
          chapterId: chapterKey,
          chapterTitle: chapter.chapterTitle ?? `Chapter ${index + 1}`,
          videoId: null,
          title: null,
          description: null,
          thumbnailUrl: null,
          channelTitle: null,
          publishedAt: null,
          watchUrl: null,
          embedUrl: null,
        };
        videos.push(emptyResult);
        setCachedVideo(cacheKey, emptyResult);
        continue;
      }

      const sortedCandidates = candidateItems
        .filter((item: any) => item?.id?.videoId)
        .sort(
          (a: any, b: any) =>
            scoreCandidate(chapter, b?.snippet?.title, b?.snippet?.description) -
            scoreCandidate(chapter, a?.snippet?.title, a?.snippet?.description)
        );

      const candidateVideoIds = sortedCandidates
        .map((item: any) => item?.id?.videoId)
        .filter((id: string | undefined): id is string => Boolean(id));

      const embeddableIds = await fetchEmbeddableVideoIds(candidateVideoIds, youtubeApiKey);
      const embeddableCandidate = sortedCandidates.find((item: any) => {
        const candidateVideoId = item?.id?.videoId;
        return typeof candidateVideoId === "string" && embeddableIds.has(candidateVideoId);
      });

      const item = embeddableCandidate ?? sortedCandidates[0] ?? candidateItems[0];
      const videoId = item?.id?.videoId ?? null;
      const snippet = item?.snippet;
      const hasEmbeddableUrl = typeof videoId === "string" && embeddableIds.has(videoId);

      const mappedResult: YoutubeVideoResult = {
        chapterId: chapterKey,
        chapterTitle: chapter.chapterTitle ?? `Chapter ${index + 1}`,
        videoId,
        title: snippet?.title ?? null,
        description: snippet?.description ?? null,
        thumbnailUrl:
          snippet?.thumbnails?.high?.url ??
          snippet?.thumbnails?.medium?.url ??
          snippet?.thumbnails?.default?.url ??
          null,
        channelTitle: snippet?.channelTitle ?? null,
        publishedAt: snippet?.publishedAt ?? null,
        watchUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
        embedUrl: hasEmbeddableUrl ? `https://www.youtube.com/embed/${videoId}` : null,
      };

      videos.push(mappedResult);
      setCachedVideo(cacheKey, mappedResult);
    }

    return NextResponse.json({ videos, ...(apiWarning ? { warning: apiWarning } : {}) });
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return NextResponse.json({ error: "Failed to fetch YouTube videos" }, { status: 500 });
  }
}
