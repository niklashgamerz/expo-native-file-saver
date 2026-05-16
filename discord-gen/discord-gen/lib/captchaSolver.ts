/**
 * Combined NopeCHA + expo-pilot captcha solver.
 *
 * NopeCHA  → AI recognition: which tiles are correct (the "brain")
 * expo-pilot → physical UI automation: actually tap those tiles (the "hands")
 *
 * Flow:
 *  1. expo-pilot taps the hCaptcha checkbox to trigger the challenge
 *  2. expo-pilot.screenshot() captures the full screen
 *  3. expo-pilot.dumpScreen() gives us tile positions + prompt text
 *  4. Each tile is cropped from the screenshot via expo-image-manipulator
 *  5. Tile images + prompt → NopeCHA recognition API → which tiles are correct
 *  6. expo-pilot.tap() physically taps each correct tile
 *  7. expo-pilot taps the Verify button
 *  8. If recognition fails/tiles not found → fall back to NopeCHA token API + JS injection
 */

import * as ImageManipulator from "expo-image-manipulator";
import {
  dumpScreen,
  findElements,
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  screenshot,
  tap,
  tapElement,
  waitForElement,
} from "./pilot";
import type { FoundElement } from "./pilot";

import { buildTokenInjectionJS, solveHCaptchaFree, DISCORD_HCAPTCHA_SITEKEY } from "./nopecha";

const NOPECHA_BASE = "https://api.nopecha.com";
const DISCORD_REGISTER_URL = "https://discord.com/register";

export type SolverStatus =
  | "idle"
  | "checking_service"
  | "tapping_checkbox"
  | "waiting_for_challenge"
  | "screenshotting"
  | "finding_tiles"
  | "recognizing"
  | "tapping_tiles"
  | "verifying"
  | "solved"
  | "fallback_token"
  | "failed"
  | "rate_limited"
  | "service_disabled";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── NopeCHA recognition API ────────────────────────────────────────────────

/**
 * Send cropped tile images + challenge prompt to NopeCHA recognition API.
 * Returns a boolean[] — true means that tile index should be clicked.
 */
