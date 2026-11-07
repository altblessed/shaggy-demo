// No dependencies: this layer can travel with each independent salon copy.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const motionToggle = document.querySelector('.motion-toggle');
const entranceAnimations = new Set();
let motionPaused = motionPreference.matches;

function resetParallax() {
  const hero = document.querySelector('.hero-visual');
  ['--parallax-x', '--parallax-y', '--tilt-x', '--tilt-y'].forEach(name => hero.style.removeProperty(name));
}

function setMotionPaused(paused) {
  motionPaused = paused;
  motionToggle.hidden = motionPreference.matches;
  document.body.classList.toggle('motion-paused', paused);
  motionToggle.setAttribute('aria-pressed', String(paused));
  const label = paused ? 'Продолжить анимации' : 'Приостановить анимации';
  motionToggle.setAttribute('aria-label', label);
  motionToggle.title = label;
  motionToggle.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
  if (paused) {
    entranceAnimations.forEach(animation => animation.cancel());
    resetParallax();
  }
}

document.body.classList.add('motion-ready');
setMotionPaused(motionPaused);
motionToggle.addEventListener('click', () => setMotionPaused(!motionPaused));
motionPreference.addEventListener('change', event => setMotionPaused(event.matches));

function reveal(element, delay = 0, distance = 23) {
  if (motionPaused || motionPreference.matches || !element.animate) return;
  const animation = element.animate([
    { opacity: 0, transform: `translateY(${distance}px)` },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: 750, delay, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'backwards' });
  entranceAnimations.add(animation);
  animation.finished.then(() => entranceAnimations.delete(animation), () => entranceAnimations.delete(animation));
}

if (window.scrollY < 180) {
  [...document.querySelector('.hero-copy').children].forEach((element, index) => reveal(element, index * 85));
  reveal(document.querySelector('.hero-visual'), 170, 30);
}

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const index = Number(entry.target.dataset.revealOrder || 0);
      reveal(entry.target, index * 75);
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
  document.querySelectorAll('.section-heading, .service-card, .price-layout>div, .gallery-grid>figure, .salon-photo, .salon-copy, .faq-section>div, .contact-layout>div').forEach(element => {
    if (element.classList.contains('service-card')) element.dataset.revealOrder = [...element.parentElement.children].indexOf(element);
    revealObserver.observe(element);
  });
}

const progressBar = document.querySelector('.scroll-progress');
const stickyHeader = document.querySelector('.header');
const sectionLinks = [...document.querySelectorAll('#navigation a[href^="#"]')];
const sectionTargets = sectionLinks.map(link => document.querySelector(link.getAttribute('href')));
let scrollFrame = 0;
function updateScrollState() {
  scrollFrame = 0;
  const maximum = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  progressBar.style.transform = `scaleX(${maximum > 0 ? Math.min(1, Math.max(0, scrollY / maximum)) : 0})`;
  stickyHeader.classList.toggle('is-scrolled', scrollY > 35);
  let activeIndex = -1;
  const offset = stickyHeader.getBoundingClientRect().height + 65;
  sectionTargets.forEach((section, index) => {
    if (section && section.getBoundingClientRect().top <= offset) activeIndex = index;
  });
  sectionLinks.forEach((link, index) => {
    if (index === activeIndex) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function scheduleScrollState() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollState);
}
window.addEventListener('scroll', scheduleScrollState, { passive: true });
window.addEventListener('resize', scheduleScrollState, { passive: true });
window.addEventListener('load', scheduleScrollState, { once: true });
updateScrollState();

const heroVisual = document.querySelector('.hero-visual');
let pointerFrame = 0;
heroVisual.addEventListener('pointermove', event => {
  if (motionPaused || motionPreference.matches || !finePointer.matches) return;
  const bounds = heroVisual.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - .5;
  const y = (event.clientY - bounds.top) / bounds.height - .5;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => {
    heroVisual.style.setProperty('--parallax-x', `${x * 12}px`);
    heroVisual.style.setProperty('--parallax-y', `${y * 12}px`);
    heroVisual.style.setProperty('--tilt-x', `${-y * 3}deg`);
    heroVisual.style.setProperty('--tilt-y', `${x * 3}deg`);
  });
}, { passive: true });
heroVisual.addEventListener('pointerleave', () => {
  cancelAnimationFrame(pointerFrame);
  resetParallax();
});

document.querySelectorAll('.comparison-stage').forEach(stage => {
  const range = stage.querySelector('input[type="range"]');
  function updateComparison() {
    const value = Number(range.value);
    stage.style.setProperty('--split', `${value}%`);
    range.setAttribute('aria-valuetext', `${value}% фотографии до стрижки`);
  }
  range.addEventListener('input', updateComparison);
  updateComparison();
});

// Duplicate the first frame once: the last and first loop frames look identical.
// A single linear transform keeps the strip moving without timed stops.
document.querySelectorAll('.hero-film').forEach(film => {
  const shots = [...film.children];
  if (shots.length < 2) return;
  const secondsPerSlide = Number(film.dataset.secondsPerSlide) || 9;
  const seamlessFrame = shots[0].cloneNode(true);
  seamlessFrame.setAttribute('aria-hidden', 'true');
  seamlessFrame.querySelectorAll('img').forEach(image => {
    image.alt = '';
    image.removeAttribute('fetchpriority');
  });
  film.append(seamlessFrame);
  film.style.setProperty('--hero-film-end', `${-100 * shots.length}%`);
  film.style.setProperty('--hero-film-duration', `${shots.length * secondsPerSlide}s`);
  const images = [...film.querySelectorAll('img')];
  Promise.all(images.map(image => image.decode().catch(() => undefined))).then(() => {
    film.classList.add('is-ready');
  });
});
