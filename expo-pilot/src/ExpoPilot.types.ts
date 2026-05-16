export type TapOptions = {
  x: number;
  y: number;
  /** Duration of the tap in ms. Default: 50 */
  duration?: number;
};

export type SwipeOptions = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Duration of the swipe in ms. Default: 300 */
  duration?: number;
};

export type ElementQuery = {
  /** Find by exact or partial text content */
  text?: string;
  /** Find by content description (accessibility label) */
  description?: string;
  /** Find by resource ID e.g. "com.example:id/button" */
  resourceId?: string;
  /** Find by class name e.g. "android.widget.Button" */
  className?: string;
  /** Which match to use if multiple found. Default: 0 (first) */
  index?: number;
};

export type FoundElement = {
  text: string;
  description: string;
  resourceId: string;
  className: string;
  bounds: { left: number; top: number; right: number; bottom: number };
  centerX: number;
  centerY: number;
  isClickable: boolean;
  isEditable: boolean;
  isScrollable: boolean;
  isEnabled: boolean;
  packageName: string;
};

export type TypeTextOptions = {
  /** Text to type */
  text: string;
  /** If true, clears existing text first. Default: false */
  clearFirst?: boolean;
};

export type ScrollOptions = {
  /** Direction to scroll */
  direction: 'up' | 'down' | 'left' | 'right';
  /** How much to scroll (0-1, fraction of screen). Default: 0.5 */
  amount?: number;
  /** Starting X coordinate. Default: screen center */
  x?: number;
  /** Starting Y coordinate. Default: screen center */
  y?: number;
};

export type ScreenshotResult = {
  /** Base64-encoded PNG */
  base64: string;
  width: number;
  height: number;
};

export type AccessibilityServiceStatus = {
  isEnabled: boolean;
  packageName: string;
  settingsIntent: string;
};

export type PilotEventPayload = {
  type: 'click' | 'focus' | 'window_change' | 'notification';
  packageName: string;
  className: string;
  text: string;
  timestamp: number;
};
