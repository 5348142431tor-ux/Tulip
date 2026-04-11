export function resolveApiBaseUrl() {
  const { protocol, hostname } = window.location;

  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return "http://127.0.0.1:3000";
  }

  const hostParts = hostname.split(".");
  if (hostParts.length >= 2) {
    return `${protocol}//api.${hostParts.slice(-2).join(".")}`;
  }

  return `${protocol}//${hostname}:3000`;
}
