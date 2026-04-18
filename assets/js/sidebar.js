/* Shared sidebar interactions for database + topic layouts */
function toggleSidebar() {
  var el = document.getElementById('sidebar');
  if (el) el.classList.toggle('collapsed');
}

function toggleGroup(letter) {
  var el = document.getElementById('group-' + letter);
  if (el) el.classList.toggle('collapsed');
}
