import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Base path the app is hosted under (e.g. "/tony-fragrances-crm" on GitHub
// Pages, "" at a domain root). Baked in at build time so the links below resolve.
const BASE = (() => {
  const raw = (process.env.EXPO_PUBLIC_BASE_URL ?? "").trim().replace(/^\/+|\/+$/g, "");
  return raw ? `/${raw}` : "";
})();

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#121212" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Tony CRM" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <link rel="icon" href={`${BASE}/favicon-app.png`} />
        <link rel="apple-touch-icon" href={`${BASE}/icon-512.png`} />
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator && location.protocol === 'https:') { window.addEventListener('load', function () { navigator.serviceWorker.register('${BASE}/sw.js').catch(function () {}); }); }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
