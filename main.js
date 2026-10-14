/* ============================================================
   Tandil Tech Week 2026 — Interactividad
   Vanilla JS, sin dependencias. Módulos independientes con IIFE.
   ============================================================ */

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

  toggle?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    apply(next);
    localStorage.setItem(KEY, next);
  });
})();

/* ---------- 1. Contador regresivo (event start) ---------- */
const countdown = (() => {
  // Inicio del evento: 14 de octubre de 2026, 09:00 (GMT-3)
  const TARGET = new Date('2026-10-14T09:00:00-03:00').getTime();

  const $ = (id) => document.getElementById(id);
  const els = {
    days: $('cd-days'),
    hours: $('cd-hours'),
    mins: $('cd-mins'),
    secs: $('cd-secs'),
  };

  const pad = (n) => String(n).padStart(2, '0');

  const render = ({ days, hours, mins, secs }) => {
    els.days.textContent = pad(days);
    els.hours.textContent = pad(hours);
    els.mins.textContent = pad(mins);
    els.secs.textContent = pad(secs);
  };

  const stop = () => {
    Object.values(els).forEach((el) => {
      el.textContent = '00';
    });
  };

  const tick = () => {
    const diff = TARGET - Date.now();

    if (diff <= 0) {
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

  // Cierra el menú al elegir un enlace (y compensa el header fijo)
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    closeMenu();

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
