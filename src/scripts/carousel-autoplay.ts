/** Auto-advance cards, never start a video or load an external publication. */
export function initializeCarouselAutoplay(
  cinema: HTMLElement, doc: Document, win: Window,
  isReduced: () => boolean, advance: () => void,
) {
  const track = cinema.querySelector<HTMLElement>('[data-cinema-track]');
  const count = cinema.querySelector<HTMLElement>('[data-cinema-count]');
  if (!track) return { refreshMotion() {}, cleanup() {} };
  let dragging = false;
  let visible = true;
  let timer: number | undefined;
  let disposed = false;
  const listeners: Array<() => void> = [];
  const on = (target: EventTarget, type: string, fn: EventListener) => {
    target.addEventListener(type, fn, type === 'wheel' ? { passive: true } : undefined);
    listeners.push(() => target.removeEventListener(type, fn));
  };
  const canAdvance = () => !disposed && visible && !isReduced()
    && doc.visibilityState !== 'hidden';
  const refreshMotion = () => {
    if (timer !== undefined) win.clearTimeout(timer);
    timer = undefined;
    cinema.dataset.autoplay = canAdvance() ? 'playing' : 'paused';
    count?.setAttribute('aria-live', 'off');
    if (canAdvance()) timer = win.setTimeout(() => {
      timer = undefined;
      if (canAdvance() && !dragging && !cinema.querySelector('.is-playing')) advance();
      refreshMotion();
    }, 5000);
  };
  // Interaction restarts the interval; it never disables automatic rotation.
  on(cinema, 'pointerdown', () => { dragging = true; refreshMotion(); });
  on(win, 'pointerup', () => { if (dragging) { dragging = false; refreshMotion(); } });
  on(win, 'pointercancel', () => { dragging = false; refreshMotion(); });
  on(cinema, 'click', refreshMotion);
  on(cinema, 'keydown', refreshMotion);
  on(doc, 'visibilitychange', refreshMotion);
  const Observer = (win as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  const observer = Observer ? new Observer((entries) => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25);
    refreshMotion();
  }, { threshold: [0, .25] }) : undefined;
  visible = !observer;
  observer?.observe(track);
  refreshMotion();
  return { refreshMotion, cleanup() {
    disposed = true;
    if (timer !== undefined) win.clearTimeout(timer);
    observer?.disconnect();
    listeners.forEach(remove => remove());
  } };
}
