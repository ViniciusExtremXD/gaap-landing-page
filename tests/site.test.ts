import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { initializeSite } from '../src/scripts/site';

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  targets: Set<Element>;
};

function createPage(
  body: string,
  options: { reduceMotion?: boolean; beforeInitialize?: (window: Window) => void } = {},
) {
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url: 'https://gaap.example/',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = (callback) => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = (frame) => { frames.delete(frame); };
  const flushFrames = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(16));
  };
  const observers: ObserverRecord[] = [];
  let prefersReducedMotion = Boolean(options.reduceMotion);
  const motionListeners = new Set<(event: MediaQueryListEvent) => void>();
  const motionQuery = {
    get matches() {
      return prefersReducedMotion;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener(type: string, listener: (event: MediaQueryListEvent) => void) {
      if (type === 'change') motionListeners.add(listener);
    },
    removeEventListener(type: string, listener: (event: MediaQueryListEvent) => void) {
      if (type === 'change') motionListeners.delete(listener);
    },
    addListener(listener: (event: MediaQueryListEvent) => void) {
      motionListeners.add(listener);
    },
    removeListener(listener: (event: MediaQueryListEvent) => void) {
      motionListeners.delete(listener);
    },
    dispatchEvent: () => false,
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => query === motionQuery.media
      ? motionQuery
      : {
          matches: false,
          media: query,
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
          dispatchEvent: () => false,
        },
  });

  class TestIntersectionObserver {
    readonly record: ObserverRecord;

    constructor(callback: IntersectionObserverCallback) {
      this.record = { callback, targets: new Set() };
      observers.push(this.record);
    }

    observe(target: Element) {
      this.record.targets.add(target);
    }

    unobserve(target: Element) {
      this.record.targets.delete(target);
    }

    disconnect() {
      this.record.targets.clear();
    }

    takeRecords() {
      return [];
    }

    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds = [0];
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: TestIntersectionObserver,
  });

  options.beforeInitialize?.(window as unknown as Window);
  const cleanup = initializeSite(window.document, window as unknown as Window);

  function intersect(target: Element, isIntersecting: boolean, ratio = isIntersecting ? 1 : 0) {
    const record = observers.find(({ targets }) => targets.has(target));
    assert.ok(record, 'the target is observed');
    record.callback(
      [{ target, isIntersecting, intersectionRatio: ratio } as IntersectionObserverEntry],
      {
        unobserve(observedTarget: Element) {
          record.targets.delete(observedTarget);
        },
      } as IntersectionObserver,
    );
  }

  function setReducedMotion(reduced: boolean) {
    prefersReducedMotion = reduced;
    const event = { matches: reduced, media: motionQuery.media } as MediaQueryListEvent;
    motionListeners.forEach((listener) => listener(event));
  }

  return { dom, window, document: window.document, cleanup, intersect, setReducedMotion, flushFrames, frames };
}

test('page scroll updates progress and section navigation in one frame without a perpetual loop', () => {
  let scrollY = 0;
  const page = createPage(`
    <header data-header><a href="/#first">Primeiro</a><a href="/#second">Segundo</a><a href="https://other.example/#second">Externo</a></header>
    <section id="first"></section><section id="second"></section>
  `, {
    beforeInitialize(window) {
      Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
      Object.defineProperty(window.document.documentElement, 'scrollHeight', { configurable: true, value: 2400 });
      window.document.querySelector<HTMLElement>('#first')!.getBoundingClientRect = () => ({ top: -scrollY, bottom: 800 - scrollY, height: 800 }) as DOMRect;
      window.document.querySelector<HTMLElement>('#second')!.getBoundingClientRect = () => ({ top: 800 - scrollY, bottom: 2400 - scrollY, height: 1600 }) as DOMRect;
    },
  });
  const root = page.document.documentElement;
  assert.equal(root.style.getPropertyValue('--page-progress'), '0');
  assert.equal(page.document.querySelector('[data-header]')!.getAttribute('data-scrolled'), 'false');
  scrollY = 800;
  page.window.dispatchEvent(new page.window.Event('scroll'));
  page.window.dispatchEvent(new page.window.Event('scroll'));
  assert.equal(page.frames.size, 1);
  page.flushFrames();
  assert.equal(root.style.getPropertyValue('--page-progress'), '0.5');
  assert.equal(page.document.querySelector('[data-header]')!.classList.contains('is-scrolled'), true);
  assert.equal(page.document.querySelector('a[href="/#second"]')!.getAttribute('aria-current'), 'location');
  assert.equal(page.document.querySelector('a[href^="https://other"]')!.getAttribute('aria-current'), null);
  assert.equal(page.frames.size, 0);
  scrollY = 9999;
  page.window.dispatchEvent(new page.window.Event('scroll'));
  page.flushFrames();
  assert.equal(root.style.getPropertyValue('--page-progress'), '1');
  page.cleanup();
});

