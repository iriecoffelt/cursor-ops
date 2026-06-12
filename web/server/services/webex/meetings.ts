import type { WebexTodaySummary } from "../../types.js";
import { getWebexAccessToken } from "./oauth.js";
import { webexSettings } from "./settings.js";

const WEBEX_API = "https://webexapis.com/v1";
const MIN_GAP_MINUTES = 5;

type WebexApiMeeting = {
  id: string;
  title?: string;
  start?: string;
  end?: string;
  webLink?: string;
  state?: string;
  meetingType?: string;
};

function localDayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function isSchedulableMeeting(meeting: WebexApiMeeting): boolean {
  if (!meeting.start || !meeting.end || !meeting.title) return false;
  if (meeting.meetingType === "meetingSeries") return false;
  return meeting.meetingType === "scheduledMeeting" || meeting.meetingType === "meeting";
}

function dedupeMeetings(meetings: WebexApiMeeting[]): WebexApiMeeting[] {
  const byId = new Map<string, WebexApiMeeting>();
  for (const meeting of meetings) {
    if (!isSchedulableMeeting(meeting)) continue;
    const existing = byId.get(meeting.id);
    if (!existing) {
      byId.set(meeting.id, meeting);
      continue;
    }
    if (new Date(meeting.start!).getTime() < new Date(existing.start!).getTime()) {
      byId.set(meeting.id, meeting);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime(),
  );
}

function buildGaps(
  meetings: Array<{ id: string; title: string; start: string; end: string }>,
  nowMs: number,
) {
  const gaps: WebexTodaySummary["gaps"] = [];

  if (meetings.length > 0) {
    const firstStart = new Date(meetings[0].start).getTime();
    if (firstStart > nowMs) {
      const minutes = Math.round((firstStart - nowMs) / 60_000);
      if (minutes >= MIN_GAP_MINUTES) {
        gaps.push({
          afterTitle: "Now",
          beforeTitle: meetings[0].title,
          start: new Date(nowMs).toISOString(),
          end: meetings[0].start,
          minutes,
        });
      }
    }
  }

  for (let i = 0; i < meetings.length - 1; i += 1) {
    const endMs = new Date(meetings[i].end).getTime();
    const nextStartMs = new Date(meetings[i + 1].start).getTime();
    const minutes = Math.round((nextStartMs - endMs) / 60_000);
    if (minutes >= MIN_GAP_MINUTES) {
      gaps.push({
        afterTitle: meetings[i].title,
        beforeTitle: meetings[i + 1].title,
        start: meetings[i].end,
        end: meetings[i + 1].start,
        minutes,
      });
    }
  }

  return gaps;
}

export async function fetchWebexToday(): Promise<WebexTodaySummary | { warning: string }> {
  const settings = webexSettings();
  if (!settings.enabled || !settings.configured) {
    return { warning: "Webex not configured (WEBEX_ENABLED=true, WEBEX_CLIENT_ID, WEBEX_CLIENT_SECRET)" };
  }
  if (!settings.connected) {
    return { warning: "Webex not connected — sign in under Setup" };
  }

  let token: string;
  try {
    token = await getWebexAccessToken();
  } catch (err) {
    return { warning: err instanceof Error ? err.message : "Webex auth failed" };
  }
  const { from, to } = localDayBounds();
  const url = new URL(`${WEBEX_API}/meetings`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("max", "100");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return { warning: `Webex API error: ${res.status} ${body.slice(0, 120)}` };
  }

  const data = (await res.json()) as { items?: WebexApiMeeting[] };
  const nowMs = Date.now();
  const normalized = dedupeMeetings(data.items ?? []).map((meeting) => ({
    id: meeting.id,
    title: meeting.title!,
    start: meeting.start!,
    end: meeting.end!,
    webLink: meeting.webLink,
    state: meeting.state ?? "ready",
  }));

  const remaining = normalized.filter((meeting) => new Date(meeting.end).getTime() > nowMs);
  const nextRaw = remaining[0];
  let nextMeeting: WebexTodaySummary["nextMeeting"];

  if (nextRaw) {
    const startMs = new Date(nextRaw.start).getTime();
    const endMs = new Date(nextRaw.end).getTime();
    const inProgress = startMs <= nowMs && endMs > nowMs;
    nextMeeting = {
      id: nextRaw.id,
      title: nextRaw.title,
      start: nextRaw.start,
      end: nextRaw.end,
      webLink: nextRaw.webLink,
      startsInMinutes: inProgress ? 0 : Math.max(0, Math.round((startMs - nowMs) / 60_000)),
      inProgress,
    };
  }

  return {
    fetchedAt: new Date().toISOString(),
    meetings: normalized,
    nextMeeting,
    gaps: buildGaps(normalized, nowMs),
    remainingCount: remaining.length,
  };
}
