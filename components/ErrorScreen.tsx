"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { isStaleDeployError, reloadForNewDeploy } from "@/lib/staleDeploy";
import { Button } from "./ui";

export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStaleDeployError(error);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (stale) setReloading(reloadForNewDeploy());
    else console.error(error);
  }, [stale, error]);

  return (
    <main className="flex min-h-[60dvh] items-center justify-center px-4 py-12">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-slate-900">
          {stale ? "The app was just updated" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {stale
            ? reloading
              ? "Loading the latest version… Your last action wasn't saved, so please submit it again."
              : "Please reload the page, then submit again. Your last action wasn't saved."
            : "Please try again. If it keeps happening, reload the page."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {!stale && (
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
          )}
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" aria-hidden /> Reload
          </Button>
        </div>
      </div>
    </main>
  );
}
