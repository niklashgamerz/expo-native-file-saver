// NopeCHA API — free tier: no key needed, 100 solves/day (tracked by IP)
// Optional: add a key from nopecha.com for higher limits
// Docs: https://nopecha.com/api-reference/

const API_BASE = "https://api.nopecha.com";

// Discord's hCaptcha sitekey — same on every Discord page
export const DISCORD_HCAPTCHA_SITEKEY = "4c672d35-0701-42b2-88c3-78380b0db560";

export type NopeCHAStatus =
  | "idle"
  | "requesting"
  | "polling"
  | "solved"
  | "failed"
  | "rate_limited";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey && apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

/**
 * POST to NopeCHA to queue a new hCaptcha token solve job.
 * Returns the job ID string, or null on failure.
 */
async function postJob(
  sitekey: string,
  pageUrl: string,
  apiKey?: string
): Promise<string | null> {
  const res = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      type: "hcaptcha",
      sitekey,
      url: pageUrl,
    }),
  });

  if (res.status === 429) return "rate_limited";
  if (!res.ok) return null;

  const json = await res.json();
  // Success: { data: "JOB_ID" }
  if (json.data && typeof json.data === "string") return json.data;
  return null;
}

/**
 * GET poll the job until we get a token or timeout.
 * Returns the token string, or null.
 */
async function pollJob(
  jobId: string,
  apiKey?: string,
  maxWaitMs = 180_000
): Promise<string | null> {
  const params = new URLSearchParams({ id: jobId });
  const url = `${API_BASE}/token?${params}`;
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await sleep(2000);

    try {
      const res = await fetch(url, {
        headers: buildHeaders(apiKey),
      });

      if (res.status === 409) {
        // 409 = job still in progress — keep polling
        continue;
      }
      if (!res.ok) return null;

      const json = await res.json();
      // Success: { data: "P0_eyJ..." }
      if (json.data && typeof json.data === "string" && json.data.length > 20) {
        return json.data;
      }
    } catch {
      // network hiccup — keep trying
    }
  }
  return null;
}

/**
 * Full solve flow: POST job → poll → return hCaptcha bypass token.
 * Pass an optional apiKey for higher rate limits (free tier works without one).
 */
export async function solveHCaptchaFree(
  pageUrl: string,
  onStatus: (s: NopeCHAStatus, msg?: string) => void,
  apiKey?: string,
  sitekey = DISCORD_HCAPTCHA_SITEKEY
): Promise<string | null> {
  onStatus("requesting", "Submitting to NopeCHA...");

  let jobId: string | null;
  try {
    jobId = await postJob(sitekey, pageUrl, apiKey);
  } catch (err) {
    onStatus("failed", `Request failed: ${String(err)}`);
    return null;
  }

  if (jobId === "rate_limited") {
    onStatus("rate_limited", "Rate limited — wait or add a NopeCHA key");
    return null;
  }
  if (!jobId) {
    onStatus("failed", "NopeCHA rejected the request — check key or try again");
    return null;
  }

  onStatus("polling", "NopeCHA solving captcha...");

  let token: string | null;
  try {
    token = await pollJob(jobId, apiKey);
  } catch (err) {
    onStatus("failed", `Poll error: ${String(err)}`);
    return null;
  }

  if (!token) {
    onStatus("failed", "NopeCHA timed out");
    return null;
  }

  onStatus("solved", "Token received!");
  return token;
}

/**
 * JavaScript to inject into the WebView after receiving a token.
 * Sets the hCaptcha response and triggers the submit.
 */
export function buildTokenInjectionJS(token: string): string {
  const escaped = JSON.stringify(token);
  return `
(function(token) {
  // 1. Set the hidden response textareas (hCaptcha reads these server-side)
  document.querySelectorAll(
    'textarea[name="h-captcha-response"], textarea[name="g-recaptcha-response"]'
  ).forEach(function(el) {
    el.value = token;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // 2. Call any data-callback function registered on the hCaptcha widget container
  document.querySelectorAll('[data-sitekey]').forEach(function(container) {
    var cb = container.getAttribute('data-callback');
    if (cb && typeof window[cb] === 'function') {
      try { window[cb](token); } catch(e) {}
    }
  });

  // 3. Try hcaptcha global object methods
  try {
    if (window.hcaptcha && typeof window.hcaptcha === 'object') {
      var widgets = document.querySelectorAll('[data-hcaptcha-widget-id]');
      widgets.forEach(function(w) {
        var id = w.getAttribute('data-hcaptcha-widget-id');
        if (id) {
          try { window.hcaptcha.setResponse && window.hcaptcha.setResponse(id, token); } catch(e) {}
        }
      });
    }
  } catch(e) {}

  // 4. Brief delay then click submit (give React state time to update)
  setTimeout(function() {
    var btn = document.querySelector('button[type="submit"]');
    if (btn) { btn.click(); return; }
    // fallback: find Continue / Register button by text
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || '').toLowerCase();
      if (t.includes('continue') || t.includes('register') || t.includes('create')) {
        btns[i].click(); break;
      }
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'status', message: 'Token injected — submitted' }));
  }, 600);
})(${escaped});
true;
`;
}
