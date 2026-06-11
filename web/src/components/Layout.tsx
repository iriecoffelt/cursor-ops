import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEnvStatus } from "../context/EnvStatusContext";

export function Layout() {
  const { status } = useEnvStatus();
  const location = useLocation();
  const appTitle = status?.appTitle ?? "Cursor Ops";

  useEffect(() => {
    document.title = appTitle;
  }, [appTitle]);

  return (
    <>
      <div className="app-backdrop" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <div className="app-shell">
        <header className="top-nav glass-bar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <h1>{appTitle}</h1>
          </div>
          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
              Pulse
            </NavLink>
            {status?.jira ? (
              <NavLink to="/jira" className={({ isActive }) => (isActive ? "active" : undefined)}>
                Jira
              </NavLink>
            ) : null}
            {status?.notion ? (
              <NavLink to="/notion" className={({ isActive }) => (isActive ? "active" : undefined)}>
                Notion
              </NavLink>
            ) : null}
            {status?.github ? (
              <NavLink to="/github" className={({ isActive }) => (isActive ? "active" : undefined)}>
                GitHub
              </NavLink>
            ) : null}
            {status?.cursor ? (
              <NavLink to="/agents" className={({ isActive }) => (isActive ? "active" : undefined)}>
                Agents
              </NavLink>
            ) : null}
            <NavLink to="/env" className={({ isActive }) => (isActive ? "active" : undefined)}>
              Setup
            </NavLink>
          </nav>
        </header>

        <main className="page-content" key={location.pathname}>
          <Outlet />
        </main>

        <footer className="app-footer muted">
          <span className="footer-glow" aria-hidden="true" />
          Local command hub
          {status?.cursor ? (
            <>
              {" "}
              · <Link to="/agents">Launch agents</Link>
            </>
          ) : null}
        </footer>
      </div>
    </>
  );
}
