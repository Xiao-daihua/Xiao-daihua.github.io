/* ============================================================
   Learning notes — search + filter chips
   Operates on #notes-grid only (the Learning section).
   The Lecture section above is untouched.
   Axes: text query AND language AND topic.
   Notes are organized into topic groups; whole groups hide
   when none of their notes match the current filters.
   ============================================================ */

(function () {
  var grid = document.getElementById('notes-grid');
  if (!grid) return;

  var box     = document.getElementById('notes-search-box');
  var noRes   = document.getElementById('notes-no-result');
  var countEl = document.getElementById('notes-search-count');

  var cards   = Array.prototype.slice.call(grid.querySelectorAll('.note-card'));
  var groups  = Array.prototype.slice.call(grid.querySelectorAll('.note-group'));

  /* Active filter state — empty string = no filter on that axis */
  var state = { q: '', language: '', topic: '' };

  /* ── Cache per-card haystack ── */
  cards.forEach(function (c) {
    c.dataset._hay = [
      c.dataset.title,
      c.dataset.topic,
      c.dataset.language,
      c.dataset.description
    ].join(' \u0001 ').toLowerCase();
  });

  /* ── Utils ── */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Cache & restore original title text for highlighting */
  cards.forEach(function (c) {
    var t = c.querySelector('.note-card-title');
    if (t && !t.dataset.origText) t.dataset.origText = t.textContent;
  });
  function highlightTitle(card, q) {
    var t = card.querySelector('.note-card-title');
    if (!t) return;
    var orig = t.dataset.origText || t.textContent;
    if (!q) { t.innerHTML = escapeHtml(orig); return; }
    var re = new RegExp(escapeRe(q), 'ig');
    t.innerHTML = escapeHtml(orig).replace(re, function (m) {
      return '<span class="search-highlight">' + m + '</span>';
    });
  }

  /* ── Apply filters ── */
  function apply() {
    var q = state.q.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (c) {
      var pass =
        (!state.language || c.dataset.language === state.language) &&
        (!state.topic    || c.dataset.topic    === state.topic) &&
        (!q              || c.dataset._hay.indexOf(q) !== -1);

      c.style.display = pass ? '' : 'none';
      if (pass) {
        var titleLower = (c.querySelector('.note-card-title').dataset.origText || '').toLowerCase();
        highlightTitle(c, (q && titleLower.indexOf(q) !== -1) ? state.q.trim() : '');
        visible++;
      } else {
        highlightTitle(c, '');
      }
    });

    /* Hide whole groups whose cards are all hidden */
    groups.forEach(function (g) {
      var anyVisible = Array.prototype.some.call(
        g.querySelectorAll('.note-card'),
        function (c) { return c.style.display !== 'none'; }
      );
      g.style.display = anyVisible ? '' : 'none';
    });

    var hasFilter = q || state.language || state.topic;
    if (!hasFilter) {
      countEl.textContent = '';
      noRes.style.display = 'none';
    } else if (visible === 0) {
      countEl.textContent = '';
      noRes.style.display = '';
    } else {
      countEl.textContent = visible + ' note' + (visible !== 1 ? 's' : '');
      noRes.style.display = 'none';
    }
  }

  /* ── Search box ── */
  if (box) {
    box.addEventListener('input', function () {
      state.q = this.value;
      apply();
    });
  }

  /* ── Chip groups ── */
  var chipGroups = document.querySelectorAll('.notes-section--learning .notes-chip-group');
  chipGroups.forEach(function (group) {
    var axis = group.dataset.filter; // "language" | "topic"
    if (!axis) return;
    group.addEventListener('click', function (e) {
      var chip = e.target.closest('.notes-chip');
      if (!chip) return;
      if (chip.classList.contains('notes-chip--toggle')) return; /* handled below */

      group.querySelectorAll('.notes-chip').forEach(function (c) {
        c.classList.remove('is-active');
      });
      chip.classList.add('is-active');
      state[axis] = chip.dataset.value || '';
      apply();
    });
  });

  /* ── Topic "More…" toggle ── */
  var moreBtn = document.getElementById('notes-topic-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      var group = moreBtn.closest('.notes-chip-group');
      var hidden = group.querySelectorAll('.notes-chip--extra[hidden]');
      var shown  = group.querySelectorAll('.notes-chip--extra:not([hidden])');
      if (hidden.length > 0) {
        hidden.forEach(function (c) { c.hidden = false; });
        moreBtn.textContent = 'Less';
      } else {
        shown.forEach(function (c) {
          if (c.classList.contains('is-active')) {
            c.classList.remove('is-active');
            var allBtn = group.querySelector('.notes-chip[data-value=""]');
            if (allBtn) allBtn.classList.add('is-active');
            state.topic = '';
          }
          c.hidden = true;
        });
        moreBtn.textContent = 'More…';
        apply();
      }
    });
  }
})();
