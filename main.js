/* ============================================================
   Tandil Tech Week 2026 — Interactividad
   Vanilla JS, sin dependencias. Módulos independientes con IIFE.
   ============================================================ */

/* Capabilities del entorno (respetan al usuario) */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

/* ---------- 0. Tema: modo oscuro / claro ---------- */
const theme = (() => {
  const KEY = 'ttw-theme';
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');

  const apply = (name) => {
    root.dataset.theme = name;
    toggle?.setAttribute('aria-pressed', String(name === 'light'));
  };

  apply(localStorage.getItem(KEY) ?? 'dark');

  toggle?.addEventListener('click', (e) => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';

    // Revelado circular desde el botón (View Transitions API, con fallback)
    if (document.startViewTransition && !REDUCED) {
      root.style.setProperty('--vt-x', `${e.clientX ?? window.innerWidth / 2}px`);
      root.style.setProperty('--vt-y', `${e.clientY ?? 0}px`);
      document.startViewTransition(() => apply(next));
    } else {
      apply(next);
    }

    localStorage.setItem(KEY, next);
  });
})();

/* ---------- 1. Contador regresivo (próximo evento) ---------- */
const countdown = (() => {
  // Fechas oficiales (schema.org del sitio original, GMT-3)
  const EVENTS = [
    { name: 'Hacking Day', date: '2026-10-14T09:00:00-03:00' },
    { name: 'Startup Day', date: '2026-10-15T09:00:00-03:00' },
  ];
  const NEXT_EDITION = { name: 'TTW 2027', date: '2027-10-14T09:00:00-03:00' };

  const $ = (id) => document.getElementById(id);
  const els = {
    days: $('cd-days'),
    hours: $('cd-hours'),
    mins: $('cd-mins'),
    secs: $('cd-secs'),
  };
  const label = $('cd-target');

  const pad = (n) => String(n).padStart(2, '0');

  // El próximo evento es el primero cuya fecha aún no llegó
  const nextEvent = () => {
    const now = Date.now();
    return EVENTS.find((ev) => new Date(ev.date).getTime() > now) ?? NEXT_EDITION;
  };

  let target = nextEvent();
  label.innerHTML = 'Próximo evento · <strong></strong>';
  label.querySelector('strong').textContent = target.name;

  const render = ({ days, hours, mins, secs }) => {
    // Escribe y "popea" solo el dígito que cambió
    const write = (el, value) => {
      if (el.textContent === value) return;
      el.textContent = value;
      el.classList.remove('pop');
      void el.offsetWidth; // reinicia la animación
      el.classList.add('pop');
    };

    write(els.days, pad(days));
    write(els.hours, pad(hours));
    write(els.mins, pad(mins));
    write(els.secs, pad(secs));
  };

  const stop = () => {
    Object.values(els).forEach((el) => {
      el.textContent = '00';
    });
  };

  const tick = () => {
    const diff = new Date(target.date).getTime() - Date.now();

    if (diff <= 0) {
      // Si el evento empezó, salta al siguiente sin detener el timer
      const next = nextEvent();
      if (next.date !== target.date) {
        target = next;
        label.querySelector('strong').textContent = target.name;
        tick();
        return;
      }
      stop();
      clearInterval(timer);
      return;
    }

    render({
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor(diff / 3_600_000) % 24,
      mins: Math.floor(diff / 60_000) % 60,
      secs: Math.floor(diff / 1_000) % 60,
    });
  };

  let timer = setInterval(tick, 1_000);
  tick();
})();

/* ---------- 2. Pestañas del cronograma (por día) ---------- */
const dayTabs = (() => {
  const tabs = [...document.querySelectorAll('.day-tab')];
  const panels = [...document.querySelectorAll('.day-panel')];

  const activate = (tab) => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });

    panels.forEach((panel) => {
      const show = panel.id === tab.getAttribute('aria-controls');
      panel.classList.toggle('is-active', show);
      panel.hidden = !show;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab));

    // Navegación por teclado con flechas
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      activate(next);
    });
  });
})();

/* ---------- 3. Header: blur/compactación al hacer scroll ---------- */
const header = document.querySelector('.site-header');

const onScrollHeader = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 24);
};

window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

