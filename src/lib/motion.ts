export const PRIVATE_MOTION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const PRIVATE_LAYOUT_DURATION_MILLISECONDS = 420;
export const PRIVATE_DIALOG_EXIT_MILLISECONDS = 200;

type ElementRegistry = ReadonlyMap<string, HTMLElement>;
type AnimationRegistry = Map<HTMLElement, Animation>;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs a FLIP layout transition while preserving the visual position of an
 * animation that was interrupted. Layout reads happen before and after the
 * supplied synchronous state update; the animation itself only changes
 * compositor-friendly transforms.
 */
export function animatePrivateLayout(
  elements: ElementRegistry,
  activeAnimations: AnimationRegistry,
  updateLayout: () => void,
) {
  const reduceMotion = prefersReducedMotion();
  const firstRects = new Map<string, DOMRect>();

  if (!reduceMotion) {
    for (const [id, element] of elements) {
      // Capture the on-screen rectangle before cancellation so a rapid second
      // interaction continues from the current frame instead of snapping.
      firstRects.set(id, element.getBoundingClientRect());
      activeAnimations.get(element)?.cancel();
      activeAnimations.delete(element);
      element.style.willChange = "";
    }
  }

  updateLayout();
  if (reduceMotion) return Promise.resolve();

  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      const pending: Promise<unknown>[] = [];

      for (const [id, element] of elements) {
        const first = firstRects.get(id);
        if (!first) continue;

        const last = element.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        const scaleX = first.width / Math.max(1, last.width);
        const scaleY = first.height / Math.max(1, last.height);
        if (
          Math.abs(deltaX) < 0.5
          && Math.abs(deltaY) < 0.5
          && Math.abs(scaleX - 1) < 0.005
          && Math.abs(scaleY - 1) < 0.005
        ) {
          continue;
        }

        element.style.willChange = "transform";
        const animation = element.animate(
          [
            {
              transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
              transformOrigin: "top left",
            },
            {
              transform: "translate3d(0, 0, 0) scale(1, 1)",
              transformOrigin: "top left",
            },
          ],
          {
            duration: PRIVATE_LAYOUT_DURATION_MILLISECONDS,
            easing: PRIVATE_MOTION_EASING,
          },
        );

        activeAnimations.set(element, animation);
        const settled = animation.finished.catch(() => undefined).finally(() => {
          if (activeAnimations.get(element) !== animation) return;
          activeAnimations.delete(element);
          element.style.willChange = "";
        });
        pending.push(settled);
      }

      if (pending.length === 0) {
        resolve();
        return;
      }
      void Promise.all(pending).then(() => resolve());
    });
  });
}

const closingDialogs = new WeakMap<HTMLDialogElement, Promise<void>>();

export function animatePrivateDialogClose(dialog: HTMLDialogElement | null) {
  if (!dialog || !dialog.open || prefersReducedMotion()) return Promise.resolve();

  const existing = closingDialogs.get(dialog);
  if (existing) return existing;

  dialog.dataset.closing = "true";
  const animation = dialog.animate(
    [
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
      { opacity: 0, transform: "translate3d(0, 12px, 0) scale(0.985)" },
    ],
    {
      duration: PRIVATE_DIALOG_EXIT_MILLISECONDS,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards",
    },
  );
  const completion = animation.finished
    .catch(() => undefined)
    .then(() => {
      if (dialog.dataset.closing === "true") {
        delete dialog.dataset.closing;
      }
      if (closingDialogs.get(dialog) === completion) {
        closingDialogs.delete(dialog);
      }
    });
  closingDialogs.set(dialog, completion);
  return completion;
}
