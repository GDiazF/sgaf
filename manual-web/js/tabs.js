/** Pestañas offline — sin dependencias */
(function () {
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = root.querySelectorAll('[data-tab]');
    var panels = root.querySelectorAll('[data-panel]');

    function activate(id) {
      tabs.forEach(function (t) {
        t.classList.toggle('is-active', t.getAttribute('data-tab') === id);
        t.setAttribute('aria-selected', t.getAttribute('data-tab') === id ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        var on = p.getAttribute('data-panel') === id;
        p.classList.toggle('is-active', on);
        p.hidden = !on;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activate(tab.getAttribute('data-tab'));
      });
    });

    var first = root.querySelector('[data-tab].is-active') || tabs[0];
    if (first) activate(first.getAttribute('data-tab'));
  });
})();
