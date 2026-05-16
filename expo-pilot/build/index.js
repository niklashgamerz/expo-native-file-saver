import ExpoPilotModule from './ExpoPilotModule';
// ---------------------------------------------------------------------------
// Service setup
// ---------------------------------------------------------------------------
/** Check if the ExpoPilot accessibility service is enabled */
export async function isAccessibilityServiceEnabled() {
    return ExpoPilotModule.isAccessibilityServiceEnabled();
}
/** Open Android Accessibility Settings so user can enable the service */
export async function openAccessibilitySettings() {
    return ExpoPilotModule.openAccessibilitySettings();
}
/** Get full service status info */
export async function getServiceStatus() {
    return ExpoPilotModule.getServiceStatus();
}
// ---------------------------------------------------------------------------
// Gestures
// ---------------------------------------------------------------------------
/** Tap at screen coordinates */
export async function tap(options) {
    return ExpoPilotModule.tap(options);
}
/** Swipe from one point to another */
export async function swipe(options) {
    return ExpoPilotModule.swipe(options);
}
/** Scroll in a direction */
export async function scroll(options) {
    return ExpoPilotModule.scroll(options);
}
// ---------------------------------------------------------------------------
// Element interaction
// ---------------------------------------------------------------------------
/** Find a single element on screen matching the query */
export async function findElement(query) {
    return ExpoPilotModule.findElement(query);
}
/** Find all elements matching the query */
export async function findElements(query) {
    return ExpoPilotModule.findElements(query);
}
/** Find an element and tap it in one call */
export async function tapElement(query) {
    return ExpoPilotModule.tapElement(query);
}
/** Find an element and type text into it */
export async function typeText(query, options) {
    return ExpoPilotModule.typeText(query, options);
}
/** Type text into whatever input is currently focused */
export async function typeIntoFocused(options) {
    return ExpoPilotModule.typeIntoFocused(options);
}
/** Wait for an element to appear, polling until timeout */
export async function waitForElement(query, timeoutMs = 5000) {
    return ExpoPilotModule.waitForElement(query, timeoutMs);
}
/** Get the full accessibility tree of what's on screen */
export async function dumpScreen() {
    return ExpoPilotModule.dumpScreen();
}
/** Get the package name of the currently active app */
export async function getCurrentApp() {
    return ExpoPilotModule.getCurrentApp();
}
// ---------------------------------------------------------------------------
// System actions
// ---------------------------------------------------------------------------
/** Take a screenshot — returns base64 PNG (Android 11+) */
export async function screenshot() {
    return ExpoPilotModule.screenshot();
}
/** Press the back button */
export async function pressBack() {
    return ExpoPilotModule.pressBack();
}
/** Press the home button */
export async function pressHome() {
    return ExpoPilotModule.pressHome();
}
/** Open recents/app switcher */
export async function pressRecents() {
    return ExpoPilotModule.pressRecents();
}
/** Pull down notifications */
export async function openNotifications() {
    return ExpoPilotModule.openNotifications();
}
/** Open quick settings */
export async function openQuickSettings() {
    return ExpoPilotModule.openQuickSettings();
}
/** Lock the screen */
export async function lockScreen() {
    return ExpoPilotModule.lockScreen();
}
/** Launch an app by package name */
export async function launchApp(packageName) {
    return ExpoPilotModule.launchApp(packageName);
}
/** Get screen dimensions and density */
export async function getScreenSize() {
    return ExpoPilotModule.getScreenSize();
}
/** Get list of all installed apps */
export async function getInstalledApps() {
    return ExpoPilotModule.getInstalledApps();
}
// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
/** Listen for accessibility events (clicks, focus changes, window changes) */
export function onAccessibilityEvent(listener) {
    ExpoPilotModule.addListener('onAccessibilityEvent', listener);
    return { remove: () => ExpoPilotModule.removeListener('onAccessibilityEvent', listener) };
}
//# sourceMappingURL=index.js.map