// Draws a 90-day uptime bar under each service on the status page (GitHub status
// style). Upptime's page has no bars, but Upptime already records minutes of
// downtime per UTC day in history/summary.json (dailyMinutesDown), so this reads
// that file and draws one bar per day. Loaded via `status-website.scripts` in
// .upptimerc.yml. Any failure leaves the page as stock Upptime.
(function () {
  "use strict";
  // Svelte can re-insert <head> scripts while hydrating; only run once.
  if (window.__uptimeBars) return;
  window.__uptimeBars = true;

  var DAYS = 90;
  var MOBILE_DAYS = 30; // must match the nth-child rule in status.css
  var DAY_MS = 86400000;
  var MAJOR_MINUTES = 60; // a day with an hour or more of downtime is red

  var script = document.currentScript;
  var repo = script && new URL(script.src).searchParams.get("repo");
  if (!repo) return;
  var base = "https://raw.githubusercontent.com/" + repo + "/HEAD/history/";
  var sites = {};

  fetch(base + "summary.json")
    .then(function (res) {
      if (!res.ok) throw new Error("summary.json: HTTP " + res.status);
      return res.json();
    })
    .then(function (summary) {
      return Promise.all(
        summary.map(function (site) {
          // startTime marks when monitoring began; earlier days show as "no data".
          return fetch(base + site.slug + ".yml")
            .then(function (res) {
              return res.ok ? res.text() : "";
            })
            .catch(function () {
              return "";
            })
            .then(function (yml) {
              var match = yml.match(/^startTime:\s*(\S+)/m);
              site.start = match ? new Date(match[1]).getTime() : 0;
              sites[site.slug] = site;
            });
        })
      );
    })
    .then(function () {
      render();
      // The page renders client-side and re-renders on navigation.
      new MutationObserver(render).observe(document.body, { childList: true, subtree: true });
    })
    .catch(function (error) {
      console.warn("uptime-bars:", error);
    });

  function render() {
    var cards = document.querySelectorAll("section.live-status article");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].querySelector(".uptime-bars")) continue;
      var link = cards[i].querySelector('a[href*="/history/"]');
      var slug = link && link.getAttribute("href").split("/history/")[1];
      if (slug && sites[slug]) cards[i].appendChild(buildBars(sites[slug]));
    }
  }

  function buildBars(site) {
    var down = site.dailyMinutesDown || {};
    var now = Date.now();
    var today = now - (now % DAY_MS); // UTC midnight, matching Upptime's day keys
    var days = [];

    for (var d = DAYS - 1; d >= 0; d--) {
      var dayStart = today - d * DAY_MS;
      var from = Math.max(dayStart, site.start);
      var to = Math.min(dayStart + DAY_MS, now);
      var tracked = Math.max(0, (to - from) / 60000);
      var minutes = tracked ? Math.min(down[new Date(dayStart).toISOString().slice(0, 10)] || 0, tracked) : 0;
      days.push({ start: dayStart, tracked: tracked, minutes: minutes });
    }

    var row = el("div", "uptime-bars-row");
    days.forEach(function (day) {
      var date = new Date(day.start).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      var bar = el("span", !day.tracked ? "none" : !day.minutes ? "up" : day.minutes < MAJOR_MINUTES ? "minor" : "major");
      bar.title =
        date +
        (!day.tracked ? ": no data" : !day.minutes ? ": no downtime" : ": " + duration(day.minutes) + " of downtime");
      row.appendChild(bar);
    });

    var long = uptime(days);
    var short = uptime(days.slice(-MOBILE_DAYS));
    row.setAttribute("role", "img");
    row.setAttribute("aria-label", "Last " + DAYS + " days: " + long);

    var legend = el("div", "uptime-bars-legend");
    legend.appendChild(pair(DAYS + " days ago", MOBILE_DAYS + " days ago"));
    legend.appendChild(pair(long, short));
    legend.appendChild(el("span", "", "Today"));

    var wrap = el("div", "uptime-bars");
    wrap.appendChild(row);
    wrap.appendChild(legend);
    return wrap;
  }

  function uptime(days) {
    var tracked = 0;
    var minutes = 0;
    days.forEach(function (day) {
      tracked += day.tracked;
      minutes += day.minutes;
    });
    if (!tracked) return "No data";
    // Floor so a day with any downtime never rounds up to 100.00%.
    return (Math.floor(10000 * (1 - minutes / tracked)) / 100).toFixed(2) + "% uptime";
  }

  // Desktop and mobile variants of a legend label; status.css shows one.
  function pair(desktop, mobile) {
    var span = el("span");
    span.appendChild(el("span", "uptime-bars-long", desktop));
    span.appendChild(el("span", "uptime-bars-short", mobile));
    return span;
  }

  function duration(minutes) {
    minutes = Math.round(minutes);
    if (minutes < 60) return minutes + " min";
    return Math.floor(minutes / 60) + " h " + (minutes % 60) + " min";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
})();
