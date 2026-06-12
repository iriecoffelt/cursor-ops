import { useState, type FormEvent } from "react";
import type { TaskItem } from "../../server/types";
import { addJiraComment, setNotionStatus } from "../api";

type TaskQuickActionsProps = {
  item: TaskItem;
  onUpdated?: () => void;
};

function isInProgressStatus(status?: string): boolean {
  if (!status) return false;
  return /in\s*progress|doing|started|active|working/i.test(status);
}

export function TaskQuickActions({ item, onUpdated }: TaskQuickActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [posted, setPosted] = useState(false);

  if (item.source === "notion") {
    const inProgress = isInProgressStatus(item.status);

    async function handleStart() {
      setBusy(true);
      setError(null);
      try {
        await setNotionStatus(item.id);
        onUpdated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update Notion status");
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="task-quick-actions">
        <button
          type="button"
          className="task-action-btn"
          disabled={busy || inProgress}
          onClick={() => void handleStart()}
        >
          {busy ? "Updating…" : inProgress ? "In progress" : "Mark in progress"}
        </button>
        {error ? <span className="task-action-error">{error}</span> : null}
      </div>
    );
  }

  if (item.source === "jira") {
    async function handleComment(event: FormEvent) {
      event.preventDefault();
      if (!comment.trim()) return;
      setBusy(true);
      setError(null);
      try {
        await addJiraComment(item.id, comment);
        setComment("");
        setCommentOpen(false);
        setPosted(true);
        window.setTimeout(() => setPosted(false), 2500);
        onUpdated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to post Jira comment");
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="task-quick-actions">
        {!commentOpen ? (
          <>
            <button type="button" className="task-action-btn" onClick={() => setCommentOpen(true)}>
              Add comment
            </button>
            {posted ? <span className="task-action-success">Comment posted</span> : null}
          </>
        ) : (
          <form className="task-comment-form" onSubmit={(event) => void handleComment(event)}>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Quick update for the ticket…"
              rows={2}
              disabled={busy}
              autoFocus
            />
            <div className="task-comment-actions">
              <button type="submit" className="task-action-btn primary" disabled={busy || !comment.trim()}>
                {busy ? "Posting…" : "Post"}
              </button>
              <button
                type="button"
                className="task-action-btn"
                disabled={busy}
                onClick={() => {
                  setCommentOpen(false);
                  setComment("");
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {error ? <span className="task-action-error">{error}</span> : null}
      </div>
    );
  }

  return null;
}
