/* Google Analytics for this site, with Google Consent Mode v2.
   Every page loads this one file from its head: <script async src="/ga.js"></script>
   Visitors in the EEA, the UK and Switzerland are counted without cookies
   unless they accept. A browser set to a European time zone also gets a small
   bar asking, and the answer is remembered in localStorage. Everyone else is
   counted with cookies. No ads features, no user id, no Google signals. */
(function () {
  var ID = "G-BM5NKPWMQ0";
  var KEY = "analytics-consent";
  var w = window, d = document;
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  if (!w.gtag) w.gtag = gtag;

  var saved = null;
  try { saved = w.localStorage.getItem(KEY); } catch (e) {}
  if (saved !== "granted" && saved !== "denied") saved = null;
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var ask = /^Europe\//.test(tz) ||
    /^(Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe|Faeroe)|Arctic\/Longyearbyen|Asia\/(Nicosia|Famagusta))$/.test(tz);

  var no = "denied";
  gtag("consent", "default", {
    ad_storage: no, ad_user_data: no, ad_personalization: no, analytics_storage: no,
    region: ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
      "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH"]
  });
  gtag("consent", "default", {
    ad_storage: no, ad_user_data: no, ad_personalization: no,
    analytics_storage: ask ? no : "granted"
  });
  if (saved) gtag("consent", "update", { analytics_storage: saved });
  gtag("set", "ads_data_redaction", true);
  gtag("js", new Date());
  gtag("config", ID, { allow_google_signals: false, allow_ad_personalization_signals: false });

  var s = d.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  (d.head || d.documentElement).appendChild(s);

  if (!ask || saved) return;

  function clear(c) { return !c || c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c); }
  function bar() {
    if (d.getElementById("analytics-consent")) return;
    var cs = w.getComputedStyle(d.body);
    var bg = cs.backgroundColor;
    if (clear(bg)) bg = w.getComputedStyle(d.documentElement).backgroundColor;
    if (clear(bg)) bg = "#ffffff";
    var fg = cs.color || "#111111";

    var el = d.createElement("div");
    el.id = "analytics-consent";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Analytics cookies");
    el.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;" +
      "max-width:640px;margin:0 auto;box-sizing:border-box;display:flex;flex-wrap:wrap;" +
      "align-items:center;gap:10px 16px;padding:12px 16px;border-radius:10px;" +
      "border:1px solid rgba(128,128,128,.35);box-shadow:0 4px 18px rgba(0,0,0,.18);" +
      "font-size:14px;line-height:1.45;text-align:left;";
    el.style.background = bg;
    el.style.color = fg;
    el.style.fontFamily = cs.fontFamily;

    var p = d.createElement("p");
    p.style.cssText = "margin:0;flex:1 1 260px;";
    p.textContent = "We use Google Analytics to count visits, and it sets cookies only if you accept.";
    el.appendChild(p);

    var row = d.createElement("div");
    row.style.cssText = "display:flex;gap:8px;flex:0 0 auto;";
    function button(label, value, filled) {
      var b = d.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "font:inherit;font-size:14px;line-height:1.2;padding:7px 14px;border-radius:7px;" +
        "cursor:pointer;border:1px solid " + fg + ";";
      b.style.background = filled ? fg : "transparent";
      b.style.color = filled ? bg : fg;
      b.addEventListener("click", function () {
        try { w.localStorage.setItem(KEY, value); } catch (e) {}
        gtag("consent", "update", { analytics_storage: value });
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      return b;
    }
    row.appendChild(button("Decline", "denied", false));
    row.appendChild(button("Accept", "granted", true));
    el.appendChild(row);
    d.body.insertBefore(el, d.body.firstChild);
  }
  if (d.body) bar(); else d.addEventListener("DOMContentLoaded", bar);
})();
