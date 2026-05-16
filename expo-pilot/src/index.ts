import ExpoPilotModule from './ExpoPilotModule';
import type {
  TapOptions, SwipeOptions, ElementQuery, TypeTextOptions,
  ScrollOptions, ScreenshotResult, AccessibilityServiceStatus,
  FoundElement, PilotEventPayload,
} from './ExpoPilot.types';

export type {
  TapOptions, SwipeOptions, ElementQuery, TypeTextOptions,
  ScrollOptions, ScreenshotResult, AccessibilityServiceStatus,
  FoundElement, PilotEventPayload,
};

export type PilotSubscription = { remove: () => void };

// ---------------------------------------------------------------------------
// Service setup
// ---------------------------------------------------------------------------

/** Check if the ExpoPilot accessibility service is enabled */
export async function isAccessibilityServiceEnabled(): Promise<boolean> {
  return ExpoPilotModule.isAccessibilityServiceEnabled();
}

/** Open Android Accessibility Settings so user can enable the service */
export async function openAccessibilitySettings(): Promise<boolean> {
  return ExpoPilotModule.openAccessibilitySettings();
}

/** Get full service status info */
export async function getServiceStatus(): Promise<AccessibilityServiceStatus> {
  return ExpoPilotModule.getServiceStatus();
}

// ---------------------------------------------------------------------------
// Gestures
// ---------------------------------------------------------------------------

/** Tap at screen coordinates */
export async function tap(options: TapOptions): Promise<{ success: boolean; x: number; y: number }> {
  return ExpoPilotModule.tap(options);
}

/** Swipe from one point to another */
export async function swipe(options: SwipeOptions): Promise<{ success: boolean }> {
  return ExpoPilotModule.swipe(options);
}

/** Scroll in a direction */
export async function scroll(options: ScrollOptions): Promise<{ success: boolean }> {
  return ExpoPilotModule.scroll(options);
}

// ---------------------------------------------------------------------------
// Element interaction
// ---------------------------------------------------------------------------

/** Find a single element on screen matching the query */
export async function findElement(query: ElementQuery): Promise<FoundElement> {
  return ExpoPilotModule.findElement(query);
}

/** Find all elements matching the query */
export async function findElements(query: ElementQuery): Promise<FoundElement[]> {
  return ExpoPilotModule.findElements(query);
}

/** Find an element and tap it in one call */
export async function tapElement(query: ElementQuery): Promise<{ success: boolean; element: FoundElement }> {
  return ExpoPilotModule.tapElement(query);
}

/** Find an element and type text into it */
export async function typeText(query: ElementQuery, options: TypeTextOptions): Promise<{ success: boolean }> {
  return ExpoPilotModule.typeText(query, options);
}

/** Type text into whatever input is currently focused */
export async function typeIntoFocused(options: TypeTextOptions): Promise<{ success: boolean }> {
  return ExpoPilotModule.typeIntoFocused(options);
}

/** Wait for an element to appear, polling until timeout */
export async function waitForElement(query: ElementQuery, timeoutMs: number = 5000): Promise<FoundElement> {
  return ExpoPilotModule.waitForElement(query, timeoutMs);
}

/** Get the full accessibility tree of what's on screen */
export async function dumpScreen(): Promise<FoundElement[]> {
  return ExpoPilotModule.dumpScreen();
}

/** Get the package name of the currently active app */
export async function getCurrentApp(): Promise<{ packageName: string; className: string }> {
  return ExpoPilotModule.getCurrentApp();
}

// ---------------------------------------------------------------------------
// System actions
// ---------------------------------------------------------------------------

/** Take a screenshot — returns base64 PNG (Android 11+) */
export async function screenshot(): Promise<ScreenshotResult> {
  return ExpoPilotModule.screenshot();
}

/** Press the back button */
export async function pressBack(): Promise<boolean> {
  return ExpoPilotModule.pressBack();
}

/** Press the home button */
export async function pressHome(): Promise<boolean> {
  return ExpoPilotModule.pressHome();
}

/** Open recents/app switcher */
export async function pressRecents(): Promise<boolean> {
  return ExpoPilotModule.pressRecents();
}

/** Pull down notifications */
export async function openNotifications(): Promise<boolean> {
  return ExpoPilotModule.openNotifications();
}

/** Open quick settings */
export async function openQuickSettings(): Promise<boolean> {
  return ExpoPilotModule.openQuickSettings();
}

/** Lock the screen */
export async function lockScreen(): Promise<boolean> {
  return ExpoPilotModule.lockScreen();
}

/** Launch an app by package name */
export async function launchApp(packageName: string): Promise<{ success: boolean; packageName: string }> {
  return ExpoPilotModule.launchApp(packageName);
}

/** Get screen dimensions and density */
export async function getScreenSize(): Promise<{ width: number; height: number; density: number }> {
  return ExpoPilotModule.getScreenSize();
}

/** Get list of all installed apps */
export async function getInstalledApps(): Promise<{ packageName: string; label: string }[]> {
  return ExpoPilotModule.getInstalledApps();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Listen for accessibility events (clicks, focus changes, window changes) */
export function onAccessibilityEvent(listener: (event: PilotEventPayload) => void): PilotSubscription {
  ExpoPilotModule.addListener('onAccessibilityEvent', listener);
  return { remove: () => ExpoPilotModule.removeListener('onAccessibilityEvent', listener) };
}
