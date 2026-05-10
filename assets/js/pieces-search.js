(function () {
  var list    = document.getElementById('pieces-list');
  if (!list) return;
  var box     = document.getElementById('pieces-search-box');
  var noRes   = document.getElementById('pieces-no-result');
  var countEl = document.getElementById('pieces-search-count');
  var rows    = Array.prototype.slice.call(list.querySelectorAll('.note-row'));
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
    var hasFilter = q || state.topic;
    noRes.style.display  = (hasFilter && visible === 0) ? '' : 'none';
    countEl.textContent  = (hasFilter && visible > 0)
      ? visible + ' piece' + (visible !== 1 ? 's' : '') : '';
  }

  if (box) {
    box.addEventListener('input', function () { state.q = this.value; apply(); });
  }

  document.querySelectorAll('.pieces-listing .notes-chip-group').forEach(function (group) {
    var axis = group.dataset.filter;
    if (!axis) return;
    group.addEventListener('click', function (e) {
      var chip = e.target.closest('.notes-chip');
      if (!chip) return;
      group.querySelectorAll('.notes-chip').forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      state[axis] = chip.dataset.value || '';
      apply();
    });
  });
})();
