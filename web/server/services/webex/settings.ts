import { envBool } from "../mail/settings.js";
import { isWebexConnected } from "./tokenStore.js";

export function webexSettings() {
  const enabled = envBool("WEBEX_ENABLED");
  const configured = Boolean(
    process.env.WEBEX_CLIENT_ID?.trim() && process.env.WEBEX_CLIENT_SECRET?.trim(),
  );
  const connected = isWebexConnected();

  return {
    enabled,
    configured,
    connected,
    showOnPulse: enabled && configured && connected,
  };
}
