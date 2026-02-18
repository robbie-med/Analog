(() => {
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  // Theme
  const themeKey = "aos_theme";
  const html = document.documentElement;
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === "light" || savedTheme === "dark") html.dataset.theme = savedTheme;

  function toggleTheme(){
    const current = html.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = current === "light" ? "dark" : "light";
    html.dataset.theme = next;
    localStorage.setItem(themeKey, next);
  }

  // Print
  $("#btnPrint")?.addEventListener("click", () => window.print());

  // Expand/collapse all details
  let expanded = false;
  const details = () => $$("details.details");
  function setAll(open){
    details().forEach(d => d.open = open);
    expanded = open;
    const btn = $("#btnExpand");
    if (btn) btn.textContent = open ? "Collapse all" : "Expand all";
  }
  $("#btnExpand")?.addEventListener("click", () => setAll(!expanded));

  // Theme btn
  $("#btnTheme")?.addEventListener("click", toggleTheme);

  // Build TOC from h2 sections
  const toc = $("#toc");
  const headings = $$("main h2").map(h => {
    const section = h.closest("section");
    if (!section) return null;
    if (!section.id) section.id = h.textContent.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g,"");
    return { id: section.id, title: h.textContent.trim() };
  }).filter(Boolean);

  if (toc){
    toc.innerHTML = headings.map(h =>
      `<a href="#${h.id}" data-id="${h.id}">${escapeHtml(h.title)}<small>#${escapeHtml(h.id)}</small></a>`
    ).join("");
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  // Active section highlighting
  const links = toc ? $$("a", toc) : [];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if (!visible) return;
    const id = visible.target.id;
    links.forEach(a => a.classList.toggle("active", a.dataset.id === id));
  }, { rootMargin: "-20% 0px -70% 0px", threshold: [0.05, 0.15, 0.3] });

  headings.forEach(h => {
    const el = document.getElementById(h.id);
    if (el) observer.observe(el);
  });

  // Search (filters TOC + highlights matches)
  const search = $("#searchBox");
  const hint = $("#searchHint");

  function normalize(s){ return (s||"").toLowerCase().trim(); }

  function runSearch(q){
    const query = normalize(q);
    if (!query){
      links.forEach(a => a.style.display = "");
      if (hint) hint.textContent = "";
      clearHighlights();
      return;
    }

    const matches = [];
    links.forEach(a => {
      const ok = normalize(a.textContent).includes(query);
      a.style.display = ok ? "" : "none";
      if (ok) matches.push(a);
    });

    highlightInDoc(query);

    if (hint){
      hint.textContent = matches.length
        ? `${matches.length} section${matches.length===1?"":"s"} match`
        : "No section matches";
    }
  }

  function clearHighlights(){
    $$(".hl").forEach(span => {
      const parent = span.parentNode;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    });
  }

  function highlightInDoc(query){
    clearHighlights();
    if (!query) return;

    // light-touch highlight: only in paragraphs & list items
    const nodes = $$("p, li").slice(0, 220); // guardrail
    nodes.forEach(n => {
      const text = n.textContent;
      const idx = text.toLowerCase().indexOf(query);
      if (idx === -1) return;

      // Replace first occurrence only (keeps it fast/simple)
      const before = text.slice(0, idx);
      const match = text.slice(idx, idx + query.length);
      const after  = text.slice(idx + query.length);

      n.textContent = "";
      n.append(document.createTextNode(before));
      const span = document.createElement("span");
      span.className = "hl";
      span.textContent = match;
      span.style.padding = "0 2px";
      span.style.borderRadius = "6px";
      span.style.background = "rgba(124,198,255,.25)";
      n.append(span);
      n.append(document.createTextNode(after));
    });
  }

  search?.addEventListener("input", (e) => runSearch(e.target.value));

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;

    if (mod && key === "k"){
      e.preventDefault();
      search?.focus();
      return;
    }
    if (key === "/"){
      if (document.activeElement && ["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      search?.focus();
      return;
    }
    if (key === "p" && !mod){
      // quick print without opening browser dialog? browsers always show dialog; still helpful
      e.preventDefault();
      window.print();
      return;
    }
  });

  // Start collapsed (optional): keep a little friction to encourage reading flow.
  setAll(false);
})();
