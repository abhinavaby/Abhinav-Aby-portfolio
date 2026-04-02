(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Footer year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Smooth scroll for buttons/links
  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest && e.target.closest("[data-scroll-to]");
    if (!btn) return;

    const to = btn.getAttribute("data-scroll-to");
    if (!to) return;

    const target = document.querySelector(to);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Smooth scroll for in-page anchors
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href === "#") return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Intersection observer to mark active nav item
  const navLinks = $$(".nav__link");
  const sections = navLinks
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  if (navLinks.length && sections.length && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!visible) return;

        const id = visible.target.getAttribute("id");
        navLinks.forEach((l) => {
          l.classList.toggle("is-active", l.getAttribute("href") === `#${id}`);
        });
      },
      { root: null, threshold: [0.15, 0.25, 0.4], rootMargin: "-20% 0px -60% 0px" }
    );

    sections.forEach((s) => obs.observe(s));
  }

  // Scroll-driven hero animation + reveal effects
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  const hero = $("#home");
  const topbar = $(".topbar");
  if (hero && !reduceMotion) {
    // Smooth (lerped) progress -> more premium feel than raw scroll.
    let targetP = 0;
    let currentP = 0;
    let lastT = 0;
    let raf = 0;

    const computeTarget = () => {
      const start = hero.offsetTop;
      const max = start + hero.offsetHeight - window.innerHeight;
      const denom = Math.max(1, max - start);
      targetP = clamp01((window.scrollY - start) / denom);
      if (topbar) topbar.classList.toggle("is-scrolled", targetP > 0.06);
      if (!raf) raf = window.requestAnimationFrame(tick);
    };

    const tick = (t) => {
      raf = 0;
      const dt = Math.min(64, Math.max(0, (t || 0) - (lastT || t || 0)));
      lastT = t || lastT;

      // Time-based smoothing (consistent across refresh rates)
      // Approach: exponential decay toward target with time constant ~120ms.
      const tau = 120;
      const alpha = 1 - Math.exp(-dt / tau);
      currentP += (targetP - currentP) * alpha;
      if (Math.abs(targetP - currentP) < 0.0006) currentP = targetP;
      hero.style.setProperty("--p", String(currentP));
      if (currentP !== targetP) raf = window.requestAnimationFrame(tick);
    };

    computeTarget();
    window.addEventListener("scroll", computeTarget, { passive: true });
    window.addEventListener("resize", computeTarget);
  }

  const revealEls = $$("[data-reveal]");
  if (revealEls.length && "IntersectionObserver" in window) {
    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add("in-view"));
    } else {
      // Stagger reveals based on document order for a smoother feel.
      revealEls.forEach((el, idx) => {
        el.style.setProperty("--d", `${Math.min(520, idx * 55)}ms`);
      });

      // Per-card stagger (Projects etc.) so inner elements cascade nicely.
      $$(".card[data-stagger]").forEach((card) => {
        const items = Array.from(card.querySelectorAll("[data-reveal]"));
        items.forEach((el, i) => el.style.setProperty("--d", `${Math.min(520, i * 70)}ms`));
      });

      const revealObs = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              en.target.classList.add("in-view");
              revealObs.unobserve(en.target);
            }
          }
        },
        { threshold: 0.12 }
      );

      revealEls.forEach((el) => revealObs.observe(el));
    }
  }

  // Projects: expand/collapse details
  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest && e.target.closest("[data-project-toggle]");
    if (!btn) return;

    const card = btn.closest(".project");
    const more = card && card.querySelector(".project__more");
    if (!card || !more) return;

    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", expanded ? "false" : "true");

    if (expanded) {
      more.classList.remove("is-open");
      window.setTimeout(() => {
        more.hidden = true;
      }, 240);
    } else {
      more.hidden = false;
      // allow layout to apply before animating
      window.requestAnimationFrame(() => more.classList.add("is-open"));
    }
  });

  // Projects: subtle 3D tilt (desktop only)
  const canTilt = !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canTilt) {
    $$(".project").forEach((card) => {
      const max = 7; // deg
      const onMove = (ev) => {
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;
        const py = (ev.clientY - r.top) / r.height;
        const rx = (0.5 - py) * max;
        const ry = (px - 0.5) * max;
        card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      };
      const onLeave = () => {
        card.style.setProperty("--rx", `0deg`);
        card.style.setProperty("--ry", `0deg`);
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
    });
  }

})();