test('reveals settle once and the reduced motion control immediately removes parallax', () => {
  const page = createPage('<button data-motion-toggle></button><section data-reveal></section><figure data-parallax="18"></figure>', {
    beforeInitialize(window) {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
      window.document.querySelector<HTMLElement>('[data-parallax]')!.getBoundingClientRect = () => ({ top: 0, bottom: 200, height: 200 }) as DOMRect;
    },
  });
  const root = page.document.documentElement;
  const reveal = page.document.querySelector<HTMLElement>('[data-reveal]')!;
  const parallax = page.document.querySelector<HTMLElement>('[data-parallax]')!;
  assert.equal(root.classList.contains('motion-ready'), true);
  assert.equal(reveal.classList.contains('is-visible'), false);
  assert.ok(Math.abs(parseFloat(parallax.style.getPropertyValue('--parallax-y'))) <= 18);
  assert.notEqual(parseFloat(parallax.style.getPropertyValue('--parallax-y')), 0);
  page.intersect(reveal, true);
  assert.equal(reveal.classList.contains('is-visible'), true);
  page.document.querySelector<HTMLButtonElement>('[data-motion-toggle]')!.click();
  assert.equal(parallax.style.getPropertyValue('--parallax-y'), '');
  assert.equal(reveal.classList.contains('is-visible'), true);
  page.window.dispatchEvent(new page.window.Event('scroll'));
  page.flushFrames();
  assert.equal(parallax.style.getPropertyValue('--parallax-y'), '');
  page.cleanup();
});

test('missing IntersectionObserver leaves all reveal content visible', () => {
  const page = createPage('<section data-reveal>Conteúdo</section>', {
    beforeInitialize(window) {
      Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: undefined });
    },
  });
  assert.equal(page.document.querySelector('[data-reveal]')!.classList.contains('is-visible'), true);
  page.cleanup();
});

test('changing motion while a scroll frame is queued does not orphan animation work', () => {
  const page = createPage('<button data-motion-toggle></button>');
  page.window.dispatchEvent(new page.window.Event('scroll'));
  assert.equal(page.frames.size, 1);
  page.document.querySelector<HTMLButtonElement>('[data-motion-toggle]')!.click();
  page.window.dispatchEvent(new page.window.Event('scroll'));
  assert.equal(page.frames.size, 1);
  page.cleanup();
  assert.equal(page.frames.size, 0);
});

test('mobile menu closes with Escape and restores focus to its trigger', () => {
  const page = createPage(`
    <header data-header>
      <button data-menu-toggle aria-expanded="false" aria-controls="mobile-navigation">Menu</button>
      <nav id="mobile-navigation" data-mobile-menu hidden><a href="#care">Cuidado</a></nav>
    </header>
  `);
  const button = page.document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
  const menu = page.document.querySelector<HTMLElement>('[data-mobile-menu]')!;

  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(button.getAttribute('aria-label'), 'Fechar menu');
  assert.equal(menu.hidden, false);

  menu.querySelector('a')!.focus();
  page.document.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(button.getAttribute('aria-label'), 'Abrir menu');
  assert.equal(menu.hidden, true);
  assert.equal(page.document.activeElement, button);
  page.cleanup();
});

test('an open mobile menu closes when the layout crosses into desktop', () => {
  let width = 390;
  const page = createPage('<button data-menu-toggle aria-expanded="false">Menu</button><nav data-mobile-menu hidden><a href="#care">Cuidado</a></nav>', {
    beforeInitialize(window) {
      Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => width });
    },
  });
  const button = page.document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
  button.click();
  width = 1180;
  page.window.dispatchEvent(new page.window.Event('resize'));
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(page.document.querySelector<HTMLElement>('[data-mobile-menu]')!.hidden, false);
  width = 1181;
  page.window.dispatchEvent(new page.window.Event('resize'));
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(page.document.querySelector<HTMLElement>('[data-mobile-menu]')!.hidden, true);
  assert.equal(page.document.documentElement.classList.contains('has-open-menu'), false);
  page.cleanup();
});

