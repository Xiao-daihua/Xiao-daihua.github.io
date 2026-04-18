/* ============================================================
   Database search
   Reads the list of topics from window.ALL_TOPICS (injected by
   the Jekyll template) and filters the #topic-list in place.
   ============================================================ */

(function () {
  var searchBox = document.getElementById('search-box');
  if (!searchBox) return;

  var noRes    = document.getElementById('search-no-result');
  var mainList = document.getElementById('topic-list');
  var countEl  = document.getElementById('search-count');
  var topics   = window.ALL_TOPICS || [];

  /* ── Utils ── */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Fuzzy match: all query chars appear in order in str */
  function fuzzyMatch(str, q) {
    str = String(str).toLowerCase();
    q = q.toLowerCase();
    var si = 0, qi = 0;
    while (si < str.length && qi < q.length) {
      if (str[si] === q[qi]) qi++;
      si++;
    }
    return qi === q.length;
  }

  /* Highlight matched chars for a fuzzy hit on the title */
  function fuzzyHL(str, q) {
    var out = '', qi = 0, ql = q.toLowerCase();
    for (var i = 0; i < str.length; i++) {
      if (qi < ql.length && str[i].toLowerCase() === ql[qi]) {
        out += '<span class="search-highlight">' + escapeHtml(str[i]) + '</span>';
        qi++;
      } else {
        out += escapeHtml(str[i]);
      }
    }
    return out;
  }

  /* Normalise a URL for comparison (strip trailing slash) */
  function normUrl(u) { return String(u).replace(/\/$/, ''); }

  /* ── Main search ── */
  function doSearch(q) {
    q = q.trim();

    /* Empty query: restore everything */
    if (!q) {
      noRes.style.display = 'none';
      countEl.textContent = '';
      mainList.querySelectorAll('h2').forEach(function (h) { h.style.display = ''; });
      mainList.querySelectorAll('ul').forEach(function (u) { u.style.display = ''; });
      mainList.querySelectorAll('li').forEach(function (li) {
        li.style.display = '';
        var a = li.querySelector('a');
        if (a && a.dataset.origText) { a.innerHTML = escapeHtml(a.dataset.origText); }
      });
      return;
    }

    /* Build a Set of matching topic URLs (normalised) */
    var matched = new Set();
    var qLower  = q.toLowerCase();
    for (var i = 0; i < topics.length; i++) {
      var t = topics[i];
      var titleHit = fuzzyMatch(t.title, q);
      var tagHit   = (t.tags || []).some(function (tg) { return fuzzyMatch(tg, q); });
      var contHit  = t.content && t.content.toLowerCase().indexOf(qLower) !== -1;
      if (titleHit || tagHit || contHit) {
        matched.add(normUrl(t.url));
      }
    }

    var total = matched.size;

    /* Filter the rendered #topic-list in place */
    var sections = mainList.querySelectorAll('h2');
    sections.forEach(function (h2) {
      var ul = h2.nextElementSibling;
      if (!ul) return;
      var visible = 0;
      ul.querySelectorAll('li').forEach(function (li) {
        var a = li.querySelector('a');
        if (!a) return;
        var href = normUrl(a.getAttribute('href'));
        if (matched.has(href)) {
          li.style.display = '';
          if (!a.dataset.origText) a.dataset.origText = a.textContent;
          a.innerHTML = fuzzyMatch(a.dataset.origText, q)
            ? fuzzyHL(a.dataset.origText, q)
            : escapeHtml(a.dataset.origText);
          visible++;
        } else {
          li.style.display = 'none';
          var orig = a.dataset.origText;
          if (orig) a.innerHTML = escapeHtml(orig);
        }
      });
      var empty = visible === 0;
      h2.style.display = empty ? 'none' : '';
      ul.style.display = empty ? 'none' : '';
    });

    if (total === 0) {
      noRes.style.display = '';
      countEl.textContent = '';
    } else {
      noRes.style.display = 'none';
      countEl.textContent = total + ' result' + (total !== 1 ? 's' : '') + ' for "' + q + '"';
    }
  }

  searchBox.addEventListener('input', function () { doSearch(this.value); });
})();
