const editor = document.getElementById("text");

if (editor) {
  const LIMIT = 5000;
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const rex = s => s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const clean = w => w.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,"");

  let highlightQuery = "";
  let rendering = false;

  function plainText() {
    return editor.innerText.replace(/\u00a0/g, " ");
  }

  function setPlainText(value) {
    rendering = true;
    editor.textContent = value;
    rendering = false;
  }

  function update() {
    const v = plainText();
    const chars = Array.from(v).length;
    const no = Array.from(v.replace(/\s/g,"")).length;
    const words = v.trim() ? v.trim().split(/\s+/u) : [];
    const sentences = v.trim() ? (v.match(/[.!?]+(?=\s|$)/g)||[]).length : 0;
    const paragraphs = v.trim() ? v.trim().split(/\n\s*\n/).filter(x=>x.trim()).length : 0;
    const letters = Array.from(v).filter(x => /\p{L}/u.test(x)).length;

    [$("chars"),$("charsNo"),$("words"),$("sentences"),$("paragraphs"),$("letters")]
      .forEach((e,i)=>e.textContent=[chars,no,words.length,sentences,paragraphs,letters][i].toLocaleString());

    $("limit").textContent = `${chars.toLocaleString()} / ${LIMIT.toLocaleString()}`;
    $("progress").style.width = Math.min(100, chars/LIMIT*100) + "%";

    const sec = Math.round(words.length/200*60);
    $("reading").textContent = sec < 60 ? `${sec} sec` : `${Math.ceil(sec/60)} min`;
    $("average").textContent = sentences ? (words.length/sentences).toFixed(1) : "0";

    const m = new Map();
    words.forEach(x => { x = clean(x); if(x) m.set(x,(m.get(x)||0)+1); });
    const repeated = [...m].filter(x=>x[1]>1)
      .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,30);

    $("repeatList").innerHTML = repeated.length
      ? repeated.map(([x,n])=>`<div class="repeat-row"><span>${esc(x)}</span><span class="badge">${n}×</span></div>`).join("")
      : "No repeated words found.";
  }

  function renderHighlights(query) {
    const value = plainText();
    const q = query || "";
    rendering = true;

    if (!q) {
      editor.textContent = value;
      rendering = false;
      return;
    }

    const re = new RegExp(rex(q), "gi");
    let last = 0, html = "", match, count = 0;
    while ((match = re.exec(value)) !== null) {
      html += esc(value.slice(last, match.index));
      html += `<mark>${esc(match[0])}</mark>`;
      last = match.index + match[0].length;
      count++;
      if (match[0].length === 0) re.lastIndex++;
    }
    html += esc(value.slice(last));
    editor.innerHTML = html;
    rendering = false;

    $("replaceStatus").textContent = `${count} match${count===1?"":"es"} highlighted.`;
  }

  function find() {
    const q = $("find").value;
    if (!q) {
      highlightQuery = "";
      $("replaceStatus").textContent = "Enter text to find.";
      setPlainText(plainText());
      return;
    }
    highlightQuery = q;
    renderHighlights(q);
    update();
  }

  function replaceOne() {
    const q = $("find").value;
    if (!q) { $("replaceStatus").textContent = "Enter text to find."; return; }
    const r = $("replace").value;
    const value = plainText();
    const re = new RegExp(rex(q), "i");
    if (!re.test(value)) { $("replaceStatus").textContent = "No match found."; return; }
    setPlainText(value.replace(re,r));
    $("replaceStatus").textContent = "1 occurrence replaced.";
    highlightQuery = q;
    renderHighlights(q);
    update();
  }

  function replaceAll() {
    const q = $("find").value;
    if (!q) { $("replaceStatus").textContent = "Enter text to find."; return; }
    const r = $("replace").value;
    const value = plainText();
    const re = new RegExp(rex(q), "gi");
    const matches = value.match(re);
    if (!matches) { $("replaceStatus").textContent = "No matches found."; return; }
    setPlainText(value.replace(re,r));
    $("replaceStatus").textContent = `${matches.length} occurrence${matches.length===1?"":"s"} replaced.`;
    highlightQuery = q;
    renderHighlights(q);
    update();
  }

  function transformCase(mode) {
    const value = plainText();
    let result = value;
    if (mode === "upper") result = value.toLocaleUpperCase();
    if (mode === "lower") result = value.toLocaleLowerCase();
    if (mode === "title") result = value.toLocaleLowerCase().replace(/\b\p{L}/gu, c => c.toLocaleUpperCase());
    if (mode === "sentence") {
      result = value.toLocaleLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m,a,c)=>a+c.toLocaleUpperCase());
    }
    setPlainText(result);
    if (highlightQuery) renderHighlights(highlightQuery);
    update();
  }

  $("findBtn").onclick = find;
  $("replaceBtn").onclick = replaceOne;
  $("replaceAllBtn").onclick = replaceAll;
  $("clear").onclick = () => {
    setPlainText("");
    $("find").value = "";
    $("replace").value = "";
    $("replaceStatus").textContent = "";
    highlightQuery = "";
    update();
    editor.focus();
  };

  editor.addEventListener("input", () => {
    if (rendering) return;
    // Keep the editor within the 5,000-character limit.
    const value = plainText();
    if (value.length > LIMIT) setPlainText(value.slice(0, LIMIT));
    if (highlightQuery) {
      renderHighlights(highlightQuery);
    }
    update();
  });

  $("find").addEventListener("input", () => {
    if ($("find").value) {
      highlightQuery = $("find").value;
      renderHighlights(highlightQuery);
      update();
    } else {
      highlightQuery = "";
      setPlainText(plainText());
      $("replaceStatus").textContent = "";
    }
  });

  document.querySelectorAll(".case-btn").forEach(btn => {
    btn.onclick = () => transformCase(btn.dataset.case);
  });

  const fontSelect = $("fontSelect");
  const fontSize = $("fontSize");
  const fontSizeValue = $("fontSizeValue");

  fontSelect.onchange = () => { editor.style.fontFamily = fontSelect.value; };
  fontSize.oninput = () => {
    editor.style.fontSize = fontSize.value + "px";
    fontSizeValue.textContent = fontSize.value + "px";
  };

  const themes = ["ink","graphite","newspaper","mono","blueprint"];
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.onclick = () => {
      document.body.classList.remove(...themes.map(t => "theme-"+t));
      document.body.classList.add("theme-"+btn.dataset.theme);
      document.querySelectorAll(".theme-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
    };
  });

  update();
}
