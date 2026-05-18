/**
 * Service worker registration utilities.
 * Handles registering, unregistering, and lifecycle events for the SW.
 */

const SW_PATH = "/sw.js";

interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register the service worker for offline support and static asset caching.
 * Only registers in production and when the browser supports service workers.
 */
export async function registerServiceWorker(
  config?: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  // Only register in production
  if (process.env.NODE_ENV !== "production") {
    console.debug("[SW] Skipping registration in development mode");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: "/",
    });

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state !== "installed") return;

        if (navigator.serviceWorker.controller) {
          // New content is available — an update was found
          console.info("[SW] New content available; please refresh.");
          config?.onUpdate?.(registration);
        } else {
          // Content is cached for the first time (initial install)
          console.info("[SW] Content cached for offline use.");
          config?.onSuccess?.(registration);
        }
      };
    };

    return registration;
  } catch (error) {
    const swError =
      error instanceof Error ? error : new Error(String(error));
    console.error("[SW] Registration failed:", swError);
    config?.onError?.(swError);
    return null;
  }
}

/**
 * Unregister all service workers. Useful for clearing stale caches
 * or disabling offline mode.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    if (success) {
      console.info("[SW] Unregistered successfully.");
    }
    return success;
  } catch (error) {
    console.error("[SW] Unregistration failed:", error);
    return false;
  }
}