test('motion preference defaults from the system and a manual choice persists', () => {
  const page = createPage(`
    <button data-motion-toggle aria-pressed="false"><span data-motion-label></span></button>
    <section data-album><figure data-album-item style="--tilt: 3deg"></figure></section>
  `, { reduceMotion: true });
  const root = page.document.documentElement;
  const button = page.document.querySelector<HTMLButtonElement>('[data-motion-toggle]')!;
  const albumItem = page.document.querySelector<HTMLElement>('[data-album-item]')!;

  assert.equal(root.dataset.motion, 'reduced');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(page.document.querySelector('[data-motion-label]')!.textContent, 'Reduzir movimentos');
  assert.equal(albumItem.style.getPropertyValue('--tilt'), '0deg');

  button.click();
  assert.equal(root.dataset.motion, 'full');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(page.window.localStorage.getItem('gaap-motion'), 'full');
  assert.equal(page.document.querySelector('[data-motion-label]')!.textContent, 'Reduzir movimentos');
  assert.equal(albumItem.style.getPropertyValue('--tilt'), '3deg');
  page.cleanup();

  const next = createPage('<button data-motion-toggle><span data-motion-label></span></button>', {
    reduceMotion: true,
  });
  next.window.localStorage.setItem('gaap-motion', 'full');
  next.cleanup();
  initializeSite(next.document, next.window as unknown as Window);
  assert.equal(next.document.documentElement.dataset.motion, 'full');
});

test('system motion changes apply until the visitor makes a manual choice', () => {
  const page = createPage(`
    <button data-motion-toggle aria-pressed="false"><span data-motion-label></span></button>
  `);
  const button = page.document.querySelector<HTMLButtonElement>('[data-motion-toggle]')!;

  page.setReducedMotion(true);
  assert.equal(page.document.documentElement.dataset.motion, 'reduced');

  button.click();
  assert.equal(page.document.documentElement.dataset.motion, 'full');
  page.setReducedMotion(true);
  assert.equal(page.document.documentElement.dataset.motion, 'full');
  page.cleanup();
});

test('album settles once and reduced motion starts at the final care state', () => {
  const full = createPage(`
    <section data-album><figure data-album-item style="--tilt: 3deg"></figure></section>
    <section data-care-section><svg><path data-care-path></path></svg></section>
  `);
  const album = full.document.querySelector<HTMLElement>('[data-album]')!;
  full.intersect(album, true);
  assert.equal(album.classList.contains('is-settled'), true);
  full.intersect(full.document.querySelector('[data-care-section]')!, true, 0.4);
  assert.equal(full.document.documentElement.style.getPropertyValue('--care-progress'), '0.4');
  full.cleanup();

  const reduced = createPage(`
    <section data-album><figure data-album-item></figure></section>
    <section data-care-section><svg><path data-care-path></path></svg></section>
  `, { reduceMotion: true });
  assert.equal(reduced.document.querySelector('[data-album]')!.classList.contains('is-settled'), true);
  assert.equal(reduced.document.documentElement.style.getPropertyValue('--care-progress'), '1');
  reduced.cleanup();
});

