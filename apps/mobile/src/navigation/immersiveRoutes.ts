/**
 * Paths (with or without groups) that should hide the agent tab bar.
 * Expo `usePathname()` often strips group segments.
 */
const IMMERSIVE_SEGMENTS = [
  'survey-run',
  'survey-consent',
  'planteur-form',
  'nouveau-planteur',
  'parcelle-form',
  'mission-form',
  'mapping-info',
  'formation-detail',
  'seance-detail',
  's22-sections',
  's21-dashboard',
  's21-sommaire',
  's26-personnes',
  's29-controles',
  's71-post-recolte',
  's72-mouvements',
  's73-observation',
  's75-pourquoi-ce-signal',
  's76-remediation',
] as const;

export function isImmersivePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/^\//, '').toLowerCase();
  return IMMERSIVE_SEGMENTS.some(
    (seg) =>
      normalized === seg ||
      normalized.endsWith(`/${seg}`) ||
      normalized.includes(`/${seg}/`) ||
      normalized.includes(`/${seg}?`)
  );
}

export { IMMERSIVE_SEGMENTS };
