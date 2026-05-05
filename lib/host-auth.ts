export function isHostAuthorized(request: Request): boolean {
  const secret = process.env.HOST_SECRET;
  if (!secret) return true;
  return request.headers.get("x-host-secret") === secret;
}
