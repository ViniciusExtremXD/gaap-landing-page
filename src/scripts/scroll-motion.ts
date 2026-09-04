const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

/** Scroll stays native. Decorative state is sampled once per browser frame. */
export function initializeScrollMotion(doc: Document, win: Window, isReduced: () => boolean) {
  const root = doc.documentElement;
  const header = doc.querySelector<HTMLElement>('[data-header]');
  const revealItems = [...doc.querySelectorAll<HTMLElement>('[data-reveal]')];
  const parallaxItems = [...doc.querySelectorAll<HTMLElement>('[data-parallax]')].map((element) => {
    const requested = Number(element.dataset.parallax || 18);
    return { element, amplitude: clamp(Number.isFinite(requested) ? requested : 18, -36, 36), offset: 0 };
  });
  const navLinks = [...(header?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])].flatMap((link) => {
    const url = new URL(link.href, win.location.href);
    if (url.origin !== win.location.origin || url.pathname !== win.location.pathname || !url.hash) return [];
    try {
      const section = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
      return section ? [{ link, section }] : [];
    } catch {
      return [];
    }
  });
  const sections = [...new Set(navLinks.map(({ section }) => section))];
  const Observer = (win as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  let revealObserver: IntersectionObserver | undefined;
  let frame: number | undefined;
  let disposed = false;

  const render = () => {
    frame = undefined;
    if (disposed) return;
    const viewport = Math.max(1, win.innerHeight);
    const distance = Math.max(0, root.scrollHeight - viewport);
    root.style.setProperty('--page-progress', String(distance ? clamp(win.scrollY / distance) : 0));
    if (header) {
      const scrolled = win.scrollY > 32;
      header.classList.toggle('is-scrolled', scrolled);
      header.dataset.scrolled = String(scrolled);
    }

    const readingLine = Math.max((header?.getBoundingClientRect().height || 0) + 24, viewport * 0.28);
    let current: HTMLElement | undefined;
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= readingLine && rect.bottom > readingLine) current = section;
    });
    navLinks.forEach(({ link, section }) => {
      if (section === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    if (isReduced()) return;
    const offsets = parallaxItems.flatMap((item) => {
      const rect = item.element.getBoundingClientRect();
      const top = rect.top - item.offset;
      if (top > viewport + 48 || top + rect.height < -48) return [];
      const position = (viewport / 2 - top - rect.height / 2) / ((viewport + rect.height) / 2);
      return [{ item, value: Math.round(clamp(position, -1, 1) * item.amplitude * 100) / 100 }];
    });
    offsets.forEach(({ item, value }) => {
      item.offset = value;
      item.element.style.setProperty('--parallax-y', `${value}px`);
    });
  };

  const schedule = () => {
    if (disposed || frame !== undefined) return;
    frame = win.requestAnimationFrame(render);
  };

  const refreshMotion = () => {
    if (frame !== undefined) win.cancelAnimationFrame(frame);
    revealObserver?.disconnect();
    if (isReduced() || !Observer) {
      revealItems.forEach((element) => element.classList.add('is-visible'));
    } else {
      revealObserver ??= new Observer((entries, observer) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.add('is-visible');
          observer.unobserve(target);
        });
      }, { rootMargin: '0px 0px -36px 0px', threshold: 0.08 });
      revealItems.filter((element) => !element.classList.contains('is-visible')).forEach((element) => revealObserver!.observe(element));
    }
    if (isReduced()) {
      parallaxItems.forEach((item) => {
        item.offset = 0;
        item.element.style.removeProperty('--parallax-y');
      });
    }
    root.classList.add('motion-ready');
    render();
  };

  const revealFocused = (event: Event) => {
    const element = (event.target as Element).closest<HTMLElement>('[data-reveal]');
    if (!element) return;
    element.classList.add('is-visible');
    revealObserver?.unobserve(element);
  };
  win.addEventListener('scroll', schedule, { passive: true });
  win.addEventListener('resize', schedule, { passive: true });
  doc.addEventListener('focusin', revealFocused);
  const ResizeObserverConstructor = (win as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const resizeObserver = ResizeObserverConstructor ? new ResizeObserverConstructor(schedule) : undefined;
  if (doc.body) resizeObserver?.observe(doc.body);
  refreshMotion();

  return {
    refreshMotion,
    cleanup() {
      disposed = true;
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      win.removeEventListener('scroll', schedule);
      win.removeEventListener('resize', schedule);
      doc.removeEventListener('focusin', revealFocused);
      revealObserver?.disconnect();
      resizeObserver?.disconnect();
      root.classList.remove('motion-ready');
      parallaxItems.forEach(({ element }) => element.style.removeProperty('--parallax-y'));
    },
  };
}
