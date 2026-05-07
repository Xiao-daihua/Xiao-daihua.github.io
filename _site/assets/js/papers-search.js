/* ============================================================
   Papers list search
   Filters #papers-list in place by reading data-* attributes
   on each .paper-row <li>. Year groupings are auto-hidden when
   they end up empty.
   ============================================================ */

(function () {
  var box = document.getElementById('papers-search-box');
  if (!box) return;

  var listEl  = document.getElementById('papers-list');
  var noRes   = document.getElementById('papers-no-result');
  var countEl = document.getElementById('papers-search-count');

  var rows     = Array.prototype.slice.call(listEl.querySelectorAll('.paper-row'));
  var headings = Array.prototype.slice.call(listEl.querySelectorAll('.papers-year-heading'));
  var lists    = Array.prototype.slice.call(listEl.querySelectorAll('.papers-year-list'));

  /* ── Utils ── */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Cache haystack & original title HTML once */
  rows.forEach(function (li) {
    var hay = [
      li.dataset.title,
      li.dataset.authors,
      li.dataset.year,
      li.dataset.journal,
      li.dataset.arxiv,
      li.dataset.doi,
      li.dataset.abstract
    ].join(' \u0001 ').toLowerCase();
    li.dataset._hay = hay;

    var titleA = li.querySelector('.paper-row-title');
    if (titleA && !titleA.dataset.origText) {
      titleA.dataset.origText = titleA.textContent;
    }
  });

  function highlightTitle(titleEl, q) {
    var orig = titleEl.dataset.origText || titleEl.textContent;
    if (!q) { titleEl.innerHTML = escapeHtml(orig); return; }
    var re = new RegExp(escapeRe(q), 'ig');
    titleEl.innerHTML = escapeHtml(orig).replace(re, function (m) {
      return '<span class="search-highlight">' + m + '</span>';
    });
  }

  function doSearch(qRaw) {
    var q = qRaw.trim().toLowerCase();
    var totalVisible = 0;

    rows.forEach(function (li) {
      var hit = !q || li.dataset._hay.indexOf(q) !== -1;
      li.style.display = hit ? '' : 'none';
      var titleEl = li.querySelector('.paper-row-title');
      if (titleEl) {
        /* Highlight only when query is substring of the title */
        var titleLower = (titleEl.dataset.origText || '').toLowerCase();
        if (q && titleLower.indexOf(q) !== -1) {
          highlightTitle(titleEl, qRaw.trim());
        } else {
          highlightTitle(titleEl, '');
        }
      }
      if (hit) totalVisible++;
    });

    /* Hide year headings whose group has no visible rows */
    headings.forEach(function (h, i) {
      var ul = lists[i];
      if (!ul) return;
      var anyVisible = Array.prototype.some.call(
        ul.querySelectorAll('.paper-row'),
        function (li) { return li.style.display !== 'none'; }
      );
      h.style.display  = anyVisible ? '' : 'none';
      ul.style.display = anyVisible ? '' : 'none';
    });

    if (!q) {
      countEl.textContent = '';
      noRes.style.display = 'none';
    } else if (totalVisible === 0) {
      countEl.textContent = '';
      noRes.style.display = '';
    } else {
      countEl.textContent = totalVisible + ' paper' + (totalVisible !== 1 ? 's' : '') + ' for "' + qRaw.trim() + '"';
      noRes.style.display = 'none';
    }
  }

  box.addEventListener('input', function () { doSearch(this.value); });
})();
