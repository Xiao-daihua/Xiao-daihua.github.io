/* ============================================================
   library-graph.js  (ES5, vanilla, no deps)
   Minimal force-directed graph of database topics.
   Nodes = topics. Edges = [[wikilink]] or /database/ href
   from one topic's content to another. Undirected for layout.
   Reads window.GRAPH and window.TITLE_MAP (injected by Jekyll).
   ============================================================ */
(function () {
  var GRAPH = window.GRAPH || { nodes: [], raw: {} };
  var TITLE_MAP = window.TITLE_MAP || {};

  var svg = document.getElementById('library-graph');
  var wrap = document.getElementById('graph-wrap');
  var emptyMsg = document.getElementById('graph-empty');
  if (!svg || !wrap) return;

  if (!GRAPH.nodes.length) { if (emptyMsg) emptyMsg.style.display = 'block'; return; }
  if (emptyMsg) emptyMsg.style.display = 'none';

  var SVGNS = 'http://www.w3.org/2000/svg';
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').replace(/^ | $/g, ''); }

  /* ---- build edges ---- */
  var nodes = GRAPH.nodes.map(function (n) {
    return { id: n.id, title: n.title, tags: n.tags || [], x: 0, y: 0, vx: 0, vy: 0 };
  });
  var indexById = {};
  for (var i = 0; i < nodes.length; i++) indexById[nodes[i].id.replace(/\/$/, '')] = i;

  function targetsOf(raw) {
    var set = {};
    if (!raw) return set;
    var re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, m;
    while ((m = re.exec(raw)) !== null) {
      var u = TITLE_MAP[norm(m[1])];
      if (u) set[u.replace(/\/$/, '')] = true;
    }
    var hre = /\/database\/[a-z0-9\-]+\/?/gi, h;
    while ((h = hre.exec(raw)) !== null) set[h[0].replace(/\/$/, '')] = true;
    return set;
  }

  var linkSet = {}, links = [];
  for (var src in GRAPH.raw) {
    if (!GRAPH.raw.hasOwnProperty(src)) continue;
    var si = indexById[src.replace(/\/$/, '')];
    if (si === undefined) continue;
    var ts = targetsOf(GRAPH.raw[src]);
    for (var tgt in ts) {
      var ti = indexById[tgt];
      if (ti === undefined || ti === si) continue;
      var key = si < ti ? si + '-' + ti : ti + '-' + si;
      if (linkSet[key]) continue;
      linkSet[key] = true;
      links.push({ source: si, target: ti });
    }
  }

  // degree (for node sizing)
  var deg = nodes.map(function () { return 0; });
  for (var l = 0; l < links.length; l++) { deg[links[l].source]++; deg[links[l].target]++; }

  /* ---- tag colors (accent-based, muted) ---- */
  var palette = ['#7c3aed', '#2563eb', '#0d9488', '#d97706', '#db2777', '#65a30d', '#9333ea', '#0891b2'];
  var tagColor = {}, ci = 0;
  for (var ni = 0; ni < nodes.length; ni++) {
    var primary = nodes[ni].tags[0] || '';
    if (primary && !tagColor[primary]) { tagColor[primary] = palette[ci % palette.length]; ci++; }
  }
  function colorOf(node) { return tagColor[node.tags[0]] || 'var(--text-muted)'; }

  /* ---- layout state ---- */
  var W = 0, H = 0;
  function size() {
    W = wrap.clientWidth || 700;
    H = Math.max(420, Math.min(640, W * 0.7));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
  }
  size();

  // initial positions: circle
  for (var p = 0; p < nodes.length; p++) {
    var ang = (p / nodes.length) * Math.PI * 2;
    nodes[p].x = W / 2 + Math.cos(ang) * Math.min(W, H) * 0.32;
    nodes[p].y = H / 2 + Math.sin(ang) * Math.min(W, H) * 0.32;
  }

  /* ---- force simulation ---- */
  var REPULSE = 5200, SPRING = 0.012, REST = 110, CENTER = 0.012, DAMP = 0.86;
  var alpha = 1, dragging = null;

  function tick() {
    for (var a = 0; a < nodes.length; a++) {
      var na = nodes[a];
      if (na === dragging) continue;
      var fx = (W / 2 - na.x) * CENTER, fy = (H / 2 - na.y) * CENTER;
      for (var b = 0; b < nodes.length; b++) {
        if (a === b) continue;
        var nb = nodes[b];
        var dx = na.x - nb.x, dy = na.y - nb.y;
        var d2 = dx * dx + dy * dy || 0.01;
        var d = Math.sqrt(d2);
        var f = REPULSE / d2;
        fx += (dx / d) * f; fy += (dy / d) * f;
      }
      na.vx = (na.vx + fx * alpha) * DAMP;
      na.vy = (na.vy + fy * alpha) * DAMP;
    }
    for (var li2 = 0; li2 < links.length; li2++) {
      var s = nodes[links[li2].source], t = nodes[links[li2].target];
      var dx2 = t.x - s.x, dy2 = t.y - s.y;
      var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 0.01;
      var force = (dist - REST) * SPRING;
      var ox = (dx2 / dist) * force, oy = (dy2 / dist) * force;
      if (s !== dragging) { s.vx += ox * alpha; s.vy += oy * alpha; }
      if (t !== dragging) { t.vx -= ox * alpha; t.vy -= oy * alpha; }
    }
    var pad = 28;
    for (var c = 0; c < nodes.length; c++) {
      var nc = nodes[c];
      if (nc === dragging) continue;
      nc.x += nc.vx; nc.y += nc.vy;
      if (nc.x < pad) { nc.x = pad; nc.vx = 0; }
      if (nc.x > W - pad) { nc.x = W - pad; nc.vx = 0; }
      if (nc.y < pad) { nc.y = pad; nc.vy = 0; }
      if (nc.y > H - pad) { nc.y = H - pad; nc.vy = 0; }
    }
    alpha *= 0.992;
    if (alpha < 0.02) alpha = 0.02;
    draw();
    raf = requestAnimationFrame(tick);
  }

  /* ---- DOM elements ---- */
  var gLinks = document.createElementNS(SVGNS, 'g');
  var gNodes = document.createElementNS(SVGNS, 'g');
  svg.appendChild(gLinks); svg.appendChild(gNodes);

  var lineEls = links.map(function () {
    var ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('class', 'graph-edge');
    gLinks.appendChild(ln);
    return ln;
  });

  var nodeEls = nodes.map(function (node, idx) {
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'graph-node');
    var r = 6 + Math.min(deg[idx], 6) * 1.6;
    var circ = document.createElementNS(SVGNS, 'circle');
    circ.setAttribute('r', r);
    circ.setAttribute('fill', colorOf(node));
    var label = document.createElementNS(SVGNS, 'text');
    label.setAttribute('class', 'graph-label');
    label.setAttribute('dy', -r - 6);
    label.textContent = node.title;
    g.appendChild(circ); g.appendChild(label);
    gNodes.appendChild(g);
    node._r = r; node._circ = circ; node._g = g; node._label = label;

    g.addEventListener('mouseenter', function () { highlight(idx); });
    g.addEventListener('mouseleave', function () { clearHighlight(); });
    g.addEventListener('click', function (e) {
      if (g._moved) { g._moved = false; return; }
      window.location.href = node.id;
    });
    addDrag(g, node);
    return g;
  });

  // adjacency for highlight
  var adj = nodes.map(function () { return {}; });
  for (var lk = 0; lk < links.length; lk++) { adj[links[lk].source][links[lk].target] = true; adj[links[lk].target][links[lk].source] = true; }

  function highlight(idx) {
    for (var i = 0; i < nodes.length; i++) {
      var on = (i === idx || adj[idx][i]);
      nodes[i]._g.classList.toggle('dim', !on);
      nodes[i]._g.classList.toggle('focus', i === idx);
    }
    for (var j = 0; j < links.length; j++) {
      var rel = links[j].source === idx || links[j].target === idx;
      lineEls[j].classList.toggle('active', rel);
      lineEls[j].classList.toggle('dim', !rel);
    }
  }
  function clearHighlight() {
    for (var i = 0; i < nodes.length; i++) { nodes[i]._g.classList.remove('dim', 'focus'); }
    for (var j = 0; j < lineEls.length; j++) { lineEls[j].classList.remove('active', 'dim'); }
  }

  function draw() {
    for (var i = 0; i < links.length; i++) {
      var s = nodes[links[i].source], t = nodes[links[i].target];
      lineEls[i].setAttribute('x1', s.x); lineEls[i].setAttribute('y1', s.y);
      lineEls[i].setAttribute('x2', t.x); lineEls[i].setAttribute('y2', t.y);
    }
    for (var n = 0; n < nodes.length; n++) {
      nodes[n]._g.setAttribute('transform', 'translate(' + nodes[n].x + ',' + nodes[n].y + ')');
    }
  }

  /* ---- drag ---- */
  function addDrag(g, node) {
    var startX, startY, ox, oy, moved;
    function pt(e) {
      var rect = svg.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      var cy = (e.touches ? e.touches[0].clientY : e.clientY);
      return { x: (cx - rect.left) / rect.width * W, y: (cy - rect.top) / rect.height * H };
    }
    function down(e) {
      e.preventDefault();
      dragging = node; moved = false; alpha = Math.max(alpha, 0.5);
      var pp = pt(e); startX = pp.x; startY = pp.y; ox = node.x; oy = node.y;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', up);
    }
    function move(e) {
      e.preventDefault();
      var pp = pt(e);
      if (Math.abs(pp.x - startX) > 3 || Math.abs(pp.y - startY) > 3) { moved = true; g._moved = true; }
      node.x = ox + (pp.x - startX); node.y = oy + (pp.y - startY);
      node.vx = 0; node.vy = 0;
    }
    function up() {
      dragging = null;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    }
    g.addEventListener('mousedown', down);
    g.addEventListener('touchstart', down, { passive: false });
  }

  /* ---- search ---- */
  var searchBox = document.getElementById('graph-search');
  if (searchBox) {
    searchBox.addEventListener('input', function () {
      var q = norm(this.value);
      if (!q) { clearHighlight(); return; }
      var hit = -1;
      for (var i = 0; i < nodes.length; i++) {
        var match = norm(nodes[i].title).indexOf(q) !== -1;
        nodes[i]._g.classList.toggle('dim', !match);
        nodes[i]._g.classList.toggle('focus', match);
        if (match && hit === -1) hit = i;
      }
      for (var j = 0; j < lineEls.length; j++) lineEls[j].classList.add('dim');
      alpha = Math.max(alpha, 0.25);
    });
  }

  /* ---- tag filter chips ---- */
  var filterBox = document.getElementById('graph-tag-filters');
  if (filterBox) {
    var allTags = [];
    for (var ti2 = 0; ti2 < nodes.length; ti2++) {
      for (var tg = 0; tg < nodes[ti2].tags.length; tg++) {
        if (allTags.indexOf(nodes[ti2].tags[tg]) === -1) allTags.push(nodes[ti2].tags[tg]);
      }
    }
    var active = {};
    allTags.forEach(function (tag) {
      var chip = document.createElement('button');
      chip.className = 'graph-chip';
      chip.type = 'button';
      var dot = document.createElement('span');
      dot.className = 'graph-chip-dot';
      dot.style.background = tagColor[tag] || 'var(--text-muted)';
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(tag));
      chip.addEventListener('click', function () {
        active[tag] = !active[tag];
        chip.classList.toggle('on', active[tag]);
        applyFilter(active);
      });
      filterBox.appendChild(chip);
    });
  }
  function applyFilter(active) {
    var any = false, t;
    for (t in active) if (active[t]) { any = true; break; }
    if (!any) { clearHighlight(); return; }
    for (var i = 0; i < nodes.length; i++) {
      var on = false;
      for (var k = 0; k < nodes[i].tags.length; k++) if (active[nodes[i].tags[k]]) { on = true; break; }
      nodes[i]._g.classList.toggle('dim', !on);
      nodes[i]._g.classList.remove('focus');
    }
    for (var j = 0; j < links.length; j++) {
      var sOn = false, tOn = false, s = nodes[links[j].source], tt = nodes[links[j].target];
      for (var a = 0; a < s.tags.length; a++) if (active[s.tags[a]]) sOn = true;
      for (var b = 0; b < tt.tags.length; b++) if (active[tt.tags[b]]) tOn = true;
      lineEls[j].classList.toggle('dim', !(sOn && tOn));
    }
  }

  /* ---- resize ---- */
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { size(); alpha = Math.max(alpha, 0.3); }, 150);
  });

  var raf = requestAnimationFrame(tick);
})();
