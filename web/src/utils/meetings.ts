export function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatGapMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

export function formatStartsIn(minutes: number, inProgress: boolean): string {
  if (inProgress) return "Now";
  if (minutes <= 0) return "Starting";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

export function meetingPhase(
  start: string,
  end: string,
  nowMs = Date.now(),
): "past" | "now" | "upcoming" {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (endMs <= nowMs) return "past";
  if (startMs <= nowMs) return "now";
  return "upcoming";
}
