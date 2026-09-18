/**
 * Backend / auth phase — not implemented.
 * Production must NOT ship demo role pickers.
 * Sensitive protection dossiers stay demo-only until this is live.
 */

export type BackendConfig = {
  configured: boolean;
  authUrl: string | null;
  syncUrl: string | null;
};

export function getBackendConfig(): BackendConfig {
  return {
    configured: false,
    authUrl: null,
    syncUrl: null,
  };
}

export function isProductionAuthReady(): boolean {
  return getBackendConfig().configured;
}