/* ---------- 4. Animaciones de aparición (IntersectionObserver) ---------- */
(() => {
  const items = [...document.querySelectorAll('.reveal')];

  // Stagger para las líneas del título: cascade
  document.querySelectorAll('.hero-title .line').forEach((line, i) => {
    line.style.setProperty('--i', i);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => observer.observe(el));
})();

/* ---------- 5. Navegación: menú móvil + link activo + scroll suave ---------- */
(() => {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Scroll suave con offset del header, delegado a toda la página
  // (enlaces del header, de la tab bar y del brand)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    if (nav.contains(link)) closeMenu();

    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  });

  // Resalta la sección visible en el header y en la fancy tab bar
  const tabbar = document.getElementById('tab-bar');
  const indicator = tabbar?.querySelector('.tab-indicator');

  const links = [...document.querySelectorAll('.site-nav a[href^="#"], .tab-bar a[href^="#"]')];
  const sections = [...new Set(links.map((link) => link.getAttribute('href')))]
    .map((hash) => document.querySelector(hash))
    .filter(Boolean);

  let current = '#hero';

  // Sincroniza links activos y mueve la píldora indicadora de la tab bar
  const sync = () => {
    links.forEach((link) =>
      link.classList.toggle('is-active', link.getAttribute('href') === current)
    );

    if (!indicator) return;
    const activeTab = tabbar.querySelector(`a[href="${current}"]`);
    if (!activeTab) return;
    tabbar.classList.add('is-ready');
    indicator.style.width = `${activeTab.offsetWidth}px`;
    indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
  };

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        current = `#${entry.target.id}`;
        sync();
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  sections.forEach((section) => spy.observe(section));
  sync();

  // Reubica la píldora si la ventana cambia de tamaño
  window.addEventListener('resize', sync, { passive: true });
})();

/* ---------- 6. Menú horizontal del historial: arrastre ---------- */
(() => {
  const track = document.getElementById('work-menu');
  if (!track) return;

  let isDown = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  track.addEventListener('pointerdown', (e) => {
    isDown = true;
    moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) {
      moved = true;
      track.classList.add('is-dragging');
    }
    track.scrollLeft = startScroll - dx;
  });

  const release = () => {
    isDown = false;
    track.classList.remove('is-dragging');
  };

  track.addEventListener('pointerup', release);
  track.addEventListener('pointerleave', release);

  // Evita navegar si el gesto fue un arrastre, no un click
  track.addEventListener('click', (e) => {
    if (moved) e.preventDefault();
  });

  // La rueda vertical scrollea el menú horizontal (si no está en un borde,
  // para no "atrapar" el scroll de la página)
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const goingRight = e.deltaY > 0;
    const atEdge = goingRight ? track.scrollLeft >= maxScroll - 1 : track.scrollLeft <= 1;
    if (atEdge) return;
    e.preventDefault();
    track.scrollLeft += e.deltaY;
  }, { passive: false });
})();

/* ---------- 7. Registro: validación en tiempo real ---------- */
(() => {
  const form = document.getElementById('register-form');
  const status = document.getElementById('form-status');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const messages = {
    'f-name': 'Ingresá tu nombre y apellido (mínimo 3 caracteres).',
    'f-email': 'Ingresá un email válido, ej: vos@ejemplo.com',
    day: 'Elegí al menos una jornada.',
  };

  // Validadores por campo: inputs por id, radios de "day" como grupo
  const validators = {
    'f-name': (input) => input.value.trim().length >= 3,
    'f-email': (input) => EMAIL_RE.test(input.value.trim()),
    day: () => form.querySelector('input[name="day"]:checked') !== null,
  };

  const validateRadioGroup = () => {
    const field = form.querySelector('.field-choice');
    const ok = validators.day();
    field.classList.toggle('is-invalid', !ok);
    field.classList.toggle('is-valid', ok);
    field.querySelector('.field-error').textContent = ok ? '' : messages.day;
    return ok;
  };

  const validateInput = (input) => {
    const field = input.closest('.field');
    const ok = validators[input.id](input);
    field.classList.toggle('is-invalid', !ok);
    field.classList.toggle('is-valid', ok);
    field.querySelector('.field-error').textContent = ok ? '' : messages[input.id];
    return ok;
  };

  // Validación en tiempo real: al perder foco y al reescribir si había error
  const inputs = [...form.querySelectorAll('input')];

  inputs.forEach((input) => {
    if (input.type === 'radio') {
      input.addEventListener('change', validateRadioGroup);
      return;
    }

    input.addEventListener('blur', () => validateInput(input));

    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('is-invalid')) {
        validateInput(input);
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameOk = validateInput(document.getElementById('f-name'));
    const emailOk = validateInput(document.getElementById('f-email'));
    const dayOk = validateRadioGroup();

    if (!nameOk || !emailOk || !dayOk) {
      status.textContent = 'Revisá los campos marcados.';
      status.className = 'form-status is-error';
      return;
    }

    // Sin backend: confirmamos el registro localmente
    form.reset();
    form.querySelectorAll('.field').forEach((field) => field.classList.remove('is-valid', 'is-invalid'));
    status.textContent = '¡Listo! Te vamos a avisar cuando abran las inscripciones.';
    status.className = 'form-status is-ok';
  });
})();

