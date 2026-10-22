/**
 * After a redeploy, pages already open in a browser still hold the old build's
 * form action IDs, and submitting fails with "Server Action ... was not found".
 * Phones keep tabs open for days, so this is common there.
 */
export function isStaleDeployError(error: Error): boolean {
  return (
    error.name === "UnrecognizedActionError" ||
    /Server Action .* was not found on the server|failed-to-find-server-action/i.test(error.message)
  );
}

/** Reloads to fetch the new build. At most once per 15s so it can never loop. */
export function reloadForNewDeploy(): boolean {
  try {
    const key = "stale-deploy-reload";
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 15_000) return false;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage blocked (private mode); still reload once.
  }
  window.location.reload();
  return true;
}
