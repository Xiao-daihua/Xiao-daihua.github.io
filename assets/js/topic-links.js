/* ============================================================
   topic-links.js  (ES5, no deps)
   1. Turns [[Topic Title]] in the body into resolved links.
   2. Computes backlinks: which other topics link to THIS one.
   Both use window.TITLE_MAP and window.GRAPH injected by Jekyll.
   ============================================================ */
(function () {
  var TITLE_MAP = window.TITLE_MAP || {};
  var GRAPH = window.GRAPH || { nodes: [], raw: {} };

  /* ---- helpers ---- */
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').replace(/^ | $/g, ''); }

  // Resolve a wikilink label to a url, or null. Supports [[Title]] and [[Title|shown text]].
  function resolve(label) {
    var url = TITLE_MAP[norm(label)];
    return url || null;
  }

  /* ---- 1. inline wikilinks ----
     We only touch text nodes so we never break existing HTML/MathJax. */
  function renderWikilinks(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [], n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.indexOf('[[') !== -1) {
        // skip inside code / pre / existing links / math
        var p = n.parentNode, skip = false;
        while (p && p !== root) {
          var tag = (p.tagName || '').toLowerCase();
          if (tag === 'code' || tag === 'pre' || tag === 'a' ||
              (p.className && /mjx|MathJax/.test(p.className))) { skip = true; break; }
          p = p.parentNode;
        }
        if (!skip) textNodes.push(n);
      }
    }
    var re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    for (var i = 0; i < textNodes.length; i++) {
      var node = textNodes[i], text = node.nodeValue, frag = document.createDocumentFragment();
      var last = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var label = m[1].replace(/^\s+|\s+$/g, '');
        var shown = (m[2] || m[1]).replace(/^\s+|\s+$/g, '');
        var url = resolve(label);
        if (url) {
          var a = document.createElement('a');
          a.href = url; a.className = 'wikilink'; a.textContent = shown;
          frag.appendChild(a);
        } else {
          var span = document.createElement('span');
          span.className = 'wikilink-broken'; span.title = 'No topic named "' + label + '"';
          span.textContent = shown;
          frag.appendChild(span);
        }
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    }
  }

  /* ---- 2. backlinks ----
     A topic B links to A if B's raw content contains [[A Title]]
     or a literal href to A's url. */
  function titleToUrl() { return TITLE_MAP; }

  function linksFrom(raw) {
    var out = {}; // set of target urls
    if (!raw) return out;
    var re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, m;
    while ((m = re.exec(raw)) !== null) {
      var u = TITLE_MAP[norm(m[1])];
      if (u) out[u] = true;
    }
    // literal hrefs e.g. /database/0005noninvsymmetry/
    var hre = /\/database\/[a-z0-9\-]+\/?/gi, h;
    while ((h = hre.exec(raw)) !== null) {
      var path = h[0].replace(/\/$/, '');
      out[path] = true; out[path + '/'] = true;
    }
    return out;
  }

  function computeBacklinks(thisUrl) {
    var results = [];
    var titleByUrl = {};
    for (var i = 0; i < GRAPH.nodes.length; i++) titleByUrl[GRAPH.nodes[i].id] = GRAPH.nodes[i].title;
    var clean = thisUrl.replace(/\/$/, '');
    for (var url in GRAPH.raw) {
      if (!GRAPH.raw.hasOwnProperty(url)) continue;
      if (url.replace(/\/$/, '') === clean) continue;
      var targets = linksFrom(GRAPH.raw[url]);
      if (targets[thisUrl] || targets[clean] || targets[clean + '/']) {
        results.push({ url: url, title: titleByUrl[url] || url });
      }
    }
    results.sort(function (a, b) { return a.title < b.title ? -1 : 1; });
    return results;
  }

  /* ---- run ---- */
  function run() {
    var body = document.querySelector('.topic-body');
    renderWikilinks(body);

    var container = document.getElementById('pageContent');
    var thisUrl = container ? container.getAttribute('data-topic-url') : null;
    if (!thisUrl) return;
    var back = computeBacklinks(thisUrl);
    if (!back.length) return;
    var box = document.getElementById('backlinks');
    var list = document.getElementById('backlinks-list');
    for (var i = 0; i < back.length; i++) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = back[i].url; a.textContent = back[i].title;
      li.appendChild(a);
      list.appendChild(li);
    }
    box.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
