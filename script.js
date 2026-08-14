/* ═══════════════════════════════════════════════════════════════
   OlympiaMUN — Main Script
   ════════════════════════════════════════════════════════════════ */

// ── Navbar scroll behaviour ─────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Mobile hamburger ────────────────────────────────────────────
const hamburger  = document.getElementById('hamburger');
const navLinks   = document.getElementById('navLinks');

if (hamburger && navLinks) {

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

}

// Close nav on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navLinks.classList.remove('open');
  });
});

// ── Hero floating particles ─────────────────────────────────────
function createParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const count = window.innerWidth < 768 ? 20 : 45;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const x    = Math.random() * 100;
    const dur  = 12 + Math.random() * 20;
    const del  = Math.random() * 15;
    const size = Math.random() > 0.7 ? 3 : 2;

    p.style.cssText = `
      left: ${x}%;
      bottom: -10px;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${dur}s;
      animation-delay: ${del}s;
      opacity: 0;
    `;
    container.appendChild(p);
  }
}
createParticles();

// ── Intersection Observer — fade-in-up ──────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el    = entry.target;
      const delay = el.dataset.delay ? parseInt(el.dataset.delay) : 0;
      setTimeout(() => {
        el.classList.add('visible');
      }, delay);
      observer.unobserve(el);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

// Attach to all animatable elements
const animTargets = document.querySelectorAll(
  '.goal-card, .committee-card, .team-card, .gallery-item, .register-card, .section-header'
);
animTargets.forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ── Registration form ───────────────────────────────────────────
async function handleFormSubmit(e) {
  e.preventDefault();

  const form  = e.target;
  const btn   = form.querySelector('button[type="submit"]');
  const toast = document.getElementById('toast');

  // Prevent double-submission
  if (btn.disabled) return;

  // Button loading state
  const originalText  = btn.textContent;
  btn.textContent     = 'Submitting…';
  btn.disabled        = true;
  btn.style.opacity   = '0.75';

  // Collect the seven form fields
  const payload = {
    name:                   form.fname.value.trim(),
    class:                  form.class.value.trim(),
    section:                form.section.value.trim(),
    email:                  form.email.value.trim(),
    phone:                  form.phone.value.trim(),
    achievements_projects:  form.achievements.value.trim(),
    committee_preference:   form.committee.value,
  };

  try {
    const response = await fetch('/api/registrations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Success — reset form and show existing toast
      form.reset();
      toast.querySelector('.toast-msg').textContent =
        'Application submitted! We shall be in touch.';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    } else {
      // Backend returned a validation or server error
      const msg = data.message || 'Submission failed. Please check your details and try again.';
      toast.querySelector('.toast-msg').textContent = msg;
      toast.classList.add('show', 'toast-error');
      setTimeout(() => {
        toast.classList.remove('show', 'toast-error');
        // Restore default message for future success toasts
        toast.querySelector('.toast-msg').textContent =
          'Application submitted! We shall be in touch.';
      }, 5000);
    }
  } catch (err) {
    // Network / server unreachable
    console.error('[Registration] Network error:', err);
    toast.querySelector('.toast-msg').textContent =
      'Could not reach the server. Please try again later.';
    toast.classList.add('show', 'toast-error');
    setTimeout(() => {
      toast.classList.remove('show', 'toast-error');
      toast.querySelector('.toast-msg').textContent =
        'Application submitted! We shall be in touch.';
    }, 5000);
  } finally {
    // Always restore the button
    btn.textContent   = originalText;
    btn.disabled      = false;
    btn.style.opacity = '';
  }
}

// ── Smooth active nav highlighting ─────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navAnchors.forEach(a => {
        a.classList.toggle(
          'active',
          a.getAttribute('href') === `#${id}`
        );
      });
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => sectionObserver.observe(s));

// ── Parallax on hero ────────────────────────────────────────────
const heroGlow = document.querySelector('.hero-glow');
let heroTicking = false;

window.addEventListener('scroll', () => {
  if (!heroGlow || heroTicking) return;

  heroTicking = true;

  requestAnimationFrame(() => {
    const y = window.scrollY * 0.25;

    heroGlow.style.transform =
      `translateX(-50%) translateY(${y}px)`;

    heroTicking = false;
  });
}, { passive: true });


document.querySelectorAll('.team-photo-img')
  .forEach(img => {
    img.addEventListener('load', () => {
      img.parentElement.classList.add('loaded');
    });
  });