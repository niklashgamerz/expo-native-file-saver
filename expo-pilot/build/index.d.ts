import type { TapOptions, SwipeOptions, ElementQuery, TypeTextOptions, ScrollOptions, ScreenshotResult, AccessibilityServiceStatus, FoundElement, PilotEventPayload } from './ExpoPilot.types';
export type { TapOptions, SwipeOptions, ElementQuery, TypeTextOptions, ScrollOptions, ScreenshotResult, AccessibilityServiceStatus, FoundElement, PilotEventPayload, };
export type PilotSubscription = {
    remove: () => void;
};
/** Check if the ExpoPilot accessibility service is enabled */
export declare function isAccessibilityServiceEnabled(): Promise<boolean>;
/** Open Android Accessibility Settings so user can enable the service */
export declare function openAccessibilitySettings(): Promise<boolean>;
/** Get full service status info */
export declare function getServiceStatus(): Promise<AccessibilityServiceStatus>;
/** Tap at screen coordinates */
export declare function tap(options: TapOptions): Promise<{
    success: boolean;
    x: number;
    y: number;
}>;
/** Swipe from one point to another */
export declare function swipe(options: SwipeOptions): Promise<{
    success: boolean;
}>;
/** Scroll in a direction */
export declare function scroll(options: ScrollOptions): Promise<{
    success: boolean;
}>;
/** Find a single element on screen matching the query */
export declare function findElement(query: ElementQuery): Promise<FoundElement>;
/** Find all elements matching the query */
export declare function findElements(query: ElementQuery): Promise<FoundElement[]>;
/** Find an element and tap it in one call */
export declare function tapElement(query: ElementQuery): Promise<{
    success: boolean;
    element: FoundElement;
}>;
/** Find an element and type text into it */
export declare function typeText(query: ElementQuery, options: TypeTextOptions): Promise<{
    success: boolean;
}>;
/** Type text into whatever input is currently focused */
export declare function typeIntoFocused(options: TypeTextOptions): Promise<{
    success: boolean;
}>;
/** Wait for an element to appear, polling until timeout */
export declare function waitForElement(query: ElementQuery, timeoutMs?: number): Promise<FoundElement>;
/** Get the full accessibility tree of what's on screen */
export declare function dumpScreen(): Promise<FoundElement[]>;
/** Get the package name of the currently active app */
export declare function getCurrentApp(): Promise<{
    packageName: string;
    className: string;
}>;
/** Take a screenshot — returns base64 PNG (Android 11+) */
export declare function screenshot(): Promise<ScreenshotResult>;
/** Press the back button */
export declare function pressBack(): Promise<boolean>;
/** Press the home button */
export declare function pressHome(): Promise<boolean>;
/** Open recents/app switcher */
export declare function pressRecents(): Promise<boolean>;
/** Pull down notifications */
export declare function openNotifications(): Promise<boolean>;
/** Open quick settings */
export declare function openQuickSettings(): Promise<boolean>;
/** Lock the screen */
export declare function lockScreen(): Promise<boolean>;
/** Launch an app by package name */
export declare function launchApp(packageName: string): Promise<{
    success: boolean;
    packageName: string;
}>;
/** Get screen dimensions and density */
export declare function getScreenSize(): Promise<{
    width: number;
    height: number;
    density: number;
}>;
/** Get list of all installed apps */
export declare function getInstalledApps(): Promise<{
    packageName: string;
    label: string;
}[]>;
/** Listen for accessibility events (clicks, focus changes, window changes) */
export declare function onAccessibilityEvent(listener: (event: PilotEventPayload) => void): PilotSubscription;
//# sourceMappingURL=index.d.ts.map