test('cinema navigation keeps explicit selection when two items share the final scroll position', () => {
  const page = createPage(`
    <section data-cinema>
      <button data-cinema-prev>Anterior</button>
      <div data-cinema-track tabindex="0">
        <article data-cinema-item>Um <button data-play>Play 1</button></article>
        <article data-cinema-item>Dois <button data-play>Play 2</button></article>
        <article data-cinema-item>Três <button data-play>Play 3</button></article>
      </div>
      <button data-cinema-next>Próximo</button><span data-cinema-count></span>
    </section>
  `);
  const track = page.document.querySelector<HTMLElement>('[data-cinema-track]')!;
  const items = [...page.document.querySelectorAll<HTMLElement>('[data-cinema-item]')];
  const positions = [0, 510.4, 1020.8];
  const trackLeft = 1000;
  let viewportWidth = 1280;
  let contentWidth = 1507;
  let scrollLeft = 0;
  let requestedLeft = 0;
  Object.defineProperties(track, {
    clientWidth: { configurable: true, get: () => viewportWidth },
    scrollWidth: { configurable: true, get: () => contentWidth },
    scrollLeft: { configurable: true, get: () => scrollLeft, set: (value) => { scrollLeft = value; } },
  });
  track.getBoundingClientRect = () => ({ left: trackLeft, right: trackLeft + viewportWidth, width: viewportWidth }) as DOMRect;
  track.scrollTo = (options) => {
    requestedLeft = typeof options === 'object' ? Number(options.left) : Number(options);
  };
  items.forEach((item, index) => {
    Object.defineProperty(item, 'offsetLeft', { configurable: true, value: trackLeft + positions[index] });
    item.getBoundingClientRect = () => ({
      left: trackLeft + positions[index] - scrollLeft,
      right: trackLeft + positions[index] - scrollLeft + 486.4,
      width: 486.4,
    }) as DOMRect;
    item.scrollIntoView = () => assert.fail('carousel navigation must not scroll page ancestors');
  });
  page.window.dispatchEvent(new page.window.Event('resize'));

  page.document.querySelector<HTMLButtonElement>('[data-cinema-next]')!.click();
  assert.equal(page.document.querySelector('[data-cinema-count]')!.textContent, '02 / 03');
  assert.equal(items[1].getAttribute('aria-current'), 'true');
  track.dispatchEvent(new page.window.Event('scroll'));
  assert.equal(page.document.querySelector('[data-cinema-count]')!.textContent, '02 / 03');

  scrollLeft = requestedLeft;
  track.dispatchEvent(new page.window.Event('scroll'));
  track.dispatchEvent(new page.window.Event('scroll'));
  assert.equal(page.document.querySelector('[data-cinema-count]')!.textContent, '02 / 03');

  page.document.querySelector<HTMLButtonElement>('[data-cinema-next]')!.click();
  assert.equal(page.document.querySelector('[data-cinema-count]')!.textContent, '03 / 03');
  assert.equal(page.document.querySelector<HTMLButtonElement>('[data-cinema-next]')!.disabled, true);

  scrollLeft = requestedLeft;
  track.dispatchEvent(new page.window.Event('scroll'));
  assert.equal(scrollLeft, 227);

  contentWidth = 500;
  viewportWidth = 500;
  page.window.dispatchEvent(new page.window.Event('resize'));
  assert.equal(page.document.querySelector<HTMLButtonElement>('[data-cinema-prev]')!.disabled, true);
  assert.equal(page.document.querySelector<HTMLButtonElement>('[data-cinema-next]')!.disabled, true);
  items[2].querySelector<HTMLButtonElement>('[data-play]')!.click();
  assert.equal(page.document.querySelector('[data-cinema-count]')!.textContent, '03 / 03');
  page.cleanup();
});

function createCinemaPage() {
  let left = 0;
  const requests: ScrollToOptions[] = [];
  const page = createPage(`
    <button data-motion-toggle></button>
    <section data-cinema>
      <button data-cinema-prev>Anterior</button><button data-cinema-next>Próximo</button>
      <div data-cinema-track tabindex="0">
        <article data-cinema-item><img alt="Um" /><a href="https://www.instagram.com/">Instagram</a></article>
        <article data-cinema-item><img alt="Dois" /><button>Assistir</button></article>
        <article data-cinema-item><img alt="Três" /></article>
      </div>
      <span data-cinema-count></span>
      <button data-cinema-go="0">1</button><button data-cinema-go="1">2</button><button data-cinema-go="2">3</button>
    </section>
  `, {
    beforeInitialize(window) {
      const track = window.document.querySelector<HTMLElement>('[data-cinema-track]')!;
      Object.defineProperties(track, {
        clientWidth: { configurable: true, value: 300 },
        scrollWidth: { configurable: true, value: 900 },
        scrollLeft: { configurable: true, get: () => left, set: (value) => { left = value; } },
      });
      track.getBoundingClientRect = () => ({ left: 0, right: 300, width: 300 }) as DOMRect;
      track.scrollTo = (options) => {
        if (typeof options !== 'object') return;
        requests.push(options);
        left = options.left ?? left;
      };
      window.document.querySelectorAll<HTMLElement>('[data-cinema-item]').forEach((item, index) => {
        item.getBoundingClientRect = () => ({ left: index * 300 - left, right: index * 300 + 280 - left, width: 280 }) as DOMRect;
      });
    },
  });
  const track = page.document.querySelector<HTMLElement>('[data-cinema-track]')!;
  const pointer = (target: EventTarget, type: string, x: number, y = 0, pointerType = 'mouse') => {
    const event = new page.window.MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0 });
    Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: 1 } });
    target.dispatchEvent(event);
    return event;
  };
  return { ...page, track, requests, pointer };
}

