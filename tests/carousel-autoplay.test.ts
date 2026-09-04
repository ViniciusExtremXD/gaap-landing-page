import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { initializeCarouselAutoplay } from '../src/scripts/carousel-autoplay';

function setup() {
  const dom = new JSDOM('<section><div data-cinema-track><a href="#">Publicação</a></div><span data-cinema-count></span><button data-cinema-auto></button></section>', { pretendToBeVisual: true });
  const win = dom.window;
  const timers = new Map<number, () => void>();
  let id = 0, advances = 0, reduced = false, hidden = false;
  let intersect: (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
  Object.defineProperty(win, 'setTimeout', { value: (callback: () => void, delay: number) => { assert.equal(delay, 5000); timers.set(++id, callback); return id; } });
  Object.defineProperty(win, 'clearTimeout', { value: (timer: number) => timers.delete(timer) });
  Object.defineProperty(win, 'IntersectionObserver', { value: class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {} disconnect() {}
  } });
  Object.defineProperty(win.document, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible' });
  const cinema = win.document.querySelector('section')!;
  const toggle = cinema.querySelector<HTMLButtonElement>('button')!;
  const control = initializeCarouselAutoplay(cinema, win.document, win as unknown as Window, () => reduced, () => { advances++; });
  return {
    win, cinema, toggle, timers, control,
    get advances() { return advances; },
    show(visible: boolean) { intersect([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); },
    tick() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); },
    reduce(value: boolean) { reduced = value; control.refreshMotion(); },
    hide(value: boolean) { hidden = value; win.document.dispatchEvent(new win.Event('visibilitychange')); },
    close() { control.cleanup(); dom.window.close(); },
  };
}

test('auto-advance runs only while visible and cancels timers for hidden tabs or reduced motion', () => {
  const page = setup();
  assert.equal(page.timers.size, 0);
  page.show(true); page.tick(); assert.equal(page.advances, 1);
  page.hide(true); assert.equal(page.timers.size, 0);
  page.hide(false); assert.equal(page.timers.size, 1);
  page.reduce(true); assert.equal(page.timers.size, 0); assert.equal(page.toggle.disabled, true);
  page.reduce(false); assert.equal(page.timers.size, 1);
  page.show(false); assert.equal(page.timers.size, 0);
  page.show(true); page.control.cleanup(); assert.equal(page.timers.size, 0);
  page.close();
});

test('hover pauses temporarily; focus and intentional interaction require explicit resumption', () => {
  const page = setup(); page.show(true);
  page.cinema.dispatchEvent(new page.win.Event('pointerenter')); assert.equal(page.timers.size, 0);
  page.cinema.dispatchEvent(new page.win.Event('pointerleave')); assert.equal(page.timers.size, 1);
  page.cinema.querySelector('a')!.dispatchEvent(new page.win.FocusEvent('focusin', { bubbles: true }));
  page.cinema.dispatchEvent(new page.win.Event('pointerleave')); assert.equal(page.timers.size, 0);
  assert.equal(page.toggle.textContent, 'Retomar carrossel');
  page.toggle.click(); page.tick(); assert.equal(page.advances, 1);
  page.toggle.click(); assert.equal(page.timers.size, 0);
  page.close();
});

test('vertical page scrolling does not permanently pause rotation, and active media never advances', () => {
  const page = setup(); page.show(true);
  page.cinema.dispatchEvent(new page.win.WheelEvent('wheel', { deltaY: 120 }));
  page.tick(); assert.equal(page.advances, 1);
  page.cinema.querySelector('[data-cinema-track]')!.classList.add('is-playing');
  page.tick(); assert.equal(page.advances, 1); assert.equal(page.timers.size, 0);
  page.close();
});
