function parseApiErrorBody(text: string): { code?: number; message?: string; status?: string } {
  try {
    const json = JSON.parse(text) as { error?: { code?: number; message?: string; status?: string } };
    return json.error ?? {};
  } catch {
    return { message: text.slice(0, 200) };
  }
}

export function friendlyGoogleApiError(status: number, bodyText: string): string {
  const err = parseApiErrorBody(bodyText);
  const message = err.message ?? bodyText.slice(0, 160);

  if (status === 403 && /Gmail API has not been used|accessNotConfigured|API has not been enabled/i.test(message)) {
    const projectMatch = message.match(/project[:\s]+(\d+)/i);
    const project = projectMatch?.[1];
    const url = project
      ? `https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=${project}`
      : "https://console.cloud.google.com/apis/library/gmail.googleapis.com";
    return `Gmail API not enabled in Google Cloud — enable it here: ${url}`;
  }

  if (status === 403) {
    return "Gmail access denied — enable the Gmail API and verify OAuth scopes in Google Cloud Console";
  }

  if (status === 401) {
    return "Gmail session expired — disconnect and reconnect in Setup";
  }

  return `Gmail error (${status}): ${message.slice(0, 120)}`;
}
