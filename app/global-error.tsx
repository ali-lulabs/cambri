"use client";

import { ErrorScreen } from "@/components/ErrorScreen";
import "./globals.css";

// Used only if the root layout itself fails; must render its own <html>.
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen {...props} />
      </body>
    </html>
  );
}
