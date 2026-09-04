import { initializeScrollMotion } from './scroll-motion';
import { initializeCarouselAutoplay } from './carousel-autoplay';

type MotionPreference = 'full' | 'reduced';

const MOTION_STORAGE_KEY = 'gaap-motion';
const EMBED_URL = /^https:\/\/www\.instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/embed\/?$/;

function listen(
  target: EventTarget,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions | boolean,
) {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

export function initializeSite(doc: Document, win: Window): () => void {
  const cleanups: Array<() => void> = [];
  const motionRefreshers: Array<() => void> = [];
  const observers: IntersectionObserver[] = [];
  const root = doc.documentElement;
  const IntersectionObserverConstructor = (
    win as Window & { IntersectionObserver?: typeof IntersectionObserver }
  ).IntersectionObserver;

  const menuToggle = doc.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const mobileMenu = doc.querySelector<HTMLElement>('[data-mobile-menu]');
  if (menuToggle && mobileMenu) {
    const setMenuOpen = (open: boolean, restoreFocus = false) => {
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      mobileMenu.hidden = !open;
      root.classList.toggle('has-open-menu', open);
      if (!open && restoreFocus) menuToggle.focus();
    };

    setMenuOpen(menuToggle.getAttribute('aria-expanded') === 'true');
    cleanups.push(
      listen(menuToggle, 'click', () => {
        setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
      }),
      listen(doc, 'keydown', (event) => {
        if ((event as KeyboardEvent).key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
          setMenuOpen(false, true);
        }
      }),
      listen(mobileMenu, 'click', (event) => {
        if ((event.target as Element).closest('a[href]')) setMenuOpen(false);
      }),
      listen(win, 'resize', () => {
        if (win.innerWidth >= 1181 && menuToggle.getAttribute('aria-expanded') === 'true') setMenuOpen(false);
      }, { passive: true }),
    );
  }

  const albums = [...doc.querySelectorAll<HTMLElement>('[data-album]')];
  const albumItems = [...doc.querySelectorAll<HTMLElement>('[data-album-item]')];
  const albumTilts = new Map(albumItems.map((item) => [item, item.style.getPropertyValue('--tilt')]));
  const careSections = [...doc.querySelectorAll<HTMLElement>('[data-care-section]')];
  const carePaths = [...doc.querySelectorAll<SVGPathElement>('[data-care-path]')];
  const motionToggles = [...doc.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]')];

  carePaths.forEach((path) => {
    path.setAttribute('pathLength', '1');
    path.style.strokeDasharray = '1';
    path.style.strokeDashoffset = 'calc(1 - var(--care-progress))';
  });

  const readStoredMotion = (): MotionPreference | null => {
    try {
      const stored = win.localStorage.getItem(MOTION_STORAGE_KEY);
      return stored === 'full' || stored === 'reduced' ? stored : null;
    } catch {
      return null;
    }
  };

  // This explicit demonstration link overrides saved/system preferences for this site only.
  const requestedMotion = new URL(win.location.href).searchParams.get('motion');
  const demoMotion = requestedMotion === 'full' ? 'full' : null;
  if (demoMotion) {
    try { win.localStorage.setItem(MOTION_STORAGE_KEY, demoMotion); } catch { /* session still works */ }
    try {
      const url = new URL(win.location.href);
      url.searchParams.delete('motion');
      win.history.replaceState(win.history.state, '', url.href);
    } catch { /* query is optional to remove */ }
  }
  const storedMotion = demoMotion ?? readStoredMotion();
  const systemMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let hasManualMotion = storedMotion !== null;
  let motion: MotionPreference = storedMotion ?? (systemMotion?.matches ? 'reduced' : 'full');
  let scrollMotion: ReturnType<typeof initializeScrollMotion> | undefined;

  const renderMotion = () => {
    root.dataset.motion = motion;
    const reduced = motion === 'reduced';
    motionToggles.forEach((toggle) => {
      toggle.setAttribute('aria-pressed', String(reduced));
      const label = toggle.querySelector<HTMLElement>('[data-motion-label]');
      if (label) label.textContent = 'Reduzir movimentos';
      const quickLabel = toggle.querySelector<HTMLElement>('[data-motion-quick-label]');
      if (quickLabel) {
        toggle.removeAttribute('aria-pressed');
        quickLabel.textContent = reduced ? 'Ativar animações' : 'Pausar animações';
      }
    });

    if (reduced) {
      albums.forEach((album) => album.classList.add('is-settled'));
      albumItems.forEach((item) => item.style.setProperty('--tilt', '0deg'));
      root.style.setProperty('--care-progress', '1');
    } else {
      albumItems.forEach((item) => {
        const tilt = albumTilts.get(item);
        if (tilt) item.style.setProperty('--tilt', tilt);
        else item.style.removeProperty('--tilt');
      });
    }
    scrollMotion?.refreshMotion();
    motionRefreshers.forEach(refresh => refresh());
  };

  renderMotion();
  scrollMotion = initializeScrollMotion(doc, win, () => motion === 'reduced');
  cleanups.push(scrollMotion.cleanup);
  if (systemMotion) {
    const followSystemMotion = (event: MediaQueryListEvent) => {
      if (hasManualMotion) return;
      motion = event.matches ? 'reduced' : 'full';
      renderMotion();
    };
    systemMotion.addEventListener('change', followSystemMotion);
    cleanups.push(() => systemMotion.removeEventListener('change', followSystemMotion));
  }
  motionToggles.forEach((toggle) => {
    cleanups.push(
      listen(toggle, 'click', () => {
        motion = motion === 'reduced' ? 'full' : 'reduced';
        hasManualMotion = true;
        try {
          win.localStorage.setItem(MOTION_STORAGE_KEY, motion);
        } catch {
          // Storage can be disabled; the preference still applies for this visit.
        }
        renderMotion();
      }),
    );
  });

  if (IntersectionObserverConstructor) {
    if (albums.length) {
      const albumObserver = new IntersectionObserverConstructor(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).classList.add('is-settled');
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.22 },
      );
      albums.forEach((album) => albumObserver.observe(album));
      observers.push(albumObserver);
    }

    if (careSections.length) {
      const careObserver = new IntersectionObserverConstructor(
        (entries) => {
          if (motion === 'reduced') return;
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .reduce((maximum, entry) => Math.max(maximum, entry.intersectionRatio), 0);
          root.style.setProperty('--care-progress', String(Math.min(1, Math.max(0, visible))));
        },
        { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
      );
      careSections.forEach((section) => careObserver.observe(section));
      observers.push(careObserver);
    }
  } else {
    albums.forEach((album) => album.classList.add('is-settled'));
    root.style.setProperty('--care-progress', '1');
  }

  const mediaContainers = [...doc.querySelectorAll<HTMLElement>('[data-media]')];

  const setMediaStatus = (media: HTMLElement, message = '') => {
    const status = media.querySelector<HTMLElement>('[data-media-status]');
    if (status) status.textContent = message;
  };

  const removeEmbed = (media: HTMLElement) => {
    media.querySelector<HTMLIFrameElement>('[data-embed-host] iframe')?.remove();
    media.classList.remove('is-playing');
    media.querySelector<HTMLButtonElement>('[data-play]')?.removeAttribute('hidden');
    const closeButton = media.querySelector<HTMLButtonElement>('[data-close-player]');
    if (closeButton) closeButton.hidden = true;
  };

  const stopMedia = (media: HTMLElement) => {
    const video = media.querySelector<HTMLVideoElement>('[data-video]');
    if (video && !video.paused) video.pause();
    removeEmbed(media);
  };

  const stopOthers = (current?: HTMLElement) => {
    mediaContainers.forEach((media) => {
      if (media !== current) stopMedia(media);
    });
  };

  const mountEmbed = (media: HTMLElement) => {
    const host = media.querySelector<HTMLElement>('[data-embed-host]');
    const source = media.dataset.embedUrl;
    if (!host || !source || !EMBED_URL.test(source)) {
      setMediaStatus(media, 'Não foi possível abrir este vídeo aqui. Use o link da publicação.');
      return;
    }

    stopOthers(media);
    removeEmbed(media);
    const iframe = doc.createElement('iframe');
    iframe.src = source;
    iframe.title = media.dataset.title || 'Vídeo do GAAP no Instagram';
    iframe.loading = 'eager';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.addEventListener('error', () => {
      setMediaStatus(media, 'O player não respondeu. Você ainda pode abrir a publicação original.');
    });
    host.replaceChildren(iframe);
    media.classList.add('is-playing');
    media.querySelector<HTMLButtonElement>('[data-play]')?.setAttribute('hidden', '');
    const closeButton = media.querySelector<HTMLButtonElement>('[data-close-player]');
    if (closeButton) closeButton.hidden = false;
    setMediaStatus(media);
  };

  mediaContainers.forEach((media) => {
    const photo = media.querySelector<HTMLImageElement>('img');
    const photoFallback = media.querySelector<HTMLElement>('[data-image-fallback]');
    if (photo && photoFallback) {
      const showPhotoFallback = () => { photo.hidden = true; photoFallback.hidden = false; };
      cleanups.push(listen(photo, 'error', showPhotoFallback));
      if (photo.complete && photo.naturalWidth === 0) showPhotoFallback();
    }
    const video = media.querySelector<HTMLVideoElement>('[data-video]');
    const playButton = media.querySelector<HTMLButtonElement>('[data-play]');
    const closeButton = media.querySelector<HTMLButtonElement>('[data-close-player]');

    if (video) {
      video.setAttribute('playsinline', '');
      video.removeAttribute('autoplay');
      cleanups.push(
        listen(video, 'play', () => {
          stopOthers(media);
          media.classList.add('is-playing');
          setMediaStatus(media);
        }),
        listen(video, 'pause', () => media.classList.remove('is-playing')),
      );
    }

    if (playButton) {
      cleanups.push(
        listen(playButton, 'click', () => {
          if (!video) {
            mountEmbed(media);
            return;
          }

          if (!video.paused) {
            video.pause();
            return;
          }

          stopOthers(media);
          setMediaStatus(media);
          const result = video.play();
          if (result) {
            void result.catch(() => {
              media.classList.remove('is-playing');
              setMediaStatus(media, 'Não foi possível reproduzir o vídeo. Tente os controles do player.');
            });
          }
        }),
      );
    }

    if (closeButton) {
      cleanups.push(
        listen(closeButton, 'click', () => {
          stopMedia(media);
          playButton?.focus();
        }),
      );
    }
  });

  if (IntersectionObserverConstructor && mediaContainers.length) {
    const mediaObserver = new IntersectionObserverConstructor(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) stopMedia(entry.target as HTMLElement);
        });
      },
      { threshold: 0.08 },
    );
    mediaContainers.forEach((media) => mediaObserver.observe(media));
    observers.push(mediaObserver);
  }

  cleanups.push(
    listen(doc, 'visibilitychange', () => {
      if (doc.visibilityState === 'hidden') mediaContainers.forEach(stopMedia);
    }),
  );

  doc.querySelectorAll<HTMLElement>('[data-cinema]').forEach((cinema) => {
    const track = cinema.querySelector<HTMLElement>('[data-cinema-track]');
    const items = [...cinema.querySelectorAll<HTMLElement>('[data-cinema-item]')];
    const previous = cinema.querySelector<HTMLButtonElement>('[data-cinema-prev]');
    const next = cinema.querySelector<HTMLButtonElement>('[data-cinema-next]');
    const count = cinema.querySelector<HTMLElement>('[data-cinema-count]');
    const dots = [...cinema.querySelectorAll<HTMLButtonElement>('[data-cinema-go]')];
    if (!track || !items.length) return;

    const edgeTolerance = 2;
    let activeIndex = 0;
    let pendingTarget: { index: number; left: number } | null = null;
    const maximumScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const itemStart = (index: number) => {
      const trackRect = track.getBoundingClientRect();
      const itemRect = items[index].getBoundingClientRect();
      return itemRect.left - trackRect.left + track.scrollLeft;
    };

    const renderIndex = (index: number) => {
      if (index !== activeIndex) {
        items.forEach((item, index) => {
          if (index !== activeIndex) return;
          item.querySelectorAll<HTMLElement>('[data-media]').forEach(stopMedia);
        });
      }
      activeIndex = index;
      items.forEach((item, index) => {
        item.classList.toggle('is-active', index === activeIndex);
        if (index === activeIndex) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
      });
      dots.forEach((dot) => {
        const selected = Number(dot.dataset.cinemaGo) === activeIndex;
        if (selected) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      cinema.style.setProperty('--cinema-progress', String(items.length > 1 ? activeIndex / (items.length - 1) : 1));
      if (count) count.textContent = `${twoDigits(activeIndex + 1)} / ${twoDigits(items.length)}`;
      const canScroll = maximumScroll() > edgeTolerance;
      track.classList.toggle('is-draggable', canScroll);
      if (previous) previous.disabled = !canScroll || activeIndex === 0;
      if (next) next.disabled = !canScroll || activeIndex === items.length - 1;
    };

    const indexAtScrollPosition = () => {
      const maxScroll = maximumScroll();
      if (maxScroll <= edgeTolerance) return activeIndex;
      const left = Math.min(maxScroll, Math.max(0, track.scrollLeft));
      if (left <= edgeTolerance) return 0;
      if (left >= maxScroll - edgeTolerance) return items.length - 1;
      return items.reduce((nearest, _item, index) =>
        Math.abs(itemStart(index) - left) < Math.abs(itemStart(nearest) - left) ? index : nearest, 0);
    };

    const updateFromScroll = () => {
      if (pendingTarget) {
        renderIndex(pendingTarget.index);
        return;
      }
      renderIndex(indexAtScrollPosition());
    };

    const goTo = (index: number) => {
      const targetIndex = Math.min(items.length - 1, Math.max(0, index));
      const maxScroll = maximumScroll();
      if (maxScroll <= edgeTolerance) {
        renderIndex(activeIndex);
        return;
      }
      const left = Math.min(maxScroll, Math.max(0, itemStart(targetIndex)));
      pendingTarget = { index: targetIndex, left };
      renderIndex(targetIndex);
      track.scrollTo({
        left,
        behavior: motion === 'reduced' ? 'auto' : 'smooth',
      });
    };

    const cancelPendingTarget = () => {
      pendingTarget = null;
    };
    const updateForResize = () => {
      pendingTarget = null;
      renderIndex(activeIndex);
      if (maximumScroll() > edgeTolerance) {
        const left = Math.min(maximumScroll(), Math.max(0, itemStart(activeIndex)));
        pendingTarget = { index: activeIndex, left };
        track.scrollTo({ left, behavior: 'auto' });
      }
    };

    let drag: { id: number; x: number; y: number; left: number; moved: boolean } | null = null;
    let suppressClick = false;
    let originalSnap = '';
    let originalBehavior = '';
    const restoreDragStyles = () => {
      track.classList.remove('is-dragging');
      track.style.scrollSnapType = originalSnap;
      track.style.scrollBehavior = originalBehavior;
    };
    const releaseDrag = (event: Event) => {
      if (!drag || (event as PointerEvent).pointerId !== drag.id) return;
      const previousDrag = drag;
      drag = null;
      if (track.hasPointerCapture?.(previousDrag.id)) track.releasePointerCapture(previousDrag.id);
      if (!previousDrag.moved) return;
      restoreDragStyles();
      suppressClick = event.type !== 'pointercancel';
      goTo(indexAtScrollPosition());
    };

    renderIndex(0);
    cleanups.push(
      listen(track, 'scroll', updateFromScroll, { passive: true }),
      listen(track, 'pointerdown', cancelPendingTarget, { passive: true }),
      listen(track, 'touchstart', cancelPendingTarget, { passive: true }),
      listen(track, 'wheel', cancelPendingTarget, { passive: true }),
      listen(track, 'pointerdown', (event) => {
        const pointer = event as PointerEvent;
        suppressClick = false;
        if (!['mouse', 'pen'].includes(pointer.pointerType) || pointer.button !== 0 || maximumScroll() <= edgeTolerance) return;
        if ((pointer.target as Element).closest('a, button, input, select, textarea, video, iframe, summary, [contenteditable], [role="button"], [data-no-drag]')) return;
        drag = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, left: track.scrollLeft, moved: false };
      }),
      listen(win, 'pointermove', (event) => {
        const pointer = event as PointerEvent;
        if (!drag || pointer.pointerId !== drag.id) return;
        const deltaX = pointer.clientX - drag.x;
        const deltaY = pointer.clientY - drag.y;
        if (!drag.moved) {
          if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
            drag = null;
            return;
          }
          if (Math.abs(deltaX) < 7 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
          drag.moved = true;
          originalSnap = track.style.scrollSnapType;
          originalBehavior = track.style.scrollBehavior;
          track.style.scrollSnapType = 'none';
          track.style.scrollBehavior = 'auto';
          track.classList.add('is-dragging');
          track.setPointerCapture?.(pointer.pointerId);
        }
        pointer.preventDefault();
        track.scrollLeft = Math.min(maximumScroll(), Math.max(0, drag.left - deltaX));
      }),
      listen(win, 'pointerup', releaseDrag),
      listen(win, 'pointercancel', releaseDrag),
      listen(track, 'lostpointercapture', releaseDrag),
      listen(track, 'dragstart', (event) => {
        if (drag) event.preventDefault();
      }),
      listen(track, 'click', (event) => {
        if (!suppressClick || (event as MouseEvent).detail === 0) return;
        suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true),
      listen(track, 'click', (event) => {
        const target = event.target as Element;
        if (!target.closest('[data-play]')) return;
        const item = target.closest<HTMLElement>('[data-cinema-item]');
        const index = item ? items.indexOf(item) : -1;
        if (index >= 0) {
          pendingTarget = null;
          renderIndex(index);
        }
      }),
      listen(win, 'resize', updateForResize, { passive: true }),
      listen(track, 'keydown', (event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (doc.activeElement !== track) return;
        if (keyboardEvent.key === 'ArrowRight') {
          keyboardEvent.preventDefault();
          goTo(activeIndex + 1);
        } else if (keyboardEvent.key === 'ArrowLeft') {
          keyboardEvent.preventDefault();
          goTo(activeIndex - 1);
        }
      }),
    );
    if (previous) cleanups.push(listen(previous, 'click', () => goTo(activeIndex - 1)));
    if (next) cleanups.push(listen(next, 'click', () => goTo(activeIndex + 1)));
    dots.forEach((dot) => cleanups.push(listen(dot, 'click', () => {
      const index = Number(dot.dataset.cinemaGo);
      if (Number.isInteger(index) && index >= 0 && index < items.length) goTo(index);
    })));
    const autoplay = initializeCarouselAutoplay(cinema, doc, win, () => motion === 'reduced',
      () => goTo((activeIndex + 1) % items.length));
    motionRefreshers.push(autoplay.refreshMotion);
    cleanups.push(autoplay.cleanup);
    cleanups.push(() => {
      if (drag?.moved) restoreDragStyles();
      drag = null;
    });
  });

  return () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    observers.forEach((observer) => observer.disconnect());
    mediaContainers.forEach(stopMedia);
  };
}

declare global {
  interface Window {
    __gaapSiteInitialized?: boolean;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__gaapSiteInitialized) {
  window.__gaapSiteInitialized = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeSite(document, window), { once: true });
  } else {
    initializeSite(document, window);
  }
}
