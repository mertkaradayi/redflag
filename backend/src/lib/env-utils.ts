const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * Evaluate an environment variable as a boolean flag.
 * Accepts common truthy/falsy string representations and falls back to the provided default.
 */
export function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) {
    return defaultValue;
  }

  const normalized = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return defaultValue;
}
