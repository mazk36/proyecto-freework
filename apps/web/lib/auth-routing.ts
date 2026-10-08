const legacyRouteTargets: Array<[prefix: string, target: string]> = [
  ["/discover", "/app/descubrir"],
  ["/problems/new", "/app/problemas/nuevo"],
  ["/problems", "/app/explorar"],
  ["/company/problems", "/app/problemas"],
  ["/proposals", "/app/propuestas"],
  ["/saved", "/app/guardados"],
  ["/matches", "/app/matches"],
  ["/profile", "/app/perfil"],
];

export function legacyAppTarget(pathname: string): string | null {
  const path = normalizePathname(pathname);
  const match = legacyRouteTargets.find(
    ([prefix]) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return match?.[1] ?? null;
}

export function isAppPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === "/app" || path.startsWith("/app/");
}

export function isPublicAuthPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path === "/" ||
    path === "/iniciar-sesion" ||
    path === "/registro" ||
    path === "/recuperar-contrasena"
  );
}

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}
