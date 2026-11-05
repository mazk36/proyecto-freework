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

/**
 * Destino local dentro de /app para después de iniciar sesión. Se resuelve con URL (puntos, %2e y barras incluidos) y
 * solo se acepta si el resultado sigue siendo una ruta /app del mismo sitio: «/app/..//sitio.ajeno» se normaliza a
 * «//sitio.ajeno», que el navegador interpretaría como otro dominio, y se descarta.
 */
export function safeAppDestination(candidate: string | null): string {
  if (!candidate || candidate.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(candidate)) return "/app";
  try {
    const target = new URL(candidate, "https://matchwork.invalid");
    if (target.origin !== "https://matchwork.invalid") return "/app";
    if (target.pathname !== "/app" && !target.pathname.startsWith("/app/")) return "/app";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/app";
  }
}

export function authContinuationHref(pathname: string, candidate: string | null): string {
  const destination = safeAppDestination(candidate);
  return destination === "/app" ? pathname : `${pathname}?next=${encodeURIComponent(destination)}`;
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
    path === "/registro/revisa-tu-correo" ||
    path === "/recuperar-contrasena"
  );
}

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}
