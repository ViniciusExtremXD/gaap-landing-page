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

  return { dom, window, document: window.document, cleanup, intersect, setReducedMotion };
}

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