test('cinema dots and keyboard select an item smoothly and respect reduced motion', () => {
  const page = createCinemaPage();
  page.document.querySelector<HTMLButtonElement>('[data-cinema-go="1"]')!.click();
  assert.equal(page.track.scrollLeft, 300);
  assert.equal(page.requests.at(-1)!.behavior, 'smooth');
  assert.equal(page.document.querySelector('[data-cinema-go="1"]')!.getAttribute('aria-current'), 'true');
  assert.equal(page.document.querySelector<HTMLElement>('[data-cinema]')!.style.getPropertyValue('--cinema-progress'), '0.5');
  assert.equal(page.document.querySelectorAll('[data-cinema-item].is-active').length, 1);
  page.document.querySelector<HTMLButtonElement>('[data-motion-toggle]')!.click();
  page.track.focus();
  page.track.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  assert.equal(page.requests.at(-1)!.behavior, 'auto');
  assert.equal(page.track.scrollLeft, 600);
  assert.equal(page.document.querySelector('[data-cinema-count]')!.textContent, '03 / 03');
  assert.equal(page.document.activeElement, page.track);
  page.cleanup();
});

test('desktop dragging starts after deliberate horizontal movement and preserves ordinary clicks', () => {
  const page = createCinemaPage();
  const photo = page.track.querySelector('img')!;
  page.pointer(photo, 'pointerdown', 240);
  page.pointer(page.window, 'pointermove', 237);
  assert.equal(page.track.scrollLeft, 0);
  assert.equal(page.track.classList.contains('is-dragging'), false);
  page.pointer(page.window, 'pointermove', 30);
  assert.equal(page.track.scrollLeft, 210);
  assert.equal(page.track.classList.contains('is-dragging'), true);
  page.pointer(page.window, 'pointerup', 30);
  assert.equal(page.track.scrollLeft, 300);
  assert.equal(page.track.classList.contains('is-dragging'), false);
  const dragClick = new page.window.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
  photo.dispatchEvent(dragClick);
  assert.equal(dragClick.defaultPrevented, true);

  page.pointer(photo, 'pointerdown', 100);
  page.pointer(page.window, 'pointerup', 100);
  const ordinaryClick = new page.window.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
  photo.dispatchEvent(ordinaryClick);
  assert.equal(ordinaryClick.defaultPrevented, false);
  page.cleanup();
});

test('cinema dragging never takes touch scrolling or gestures started on interactive content', () => {
  const page = createCinemaPage();
  for (const target of [page.track.querySelector('a')!, page.track.querySelector('button')!]) {
    page.pointer(target, 'pointerdown', 240);
    page.pointer(page.window, 'pointermove', 30);
    page.pointer(page.window, 'pointerup', 30);
    assert.equal(page.track.scrollLeft, 0);
  }
  const touch = page.pointer(page.track, 'pointerdown', 240, 0, 'touch');
  page.pointer(page.window, 'pointermove', 30, 0, 'touch');
  assert.equal(page.track.scrollLeft, 0);
  assert.equal(touch.defaultPrevented, false);
  page.pointer(page.window, 'pointerup', 30, 0, 'touch');
  page.pointer(page.track, 'pointerdown', 200, 200);
  page.pointer(page.window, 'pointermove', 198, 100);
  assert.equal(page.track.scrollLeft, 0);
  page.cleanup();
});

test('broken images reveal their fallback after an error or a completed zero-width load', () => {
  const page = createPage(`
    <div data-media><img id="failed-event" src="/event.webp" alt="Pudim"><div id="event-fallback" data-image-fallback hidden>Imagem indisponível</div></div>
    <div data-media><img id="failed-complete" src="/complete.webp" alt="Churros"><div id="complete-fallback" data-image-fallback hidden>Imagem indisponível</div></div>
  `, {
    beforeInitialize(window) {
      const image = window.document.querySelector<HTMLImageElement>('#failed-complete')!;
      Object.defineProperties(image, {
        complete: { configurable: true, value: true },
        naturalWidth: { configurable: true, value: 0 },
      });
    },
  });
  const eventImage = page.document.querySelector<HTMLImageElement>('#failed-event')!;
  const completeImage = page.document.querySelector<HTMLImageElement>('#failed-complete')!;

  eventImage.dispatchEvent(new page.window.Event('error'));
  assert.equal(eventImage.hidden, true);
  assert.equal(page.document.querySelector<HTMLElement>('#event-fallback')!.hidden, false);
  assert.equal(completeImage.hidden, true);
  assert.equal(page.document.querySelector<HTMLElement>('#complete-fallback')!.hidden, false);
  page.cleanup();
});

