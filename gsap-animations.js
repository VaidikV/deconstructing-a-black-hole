/* ================================================================
   GSAP Animations — Article entrance & scroll reveals
   ================================================================ */

(function () {
  'use strict';

  /* ── Hero entrance ───────────────────────────────────────────── */
  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTL
    .from('.hero__title', {
      opacity: 0, y: 30, duration: 1.2, delay: 0.3
    })
    .from('.hero__sub', {
      opacity: 0, y: 20, duration: 0.9
    }, '-=0.7')
    .from('.hero__scroll', {
      opacity: 0, duration: 0.8
    }, '-=0.5');

  /* ── Scroll reveals for article sections ─────────────────────── */
  const sections = document.querySelectorAll('.article__section');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        gsap.to(el, {
          opacity: 1, y: 0,
          duration: 0.8,
          ease: 'power2.out'
        });
        revealObserver.unobserve(el);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  sections.forEach(section => {
    gsap.set(section, { opacity: 0, y: 40 });
    revealObserver.observe(section);
  });

  /* ── Hide scroll hint once user scrolls ──────────────────────── */
  const scrollHint = document.querySelector('.hero__scroll');
  if (scrollHint) {
    let hidden = false;
    window.addEventListener('scroll', () => {
      if (!hidden && window.scrollY > 80) {
        gsap.to(scrollHint, { opacity: 0, duration: 0.6 });
        hidden = true;
      }
    }, { passive: true });
  }
})();
