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
      mainList.querySelectorAll('h3.note-group-title').forEach(function (h) { h.style.display = ''; });
      mainList.querySelectorAll('.note-list').forEach(function (g) { g.style.display = ''; });
      mainList.querySelectorAll('.note-row').forEach(function (card) {
        card.style.display = '';
        var titleEl = card.querySelector('.note-row-title');
        if (titleEl && titleEl.dataset.origText) {
          titleEl.innerHTML = escapeHtml(titleEl.dataset.origText);
        }
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
    var sections = mainList.querySelectorAll('h3.note-group-title');
    sections.forEach(function (h2) {
      var grid = h2.nextElementSibling;
      if (!grid) return;
      var visible = 0;
      grid.querySelectorAll('.note-row').forEach(function (card) {
        var titleEl = card.querySelector('.note-row-title');
        var href = normUrl(titleEl ? titleEl.getAttribute('href') : '');
        if (matched.has(href)) {
          card.style.display = '';
          if (titleEl) {
            if (!titleEl.dataset.origText) titleEl.dataset.origText = titleEl.textContent;
            titleEl.innerHTML = fuzzyMatch(titleEl.dataset.origText, q)
              ? fuzzyHL(titleEl.dataset.origText, q)
              : escapeHtml(titleEl.dataset.origText);
          }
          visible++;
        } else {
          card.style.display = 'none';
          if (titleEl && titleEl.dataset.origText) {
            titleEl.innerHTML = escapeHtml(titleEl.dataset.origText);
          }
        }
      });
      var empty = visible === 0;
      h2.style.display = empty ? 'none' : '';
      grid.style.display = empty ? 'none' : '';
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