async function recognizeTiles(
  tileBase64s: string[],
  prompt: string,
  apiKey?: string
): Promise<boolean[] | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  // POST to queue the job
  let res = await fetch(`${NOPECHA_BASE}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "hcaptcha",
      task: prompt,
      image_data: tileBase64s, // base64 PNG/JPEG strings for each tile
    }),
  });
  if (!res.ok) return null;
  let json = await res.json();
  if (!json.data) return null;

  const jobId = String(json.data);
  const pollUrl = `${NOPECHA_BASE}?id=${encodeURIComponent(jobId)}`;
  const start = Date.now();

  // Poll until done (max 60 s)
  while (Date.now() - start < 60_000) {
    await sleep(2000);
    res = await fetch(pollUrl, { headers });
    if (!res.ok) continue;
    json = await res.json();

    // 409 = still in progress
    if (res.status === 409) continue;

    // Expect { data: [bool, bool, ...] }
    if (Array.isArray(json.data)) {
      return json.data as boolean[];
    }
  }
  return null;
}

// ─── Image cropping ──────────────────────────────────────────────────────────

async function cropTileFromScreenshot(
  screenshotBase64: string,
  bounds: { left: number; top: number; right: number; bottom: number }
): Promise<string | null> {
  try {
    const uri = `data:image/png;base64,${screenshotBase64}`;
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    if (width <= 0 || height <= 0) return null;

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX: bounds.left,
            originY: bounds.top,
            width,
            height,
          },
        },
      ],
      { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.85 }
    );
    return result.base64 ?? null;
  } catch {
    return null;
  }
}

// ─── Accessibility helpers ──────────────────────────────────────────────────

export async function checkAccessibilityService(): Promise<boolean> {
  try {
    return await isAccessibilityServiceEnabled();
  } catch {
    return false;
  }
}

export async function requestAccessibilityService(): Promise<void> {
  try {
    await openAccessibilitySettings();
  } catch {}
}

/**
 * Find the hCaptcha challenge prompt text from the accessibility tree.
 * hCaptcha displays the challenge description as visible text on screen.
 */
function extractPromptFromElements(elements: FoundElement[]): string {
  const challengeKeywords = [
    "select all",
    "click all",
    "click on",
    "select images",
    "please click",
    "click each",
  ];
  for (const el of elements) {
    const t = (el.text ?? "").toLowerCase();
    if (challengeKeywords.some((kw) => t.includes(kw))) {
      // Extract the object keyword (e.g. "bicycle" from "select all images with a bicycle")
      const match = el.text.match(/(?:with|containing|of|showing)\s+(?:a\s+)?(\w+)/i);
      return match ? match[1].toLowerCase() : el.text.trim();
    }
  }
  return ""; // unknown prompt
}

/**
 * Find the captcha image tiles in the accessibility tree.
 * hCaptcha tiles are rendered as clickable image elements in a grid.
 */
function findCaptchaTileElements(elements: FoundElement[]): FoundElement[] {
  const candidates = elements.filter(
    (el) =>
      el.isClickable &&
      !el.isEditable &&
      !el.isScrollable &&
      el.bounds.right - el.bounds.left > 50 && // min tile size
      el.bounds.bottom - el.bounds.top > 50 &&
      // tile images usually have no text or a short description
      (el.text === "" || el.text === null || el.description?.includes("image"))
  );

  if (candidates.length >= 4) {
    // Sort by position (top→bottom, left→right) for correct tile ordering
    candidates.sort(
      (a, b) =>
        a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left
    );
  }
  return candidates;
}

// ─── Main solver ─────────────────────────────────────────────────────────────

export async function solveCaptcha(
  onStatus: (s: SolverStatus, msg?: string) => void,
  injectTokenToWebView: (js: string) => void,
  apiKey?: string
): Promise<boolean> {
  // ── 1. Check accessibility service ──
  onStatus("checking_service");
  const hasService = await checkAccessibilityService();
  if (!hasService) {
    onStatus("service_disabled", "Enable ExpoPilot in Accessibility Settings first");
    return false;
  }

  // ── 2. Tap the hCaptcha checkbox to trigger the challenge ──
  onStatus("tapping_checkbox", "Tapping hCaptcha checkbox...");
  const checkboxQueries = [
    { description: "hCaptcha" },
    { description: "checkbox" },
    { text: "I am human" },
    { className: "android.widget.CheckBox" },
  ];
  let tappedCheckbox = false;
  for (const q of checkboxQueries) {
    try {
      await tapElement(q);
      tappedCheckbox = true;
      break;
    } catch {}
  }
  if (!tappedCheckbox) {
    // Might already be open — continue anyway
  }

  await sleep(2500);

  // ── 3. Wait for challenge to appear ──
  onStatus("waiting_for_challenge", "Waiting for challenge to load...");
  await sleep(1500);

  // ── 4. Screenshot + accessibility tree ──
  onStatus("screenshotting", "Capturing screen...");
  const [screenshotResult, allElements] = await Promise.all([
    screenshot(),
    dumpScreen(),
  ]);

  // ── 5. Find tiles + prompt ──
  onStatus("finding_tiles", "Locating captcha tiles...");
  const prompt = extractPromptFromElements(allElements);
  const tileElements = findCaptchaTileElements(allElements);

  // If we can see at least 4 tiles → use recognition API + physical taps
  if (tileElements.length >= 4 && screenshotResult.base64) {
    onStatus("recognizing", `Sending ${tileElements.length} tiles to NopeCHA...`);

    // Crop each tile from the screenshot
    const tileImages: string[] = [];
    for (const tile of tileElements) {
      const cropped = await cropTileFromScreenshot(
        screenshotResult.base64,
        tile.bounds
      );
      if (cropped) tileImages.push(cropped);
    }

    if (tileImages.length >= 4) {
      const solution = await recognizeTiles(tileImages, prompt, apiKey);

      if (solution) {
        // ── 6. expo-pilot physically taps correct tiles ──
        onStatus("tapping_tiles", "Tapping correct tiles...");
        for (let i = 0; i < tileElements.length && i < solution.length; i++) {
          if (solution[i]) {
            await tap({ x: tileElements[i].centerX, y: tileElements[i].centerY });
            await sleep(350 + Math.random() * 200); // humanize timing
          }
        }

        await sleep(700);

        // ── 7. expo-pilot taps Verify ──
        onStatus("verifying", "Tapping Verify...");
        const verifyQueries = [
          { text: "Verify" },
          { text: "Submit" },
          { description: "verify" },
          { description: "submit" },
        ];
        for (const q of verifyQueries) {
          try {
            await tapElement(q);
            break;
          } catch {}
        }
        await sleep(1500);
        onStatus("solved", "Solved via image recognition + physical taps!");
        return true;
      }
    }
  }

  // ── Fallback: NopeCHA token API + JS injection ──
  onStatus(
    "fallback_token",
    tileElements.length < 4
      ? "Tiles not in accessibility tree — using token API fallback..."
      : "Recognition failed — using token API fallback..."
  );

  const token = await solveHCaptchaFree(
    DISCORD_REGISTER_URL,
    (status, msg) => {
      if (status === "rate_limited") onStatus("rate_limited", msg);
      else if (status === "failed") onStatus("failed", msg);
      else onStatus("fallback_token", msg);
    },
    apiKey,
    DISCORD_HCAPTCHA_SITEKEY
  );

  if (!token) {
    onStatus("failed", "Both recognition and token API failed");
    return false;
  }

  // Inject token via JS (required for cross-origin iframe)
  injectTokenToWebView(buildTokenInjectionJS(token));

  // After token injection, use expo-pilot to tap the Discord submit button
  await sleep(800);
  onStatus("verifying", "Token injected — tapping submit...");
  try {
    const submitQueries = [
      { text: "Continue" },
      { text: "Register" },
      { text: "Create Account" },
      { description: "submit" },
    ];
    for (const q of submitQueries) {
      try {
        await tapElement(q);
        break;
      } catch {}
    }
  } catch {}

  onStatus("solved", "Solved via token API + expo-pilot submit tap!");
  return true;
}

export const STATUS_MESSAGES: Record<SolverStatus, string> = {
  idle: "Ready",
  checking_service: "Checking accessibility service...",
  tapping_checkbox: "Tapping captcha checkbox...",
  waiting_for_challenge: "Waiting for challenge...",
  screenshotting: "Capturing screen...",
  finding_tiles: "Finding captcha tiles...",
  recognizing: "NopeCHA AI solving...",
  tapping_tiles: "Tapping correct tiles...",
  verifying: "Tapping Verify...",
  solved: "Captcha solved!",
  fallback_token: "Using token API...",
  failed: "Auto-solve failed — solve manually",
  rate_limited: "Rate limited — solve manually or add NopeCHA key",
  service_disabled: "Enable Accessibility Service first",
};
