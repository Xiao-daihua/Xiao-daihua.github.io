(function () {
  var container = document.querySelector('.pieces-listing');
  if (!container) return;

  var box     = document.getElementById('pieces-search-box');
  var noRes   = document.getElementById('pieces-no-result');
  var countEl = document.getElementById('pieces-count');
  var rows    = Array.prototype.slice.call(container.querySelectorAll('.note-row'));
  var groups  = Array.prototype.slice.call(container.querySelectorAll('.piece-group'));
  var state   = { q: '', topic: '' };

  function apply() {
    var q = state.q.trim().toLowerCase();
    var visible = 0;

    rows.forEach(function (r) {
      var pass =
        (!state.topic || r.dataset.topic === state.topic) &&
        (!q           || r.dataset.hay.toLowerCase().indexOf(q) !== -1);
      r.style.display = pass ? '' : 'none';
      if (pass) visible++;
    });

    /* hide entire group section when all its rows are filtered out */
    groups.forEach(function (g) {
      /* when a topic chip is active, hide groups that don't match */
      if (state.topic && g.dataset.topic !== state.topic) {
        g.style.display = 'none';
        return;
      }
      var anyVisible = Array.prototype.some.call(
        g.querySelectorAll('.note-row'),
        function (r) { return r.style.display !== 'none'; }
      );
      g.style.display = anyVisible ? '' : 'none';
    });

    var hasFilter = q || state.topic;
    noRes.style.display  = (hasFilter && visible === 0) ? '' : 'none';
    countEl.textContent  = (hasFilter && visible > 0)
      ? visible + ' piece' + (visible !== 1 ? 's' : '') : '';
  }

  if (box) {
    box.addEventListener('input', function () { state.q = this.value; apply(); });
  }

  container.querySelectorAll('.notes-chip-group').forEach(function (group) {
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