test('embed players mount only on click, remain singular, and can be closed', () => {
  const page = createPage(`
    <section data-cinema>
      <div data-cinema-track>
        <article data-cinema-item>
          <div data-media data-title="Retrato do Pudim" data-embed-url="https://www.instagram.com/p/ABC123/embed/">
            <button data-play>Assistir</button><div data-embed-host></div><button data-close-player hidden>Fechar</button>
            <p data-media-status></p><a href="https://www.instagram.com/p/ABC123/">Publicação original</a>
          </div>
        </article>
        <article data-cinema-item>
          <div data-media data-title="Retrato do Churros" data-embed-url="https://www.instagram.com/reel/XYZ789/embed/">
            <button data-play>Assistir</button><div data-embed-host></div><button data-close-player hidden>Fechar</button>
            <p data-media-status></p><a href="https://www.instagram.com/reel/XYZ789/">Publicação original</a>
          </div>
        </article>
      </div>
    </section>
  `);
  const media = [...page.document.querySelectorAll<HTMLElement>('[data-media]')];
  assert.equal(page.document.querySelectorAll('iframe').length, 0);

  media[0].querySelector<HTMLButtonElement>('[data-play]')!.click();
  const firstFrame = media[0].querySelector<HTMLIFrameElement>('iframe')!;
  assert.equal(firstFrame.src, 'https://www.instagram.com/p/ABC123/embed/');
  assert.equal(firstFrame.title, 'Retrato do Pudim');
  assert.equal(media[0].querySelector<HTMLButtonElement>('[data-close-player]')!.hidden, false);

  media[1].querySelector<HTMLButtonElement>('[data-play]')!.click();
  assert.equal(page.document.querySelectorAll('iframe').length, 1);
  assert.equal(media[0].querySelector('iframe'), null);

  media[1].querySelector<HTMLButtonElement>('[data-close-player]')!.click();
  assert.equal(page.document.querySelectorAll('iframe').length, 0);
  assert.equal(media[1].querySelector<HTMLButtonElement>('[data-close-player]')!.hidden, true);
  assert.ok(media[1].querySelector('a'));
  page.cleanup();
});

test('hiding the page or leaving the media viewport clears active playback', () => {
  const page = createPage(`
    <div data-media data-title="Vídeo local"><button data-play>Assistir</button><video data-video></video><p data-media-status></p></div>
    <div data-media data-title="Embed" data-embed-url="https://www.instagram.com/p/ABC123/embed/">
      <button data-play>Assistir</button><div data-embed-host></div><button data-close-player>Fechar</button><p data-media-status></p>
    </div>
  `);
  const [local, embed] = [...page.document.querySelectorAll<HTMLElement>('[data-media]')];
  const video = local.querySelector<HTMLVideoElement>('video')!;
  let paused = true;
  Object.defineProperty(video, 'paused', { configurable: true, get: () => paused });
  Object.defineProperty(video, 'play', {
    configurable: true,
    value: () => {
      paused = false;
      return Promise.resolve();
    },
  });
  Object.defineProperty(video, 'pause', { configurable: true, value: () => { paused = true; } });

  local.querySelector<HTMLButtonElement>('[data-play]')!.click();
  embed.querySelector<HTMLButtonElement>('[data-play]')!.click();
  assert.equal(paused, true);
  assert.ok(embed.querySelector('iframe'));

  Object.defineProperty(page.document, 'visibilityState', { configurable: true, value: 'hidden' });
  page.document.dispatchEvent(new page.window.Event('visibilitychange'));
  assert.equal(embed.querySelector('iframe'), null);

  embed.querySelector<HTMLButtonElement>('[data-play]')!.click();
  page.intersect(embed, false);
  assert.equal(embed.querySelector('iframe'), null);
  page.cleanup();
});
