(function () {
  // Only reveal the hero video over the poster once it is actually PLAYING.
  // If autoplay is blocked (iOS Safari, low-power mode, etc.), the poster image on
  // .hero::before stays visible instead of an empty/black video.
  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    var wrap = document.querySelector('.hero-video');
    if (wrap) wrap.classList.add('is-ready');
  }
  var v = document.getElementById('hero-video');
  if (!v) return;
  v.addEventListener('playing', reveal);
  if (!v.paused && v.readyState >= 3) reveal();
})();
