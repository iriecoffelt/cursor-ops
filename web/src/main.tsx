import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./components/AppRoutes";
import { EnvStatusProvider } from "./context/EnvStatusContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <EnvStatusProvider>
        <AppRoutes />
      </EnvStatusProvider>
    </BrowserRouter>
  </StrictMode>,
);
