import type { TaskItem } from "../../server/types";

export const FOCUS_MAX = 5;
const STORAGE_KEY = "pulse-focus-today";

export type FocusPin = {
  source: TaskItem["source"];
  id: string;
  sourceLabel?: string;
  title: string;
  url?: string;
  due?: string;
  status?: string;
};

type FocusDay = {
  date: string;
  pins: FocusPin[];
};

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function taskPinKey(item: Pick<TaskItem, "source" | "id">): string {
  return `${item.source}:${item.id}`;
}

export function focusPinFromTask(item: TaskItem): FocusPin {
  return {
    source: item.source,
    id: item.id,
    sourceLabel: item.sourceLabel,
    title: item.title,
    url: item.url,
    due: item.due,
    status: item.status,
  };
}

function readFocusDay(): FocusDay {
  const today = localDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: today, pins: [] };
    const parsed = JSON.parse(raw) as FocusDay;
    if (parsed.date !== today || !Array.isArray(parsed.pins)) {
      return { date: today, pins: [] };
    }
    return { date: today, pins: parsed.pins.slice(0, FOCUS_MAX) };
  } catch {
    return { date: today, pins: [] };
  }
}

function writeFocusDay(day: FocusDay): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(day));
}

export function loadFocusPins(): FocusPin[] {
  return readFocusDay().pins;
}

export function saveFocusPins(pins: FocusPin[]): FocusPin[] {
  const trimmed = pins.slice(0, FOCUS_MAX);
  writeFocusDay({ date: localDateKey(), pins: trimmed });
  return trimmed;
}

export type PinResult = { ok: true } | { ok: false; reason: "full" | "duplicate" };

export function pinTaskInStorage(item: TaskItem, current: FocusPin[]): PinResult {
  const key = taskPinKey(item);
  if (current.some((pin) => taskPinKey(pin) === key)) {
    return { ok: false, reason: "duplicate" };
  }
  if (current.length >= FOCUS_MAX) {
    return { ok: false, reason: "full" };
  }
  saveFocusPins([...current, focusPinFromTask(item)]);
  return { ok: true };
}

export function unpinTaskInStorage(item: Pick<TaskItem, "source" | "id">, current: FocusPin[]): void {
  const key = taskPinKey(item);
  saveFocusPins(current.filter((pin) => taskPinKey(pin) !== key));
}

export function mergePinWithTask(pin: FocusPin, live?: TaskItem): TaskItem {
  if (live) return live;
  return {
    id: pin.id,
    title: pin.title,
    source: pin.source,
    sourceLabel: pin.sourceLabel,
    status: pin.status,
    url: pin.url,
    due: pin.due,
  };
}

export function collectDashboardTasks(data: DashboardTaskBuckets): TaskItem[] {
  const seen = new Set<string>();
  const out: TaskItem[] = [];
  for (const list of [data.blockers, data.dueToday, data.dueThisWeek, data.waitingOnMe]) {
    for (const item of list) {
      const key = taskPinKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export type DashboardTaskBuckets = {
  blockers: TaskItem[];
  dueToday: TaskItem[];
  dueThisWeek: TaskItem[];
  waitingOnMe: TaskItem[];
};

export function resolveFocusPins(
  pins: FocusPin[],
  liveTasks: TaskItem[],
): Array<{ pin: FocusPin; live?: TaskItem; missing: boolean }> {
  const liveByKey = new Map(liveTasks.map((task) => [taskPinKey(task), task]));
  return pins.map((pin) => {
    const live = liveByKey.get(taskPinKey(pin));
    return { pin, live, missing: !live };
  });
}
