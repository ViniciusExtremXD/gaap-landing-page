/** Auto-advance cards, never start a video or load an external publication. */
export function initializeCarouselAutoplay(
  cinema: HTMLElement, doc: Document, win: Window,
  isReduced: () => boolean, advance: () => void,
) {
  const toggle = cinema.querySelector<HTMLButtonElement>('[data-cinema-auto]');
  const track = cinema.querySelector<HTMLElement>('[data-cinema-track]');
  const count = cinema.querySelector<HTMLElement>('[data-cinema-count]');
  if (!toggle || !track) return { refreshMotion() {}, cleanup() {} };
  let paused = false;
  let hovering = false;
  let visible = false;
  let timer: number | undefined;
  let disposed = false;
  const listeners: Array<() => void> = [];
  const on = (target: EventTarget, type: string, fn: EventListener) => {
    target.addEventListener(type, fn, type === 'wheel' ? { passive: true } : undefined);
    listeners.push(() => target.removeEventListener(type, fn));
  };
  const canAdvance = () => !disposed && !paused && !hovering && visible && !isReduced()
    && doc.visibilityState !== 'hidden' && !cinema.querySelector('.is-playing');
  const refreshMotion = () => {
    if (timer !== undefined) win.clearTimeout(timer);
    timer = undefined;
    const stopped = paused || isReduced();
    toggle.disabled = isReduced();
    toggle.textContent = isReduced() ? 'Automático pausado' : paused ? 'Retomar carrossel' : 'Pausar carrossel';
    toggle.setAttribute('aria-label', toggle.textContent);
    cinema.dataset.autoplay = canAdvance() ? 'playing' : 'paused';
    count?.setAttribute('aria-live', stopped ? 'polite' : 'off');
    if (canAdvance()) timer = win.setTimeout(() => {
      timer = undefined;
      if (canAdvance()) advance();
      refreshMotion();
    }, 5000);
  };
  const pauseForInteraction = (event: Event) => {
    if ((event.target as Element).closest('[data-cinema-auto]')) return;
    paused = true;
    refreshMotion();
  };
  on(toggle, 'click', () => { paused = !paused; refreshMotion(); });
  on(cinema, 'pointerenter', (event) => {
    if ((event as PointerEvent).pointerType === 'touch') return;
    hovering = true; refreshMotion();
  });
  on(cinema, 'pointerleave', () => { hovering = false; refreshMotion(); });
  on(cinema, 'pointerdown', pauseForInteraction);
  on(cinema, 'focusin', pauseForInteraction);
  on(cinema, 'wheel', event => {
    const wheel = event as WheelEvent;
    if (Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY) || wheel.shiftKey) pauseForInteraction(event);
  });
  on(doc, 'visibilitychange', refreshMotion);
  const Observer = (win as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  const observer = Observer ? new Observer((entries) => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25);
    refreshMotion();
  }, { threshold: [0, .25] }) : undefined;
  observer?.observe(track);
  refreshMotion();
  return { refreshMotion, cleanup() {
    disposed = true;
    if (timer !== undefined) win.clearTimeout(timer);
    observer?.disconnect();
    listeners.forEach(remove => remove());
  } };
}
