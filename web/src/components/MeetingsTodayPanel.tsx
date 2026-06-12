import type { WebexTodaySummary } from "../../server/types";
import {
  formatGapMinutes,
  formatMeetingTime,
  formatStartsIn,
  meetingPhase,
} from "../utils/meetings";

type MeetingsTodayPanelProps = {
  webex?: WebexTodaySummary;
  dueTodayCount?: number;
};

function gapBeforeMeeting(
  gaps: WebexTodaySummary["gaps"],
  meetingTitle: string,
  meetingStart: string,
) {
  return gaps.find((gap) => gap.beforeTitle === meetingTitle && gap.end === meetingStart);
}

export function MeetingsTodayPanel({ webex, dueTodayCount = 0 }: MeetingsTodayPanelProps) {
  if (!webex) return null;

  const { meetings, nextMeeting, gaps, remainingCount } = webex;
  const nowMs = Date.now();

  return (
    <section className="panel meetings-today-panel">
      <div className="meetings-today-header">
        <div>
          <h3>Today&apos;s meetings</h3>
          <p className="muted">
            Webex · {meetings.length} scheduled
            {dueTodayCount > 0 ? ` · ${dueTodayCount} due today` : ""}
          </p>
        </div>
        {nextMeeting ? (
          <div className="meetings-next-chip">
            <span className="meetings-next-label">
              {nextMeeting.inProgress ? "In progress" : `Starts in ${formatStartsIn(nextMeeting.startsInMinutes, false)}`}
            </span>
            {nextMeeting.webLink ? (
              <a className="button primary meetings-join-btn" href={nextMeeting.webLink} target="_blank" rel="noreferrer">
                Join
              </a>
            ) : null}
          </div>
        ) : (
          <span className="meetings-next-chip meetings-next-clear">Calendar clear</span>
        )}
      </div>

      {!meetings.length ? (
        <p className="empty">No Webex meetings on today&apos;s calendar.</p>
      ) : (
        <ol className="meetings-timeline">
          {meetings.map((meeting) => {
            const phase = meetingPhase(meeting.start, meeting.end, nowMs);
            const isNext = nextMeeting?.id === meeting.id;
            const gap = gapBeforeMeeting(gaps, meeting.title, meeting.start);

            return (
              <li key={meeting.id}>
                {gap ? (
                  <div className="meetings-gap">
                    <span>{formatGapMinutes(gap.minutes)} free</span>
                    {gap.afterTitle === "Now" ? (
                      <span className="muted">until {formatMeetingTime(meeting.start)}</span>
                    ) : (
                      <span className="muted">
                        {formatMeetingTime(gap.start)}–{formatMeetingTime(gap.end)}
                      </span>
                    )}
                  </div>
                ) : null}
                <div
                  className={[
                    "meetings-item",
                    phase === "past" ? "is-past" : "",
                    phase === "now" ? "is-now" : "",
                    isNext ? "is-next" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="meetings-time">{formatMeetingTime(meeting.start)}</div>
                  <div className="meetings-body">
                    <div className="meetings-title">{meeting.title}</div>
                    <div className="meetings-meta muted">
                      {formatMeetingTime(meeting.start)}–{formatMeetingTime(meeting.end)}
                      {phase === "now" ? " · In progress" : ""}
                      {phase === "past" ? " · Ended" : ""}
                    </div>
                  </div>
                  {meeting.webLink && phase !== "past" ? (
                    <a className="meetings-join-link" href={meeting.webLink} target="_blank" rel="noreferrer">
                      Join
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {dueTodayCount > 0 && remainingCount > 0 ? (
        <p className="muted meetings-footnote">
          {remainingCount} meeting{remainingCount === 1 ? "" : "s"} left today with {dueTodayCount} task
          {dueTodayCount === 1 ? "" : "s"} due — check the gaps above.
        </p>
      ) : null}
    </section>
  );
}