/* ---------- 8. Stagger: escalona la aparición de grids ---------- */
(() => {
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
  });
})();

/* ---------- 9. Barra de progreso de scroll ---------- */
(() => {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });
  update();
})();

/* ---------- 10. Texto "decode/scramble" en los eyebrows ---------- */
(() => {
  const GLYPHS = '!<>-_\\/[]{}=+*^?#';

  const scramble = (el) => {
    if (el.dataset.scrambled) return;
    el.dataset.scrambled = 'true';
    const original = el.textContent;
    let frame = 0;

    const run = () => {
      frame += 1;
      const locked = Math.floor(frame * 0.7);
      el.textContent = [...original]
        .map((ch, i) => (i < locked || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('');
      if (locked < original.length) requestAnimationFrame(run);
      else el.textContent = original;
    };

    run();
  };

  if (REDUCED) return;

  const targets = document.querySelectorAll('.section-eyebrow, .hero-eyebrow');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      scramble(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  targets.forEach((el) => io.observe(el));
})();

/* ---------- 11. Cursor personalizado (solo puntero fino) ---------- */
(() => {
  if (!FINE_POINTER || REDUCED) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(ring, dot);
  document.body.classList.add('has-cursor');

  const interactive = 'a, button, input, textarea, select, .work-link, .choice';
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
  }, { passive: true });

  document.addEventListener('mouseover', (e) => {
    const hovering = Boolean(e.target.closest(interactive));
    dot.classList.toggle('is-hover', hovering);
    ring.classList.toggle('is-hover', hovering);
  });

  window.addEventListener('mousedown', () => ring.classList.add('is-down'));
  window.addEventListener('mouseup', () => ring.classList.remove('is-down'));

  const loop = () => {
    // Anillo con inercia (lerp): sigue al punto con retardo suave
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  };

  loop();
})();

/* ---------- 12. Botones magnéticos ---------- */
(() => {
  if (!FINE_POINTER || REDUCED) return;

  const STRENGTH = 6;

  document.querySelectorAll('.btn, .social-btn, .theme-toggle').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.translate = `${x * STRENGTH / 2}px ${y * STRENGTH / 2}px`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.translate = '0px 0px';
    });
  });
})();

/* ---------- 13. Tilt 3D en las cards de sponsors ---------- */
(() => {
  if (!FINE_POINTER || REDUCED) return;

  document.querySelectorAll('.sponsor-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
})();

/* ---------- 14. Easter egg: escribí "ttw" en cualquier lado ---------- */
(() => {
  const CODE = 'ttw';
  let buffer = '';
  let resetTimer;

  const toast = (message) => {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  };

  window.addEventListener('keydown', (e) => {
    if (REDUCED || e.target.closest('input, textarea')) return;

    buffer = (buffer + e.key.toLowerCase()).slice(-CODE.length);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (buffer = ''), 1200);

    if (buffer !== CODE) return;
    buffer = '';

    document.documentElement.classList.add('party-mode');
    toast('Modo fiesta desbloqueado 🎉');
    setTimeout(() => document.documentElement.classList.remove('party-mode'), 6000);
  });
})();
