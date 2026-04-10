export function buildContentSecurityPolicy(isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';"
    : "script-src 'self' 'wasm-unsafe-eval';"
  const connectSrc = isDev
    ? "connect-src 'self' ws://localhost:* http://localhost:*;"
    : "connect-src 'self';"

  return [
    "default-src 'self';",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
    "font-src 'self' https://fonts.gstatic.com data:;",
    "img-src 'self' data: blob:;",
    "frame-src 'self' blob:;",
    connectSrc,
  ].join(' ')
}
