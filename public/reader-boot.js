// Reading mode (specs/010 research R2): put the last page theme on <html> before the first paint.
// A classic script in <head> blocks rendering; the bundle loads later as a module. It only copies the
// variables that src/reader/settings.ts saved, so the theme table lives in one place.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('sk.reader.vars') || 'null');
    if (!saved || typeof saved !== 'object' || !/^(white|sepia|green|dark)$/.test(saved.theme)) return;
    var root = document.documentElement;
    for (var k in saved.vars) if (/^--(rd|color|shadow)-[a-z0-9-]+$/.test(k) && typeof saved.vars[k] === 'string') root.style.setProperty(k, saved.vars[k]);
    root.setAttribute('data-reader-theme', saved.theme);
  } catch (e) { /* blocked storage: the bundle applies the defaults */ }
})();
