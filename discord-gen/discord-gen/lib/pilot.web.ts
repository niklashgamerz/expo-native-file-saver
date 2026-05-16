export type FoundElement = {
  text: string;
  description?: string;
  isClickable: boolean;
  isEditable: boolean;
  isScrollable: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
  centerX: number;
  centerY: number;
};

export async function dumpScreen(): Promise<FoundElement[]> {
  return [];
}
export async function findElements(): Promise<FoundElement[]> {
  return [];
}
export async function isAccessibilityServiceEnabled(): Promise<boolean> {
  return false;
}
export async function openAccessibilitySettings(): Promise<void> {}
export async function screenshot(): Promise<{
  base64: string;
  width: number;
  height: number;
}> {
  return { base64: "", width: 0, height: 0 };
}
export async function tap(_opts: { x: number; y: number }): Promise<void> {}
export async function tapElement(_opts: {
  text?: string;
  description?: string;
  className?: string;
}): Promise<void> {}
export async function waitForElement(_opts: {
  text?: string;
  description?: string;
  className?: string;
  timeout?: number;
}): Promise<FoundElement | null> {
  return null;
}
