import * as SecureStore from 'expo-secure-store';

const DEMO_MODE_KEY = 'scpb_demo_mode_enabled';

/**
 * Demo mode — isolated fictitious DB only.
 * Default OFF: app is operational (scpb_local.db) for consumption and tests.
 */
export async function isDemoModeEnabled(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(DEMO_MODE_KEY);
    if (v == null) return false;
    return v === '1';
  } catch {
    return false;
  }
}

export async function setDemoModeEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(DEMO_MODE_KEY, enabled ? '1' : '0');
}

/** Force operational mode (clears a previously persisted demo flag). */
export async function ensureDemoModeDisabled(): Promise<boolean> {
  const was = await isDemoModeEnabled();
  if (was) {
    await setDemoModeEnabled(false);
  }
  return was;
}

export function demoDbName(): string {
  return 'scpb_demo.db';
}

export function opsDbName(): string {
  return 'scpb_local.db';
}
