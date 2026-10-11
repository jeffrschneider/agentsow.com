/* Light by default; dark only when the reader presses the switch in the menu.
   The choice is remembered in this browser. #dark or #light in the address
   forces one (for links and screenshots). Also opens the menu on a phone, and
   keeps the menu section holding the highlighted entry open. */
(function () {
  var d = document, r = d.documentElement, KEY = "site-theme", t = null;
  try { t = localStorage.getItem(KEY); } catch (e) {}
  if (location.hash === "#dark") t = "dark";
  if (location.hash === "#light") t = "light";
  if (t === "dark") r.setAttribute("data-theme", "dark");
  function ready() {
    var b = d.getElementById("theme-toggle");
    if (b) {
      b.setAttribute("aria-pressed", r.getAttribute("data-theme") === "dark" ? "true" : "false");
      b.addEventListener("click", function () {
        var dark = r.getAttribute("data-theme") !== "dark";
        if (dark) r.setAttribute("data-theme", "dark"); else r.removeAttribute("data-theme");
        try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch (e) {}
        b.setAttribute("aria-pressed", dark ? "true" : "false");
      });
    }
    var nav = d.getElementById("sidenav"), m = d.getElementById("menu-toggle");
    if (nav && m) m.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      m.setAttribute("aria-expanded", open ? "true" : "false");
    });
    function mark() {
      var on = nav && nav.querySelector("a.on");
      if (!on) return;
      var was = nav.querySelectorAll("a[aria-current]");
      for (var i = 0; i < was.length; i++) if (was[i] !== on) was[i].removeAttribute("aria-current");
      on.setAttribute("aria-current", /#/.test(on.getAttribute("href") || "") ? "location" : "page");
      var sec = on.closest("details");
      if (sec && !sec.open) sec.open = true;
    }
    mark();
    // Pages that move the highlight as the reader scrolls keep its section open.
    if (nav && window.MutationObserver) new MutationObserver(mark).observe(nav, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", ready); else ready();
})();
