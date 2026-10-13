/* Inkbloom — line icons (inline SVG, no emoji) */
(function () {
  'use strict';
  var P = {
    home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v8.5h11V10"/><path d="M10.2 18.5v-4.6h3.6v4.6"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    retry: '<path d="M5.5 12a6.5 6.5 0 1 0 2-4.7"/><path d="M5 4.5v4h4"/>',
    hint: '<path d="M12 3.5c-2 2.8-5 5.6-5 9a5 5 0 0 0 10 0c0-3.4-3-6.2-5-9Z"/><path d="M10 13.5a2 2 0 0 0 2 2"/>',
    next: '<path d="M6 12h11"/><path d="M12.5 6.5 18 12l-5.5 5.5"/>',
    play: '<path d="M8 5.5v13l10-6.5Z"/>',
    book: '<path d="M4.5 5.5c2.5-.8 5-.6 7.5 1 2.5-1.6 5-1.8 7.5-1v12.5c-2.5-.8-5-.6-7.5 1-2.5-1.6-5-1.8-7.5-1Z"/><path d="M12 6.5V19"/>',
    diary: '<rect x="4.5" y="5.5" width="15" height="14" rx="2"/><path d="M4.5 9.5h15"/><path d="M8.5 3.5v4M15.5 3.5v4"/><circle cx="12" cy="14.5" r="1.6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
    lock: '<rect x="6" y="10.5" width="12" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="M5.5 12.5 10 17l8.5-9.5"/>',
    sound: '<path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    beat: '<path d="M9 20.5h6l-1.6-15h-2.8Z"/><path d="M12 15.5 17 6"/>',
    flame: '<path d="M12 3.5c1 3 4.5 4.8 4.5 9a4.5 4.5 0 0 1-9 0c0-2 1-3.4 2-4.4.3 1.6 1 2.4 2 2.9-.4-2.6-.2-5.3.5-7.5Z"/>',
    prev: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    fwd: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    brush: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5Z"/><path d="M6 13c-2 0-2.5 2-2.5 3.5S2.5 19.5 2.5 19.5 7.5 20 8 16"/>'
  };
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || '') + '</svg>';
  }
  /* seal stamp (낙관) with a droplet mark */
  function seal(faint) {
    return '<svg class="seal-svg" viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="6" fill="' + (faint ? 'none' : '#c4392f') + '" stroke="' + (faint ? '#9a8f84' : '#a52a22') + '" stroke-width="2.4"/>' +
      '<path d="M20 8c-3.6 5-8 9-8 14.2a8 8 0 0 0 16 0C28 17 23.6 13 20 8Z" fill="' + (faint ? 'none' : '#fff6ec') + '" stroke="' + (faint ? '#9a8f84' : 'none') + '" stroke-width="2"/>' +
      '<path d="M16.5 23.5a3.6 3.6 0 0 0 3.5 3.4" stroke="' + (faint ? '#9a8f84' : '#c4392f') + '" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  }
  /* ink chip with colour mark dots */
  function chip(colorHex, code, light) {
    var dot = light ? 'rgba(50,35,25,.7)' : 'rgba(255,255,255,.85)', hol = light ? 'rgba(50,35,25,.25)' : 'rgba(255,255,255,.35)';
    var pos = [[1, 20, 13.5], [2, 14.2, 24], [4, 25.8, 24]], s = '';
    pos.forEach(function (p) {
      s += (code & p[0]) ? '<circle cx="' + p[1] + '" cy="' + p[2] + '" r="3.2" fill="' + dot + '"/>' : '<circle cx="' + p[1] + '" cy="' + p[2] + '" r="1.6" fill="none" stroke="' + hol + '" stroke-width="1.2"/>';
    });
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="' + colorHex + '"/><ellipse cx="14" cy="12" rx="6" ry="4" fill="rgba(255,255,255,.25)"/>' + s + '</svg>';
  }
  window.Icons = { icon: icon, seal: seal, chip: chip };
})();
