/* ============================================================
   Pieces listing — flat time-ordered list with search + topic filter
   ============================================================ */

(function () {
  var grid = document.getElementById('pieces-grid');
  if (!grid) return;

  var box     = document.getElementById('pieces-search-box');
  var noRes   = document.getElementById('pieces-no-result');
  var countEl = document.getElementById('pieces-search-count');

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.note-card'));

  var state = { q: '', topic: '' };

  cards.forEach(function (c) {
    c.dataset._hay = [
      c.dataset.title,
      c.dataset.topic,
      c.dataset.summary,
      c.dataset.tags
    ].join(' \u0001 ').toLowerCase();
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

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

  function apply() {
    var q = state.q.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (c) {
      var pass =
        (!state.topic || c.dataset.topic === state.topic) &&
        (!q           || c.dataset._hay.indexOf(q) !== -1);

      c.style.display = pass ? '' : 'none';
      if (pass) {
        var titleLower = (c.querySelector('.note-card-title').dataset.origText || '').toLowerCase();
        highlightTitle(c, (q && titleLower.indexOf(q) !== -1) ? state.q.trim() : '');
        visible++;
      } else {
        highlightTitle(c, '');
      }
    });

    var hasFilter = q || state.topic;
    if (!hasFilter) {
      countEl.textContent = '';
      noRes.style.display = 'none';
    } else if (visible === 0) {
      countEl.textContent = '';
      noRes.style.display = '';
    } else {
      countEl.textContent = visible + ' piece' + (visible !== 1 ? 's' : '');
      noRes.style.display = 'none';
    }
  }

  if (box) {
    box.addEventListener('input', function () {
      state.q = this.value;
      apply();
    });
  }

  document.querySelectorAll('.pieces-listing .notes-chip-group').forEach(function (group) {
    var axis = group.dataset.filter;
    if (!axis) return;
    group.addEventListener('click', function (e) {
      var chip = e.target.closest('.notes-chip');
      if (!chip) return;
      group.querySelectorAll('.notes-chip').forEach(function (c) {
        c.classList.remove('is-active');
      });
      chip.classList.add('is-active');
      state[axis] = chip.dataset.value || '';
      apply();
    });
  });
})();
