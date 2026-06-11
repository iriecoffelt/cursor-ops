import { useId, useState, type ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
  className = "panel",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={`${className} collapsible-section${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="collapsible-section-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="collapsible-section-chevron" aria-hidden="true" />
        <span className="collapsible-section-title">{title}</span>
        {badge ? <span className="collapsible-section-badge">{badge}</span> : null}
      </button>
      {open ? (
        <div className="collapsible-section-body" id={contentId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
