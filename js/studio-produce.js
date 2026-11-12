// D1 Studio, Day 3 tools: produce and publish.
//   video    · view "plan": script and storyboard (shots, audio, on-screen text, seconds) with a hook / value / proof / CTA timeline
//            · view "produce": equipment set-up, the exported video (size and length read from the file), editing checklist,
//              music and media licences, and video SEO (title, caption, hashtags, cover) with a 9:16 preview
//   blog     · SEO blog editor: keyword, SEO title, slug, meta description, category and tags, HTML body with a format bar,
//              featured image with alt text; live Google result preview, page preview and an SEO checklist
//   campaign · scheduling queue (imports the Day 2 calendar), A/B test, boost plan and prepared replies
import { el, icon, toast } from "./ui.js";
import { field, select, rowsEditor, card, idb, readImage, shrink, readVideo, kv, table } from "./studio-kit.js";

const C = () => window.LabCheck;
const SHOT_TYPES = ["Wide", "Medium", "Close-up", "Over-the-shoulder", "Screen / text"];
const PARTS = [["hook", "Hook", 0, 3], ["value", "Value / story", 3, 20], ["proof", "Proof", 20, 25], ["cta", "Call to action", 25, 30]];
const PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Blog / website"];
const SETUP = [["tripod", "Tripod or stable two-hand grip"], ["light", "Light at 45 degrees, no strong backlight"], ["mic", "Microphone tested in a quiet place"],
  ["lens", "Lens cleaned; exposure and focus locked"], ["format", "Camera set to 9:16, 1080 × 1920, 30 fps"]];
const EDIT = [["trim", "Dead air and mistakes trimmed; fast pace"], ["captions", "Captions added (people watch muted)"], ["text", "On-screen text in brand fonts"],
  ["music", "Licensed music under the voice, at a low level"], ["color", "Color-corrected so the clips match"], ["export", "Exported 1080 × 1920, 30 fps, H.264"]];
const CATS = ["Informational", "Commercial", "Transactional", "Navigational"];
const CONTENT = ["Post 1 (feed)", "Post 2 (promo)", "Post 3 (story)", "Short video", "Blog post", "Other post"];
const STATUS = ["Scheduled", "Published", "Draft"];
const AB_ELEMENTS = ["Headline / first line", "Image or video cover", "Call to action"];
const fmtS = (n) => `${Math.round(n * 10) / 10} s`;

export function emptyProduce() {
  return {
    video: { title: "", idea: "", shots: [{ type: "", visual: "", audio: "", text: "", secs: "" }], setup: {}, edit: {}, file: null, media: [],
      seo: { title: "", caption: "", cover: "" } },
    blog: { keyword: "", title: "", slug: "", meta: "", category: "", tags: "", body: "", image: null, alt: "" },
    campaign: { queue: [], ab: { element: "", a: "", b: "", audience: "", metric: "" }, boost: { post: "", location: "", age: "", interests: "", budget: "", days: "" }, faq: [] },
  };
}

// ------------------------------------------------------------------ VIDEO · plan (storyboard)
function timeline(shots) {
  let t = 0;
  const segs = shots.map((s, i) => { const d = Math.max(0, parseFloat(s.secs) || 0); const x = { i, t0: t, d, type: s.type, visual: s.visual }; t += d; return x; });
  const total = Math.max(t, 30);
  const pct = (v) => `${(100 * v) / total}%`;
  return el("div", { class: "tline" },
    el("div", { class: "tl-parts" }, ...PARTS.map(([k, label, a, b]) => el("span", { class: "tl-p tl-" + k, style: `left:${pct(a)};width:${pct(b - a)}` }, label))),
    el("div", { class: "tl-shots" }, ...segs.filter((s) => s.d > 0).map((s) => el("span", { class: "tl-s", style: `left:${pct(s.t0)};width:${pct(s.d)}`, title: `${s.i + 1}. ${s.type} · ${fmtS(s.d)}\n${s.visual}` }, String(s.i + 1)))),
    el("div", { class: "tl-foot small" }, el("span", { class: t >= 15 && t <= 30 ? "okc" : "warnc" }, `Total ${fmtS(t)} (aim for 15–30 s)`),
      el("span", { class: "muted" }, "The first shot is the hook: 3 seconds or less.")));
}
function videoPlan(v, onChange) {
  const live = el("div", {});
  const draw = () => live.replaceChildren(timeline(v.shots));
  const ch = () => { onChange(); draw(); };
  draw();
  return el("div", { class: "stool" },
    card("Video idea", "One short video for your client: what it shows and why people will watch it to the end.",
      el("div", { class: "sgrid" }, field("Working title", v, "title", { placeholder: "e.g. How Lola weaves one inabel blanket", onChange: ch }),
        field("Idea and message (hook → value → proof → call to action)", v, "idea", { area: true, rows: 3, onChange: ch }))),
    card("Storyboard", "6 to 10 shots. Mix wide, medium and close-up shots; change the shot every 1–3 seconds.",
      rowsEditor(v.shots, [{ key: "type", label: "Shot", type: "select", options: SHOT_TYPES, w: "8.5rem" }, { key: "visual", label: "What is seen" },
        { key: "audio", label: "What is heard (voice, sound, music)" }, { key: "text", label: "On-screen text", w: "10rem" }, { key: "secs", label: "Seconds", w: "5rem", placeholder: "2" }],
        { addLabel: "Add a shot", onChange: ch, min: 1, blank: () => ({ type: "", visual: "", audio: "", text: "", secs: "" }) }), live));
}

// ------------------------------------------------------------------ VIDEO · produce
function ticks(list, obj, onChange) {
  return el("div", { class: "proof" }, ...list.map(([k, t]) => {
    const cb = el("input", { type: "checkbox", checked: !!obj[k] });
    cb.addEventListener("change", () => { obj[k] = cb.checked; onChange(); });
    return el("label", { class: "choice" }, cb, el("span", {}, t));
  }));
}
export function reelPreview(v, brand, still) {
  const s = v.seo || {}, cap = String(s.caption || "");
  return el("div", { class: "pv pv-story pv-reel" },
    el("div", { class: "pv-media", style: "aspect-ratio:1080/1920" }, still ? el("img", { src: still, alt: "" }) : el("div", { class: "pv-empty" }, el("span", {}, "9:16"), el("span", { class: "small" }, "1080 × 1920"))),
    v.file ? el("span", { class: "pv-dur" }, fmtS(v.file.dur)) : "",
    el("div", { class: "pv-side" }, "♡", "◯", "➤"),
    el("div", { class: "pv-bottom" }, el("div", { class: "pv-tcap" }, el("b", {}, "@" + String(brand || "yourbrand").toLowerCase().replace(/\W+/g, "")), " ",
      s.title ? el("b", {}, s.title + " · ") : "", cap.slice(0, 110) + (cap.length > 110 ? "…" : ""))));
}
function videoProduce(v, onChange, opts) {
  const brand = opts.brand || "";
  let still = null;
  const pvHost = el("div", { class: "pv-host" });
  const drawPv = () => pvHost.replaceChildren(reelPreview(v, brand, still || (v.file && v.file.thumb)));
  const meta = el("div", { class: "imgmeta small" });
  const paintMeta = () => {
    const f = v.file;
    if (!f) return meta.replaceChildren(el("span", { class: "muted" }, "Export from CapCut or DaVinci Resolve: 1080 × 1920, 30 fps, 15–30 seconds. The video stays on this device; the lab reads its size and length."));
    const sizeOk = C().studioCheck({ k: "ratio", path: "", w: 1080, h: 1920, minW: 1080 }, f), lenOk = f.dur >= 15 && f.dur <= 30;
    meta.replaceChildren(el("span", { class: "tag " + (sizeOk ? "good" : "warn") }, sizeOk ? "SIZE OK" : "CHECK SIZE"), el("span", { class: "tag " + (lenOk ? "good" : "warn") }, lenOk ? "LENGTH OK" : "CHECK LENGTH"),
      el("span", {}, ` ${f.name} · ${f.w} × ${f.h} px · ${fmtS(f.dur)}`));
  };
  const file = el("input", { type: "file", accept: "video/mp4,video/quicktime,video/webm", hidden: true });
  const pick = el("button", { class: "btn small", type: "button" }, icon("download"), v.file ? "Replace the video" : "Choose the exported video");
  pick.addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const fl = file.files[0];
    if (!fl) return;
    try {
      const info = await readVideo(fl);
      still = info.still; delete info.still;
      v.file = info;
      if (opts.scope) idb.set(opts.scope + "|video", still);
      if (!v.media.some((r) => r.file === fl.name)) v.media.push({ file: fl.name, source: "Own video", license: "own work", consent: "" });
      pick.lastChild.textContent = "Replace the video";
      paintMeta(); drawPv(); drawMedia(); onChange();
    } catch (e) { toast(e.message, "bad"); }
    file.value = "";
  });
  if (opts.scope && v.file) idb.get(opts.scope + "|video").then((s) => { if (s) { still = s; drawPv(); } });
  const mediaHost = el("div", {});
  const drawMedia = () => mediaHost.replaceChildren(rowsEditor(v.media, [{ key: "file", label: "Clip, music or image", w: "11rem" },
    { key: "source", label: "Source", type: "select", options: ["Own video", "Own photo", "Commercial music library (platform)", "CapCut / Canva Pro library", "Royalty-free library (license read)", "Client-provided"], w: "13rem" },
    { key: "license", label: "License / permission" }, { key: "consent", label: "Consent (people)", type: "select", options: ["Not needed (no identifiable person)", "Yes, signed consent", "Missing"], w: "12rem" }],
    { addLabel: "Add a clip, song or image", onChange }));
  drawMedia(); paintMeta(); drawPv();
  const seo = v.seo;
  const capStats = el("div", { class: "capstats small" });
  const paintCap = () => { const t = seo.caption || "", n = (t.match(/#[^\s#.,!?;:()]+/g) || []).length;
    capStats.replaceChildren(el("span", {}, `${t.length} / 2200 characters`), el("span", { class: n >= 3 && n <= 5 ? "okc" : "warnc" }, `${n} hashtag${n === 1 ? "" : "s"} (use 3–5)`)); };
  paintCap();
  const ch = () => { onChange(); drawPv(); paintCap(); };
  return el("div", { class: "stool" },
    card("1 · Set up the equipment", "Tick each item when it is ready, before you record.", ticks(SETUP, v.setup, onChange)),
    card("2 · The exported video", "", el("div", { class: "btnrow" }, pick, file), meta),
    card("3 · Editing checklist", "In CapCut or DaVinci Resolve, following your storyboard.", ticks(EDIT, v.edit, onChange)),
    card("4 · Music and media used", "Business accounts use the platform's commercial music library. Record every clip, song and image.", mediaHost),
    card("5 · Video SEO and preview", "The title and caption carry your keyword; 3–5 hashtags; a cover that shows the topic.",
      el("div", { class: "post-grid" }, el("div", { class: "post-form" },
        field("Video title (with your keyword)", seo, "title", { max: 100, onChange: ch }),
        field("Caption", seo, "caption", { area: true, rows: 5, placeholder: "Hook line, one sentence of value, call to action, then 3–5 hashtags", onChange: ch }), capStats,
        field("Cover (which frame or text)", seo, "cover", { placeholder: "e.g. Close-up of the loom with the text 'Made by Lola'", onChange: ch })),
        el("div", { class: "post-pv" }, el("div", { class: "sf-l" }, "Live preview"), pvHost))));
}

// ------------------------------------------------------------------ BLOG
const FMT = [["H2", "<h2>", "</h2>", "Subheading"], ["B", "<strong>", "</strong>", "important words"], ["List", "<ul>\n  <li>", "</li>\n  <li>Second point</li>\n</ul>", "First point"],
  ["Link", '<a href="https://">', "</a>", "link text"], ["P", "<p>", "</p>", "Paragraph"]];
const SAFE = /<(\/?)(h2|h3|p|strong|b|em|i|ul|ol|li|a|br|blockquote)(\s+href="[^"<>]*")?\s*\/?>/gi;
/** The body as safe HTML: only the formatting tags the lesson teaches (no scripts, styles or events). */
export function safeHtml(src) {
  const keep = [];
  const s = String(src || "").replace(SAFE, (m, close, tag, href) => { keep.push(`<${close}${tag.toLowerCase()}${href && !close ? href.replace(/javascript:/gi, "") + ' target="_blank" rel="noopener"' : ""}>`); return `\u0000${keep.length - 1}\u0000`; });
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(/\u0000(\d+)\u0000/g, (m, i) => keep[i]).replace(/\n{2,}/g, "<br><br>");
}
const slugify = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
export function serpPreview(b, site) {
  const url = `${site || "yourbrand.com"} › ${b.slug || slugify(b.title) || "post"}`;
  const meta = String(b.meta || ""), title = String(b.title || "Your SEO title");
  return el("div", { class: "serp" }, el("div", { class: "serp-url small" }, url),
    el("div", { class: "serp-t" }, title.length > 60 ? title.slice(0, 58) + "…" : title),
    el("div", { class: "serp-d small" }, meta ? (meta.length > 160 ? meta.slice(0, 157) + "…" : meta) : el("span", { class: "muted" }, "Your meta description appears here.")));
}
function blogTool(b, onChange, opts) {
  let imgSrc = null;
  const page = el("div", { class: "blogpv" });
  const serp = el("div", {});
  const meter = el("div", { class: "capstats small" });
  const draw = () => {
    serp.replaceChildren(serpPreview(b, opts.site));
    page.replaceChildren(el("div", { class: "bp-cat small" }, [b.category, b.tags].filter(Boolean).join(" · ")),
      el("h1", {}, b.title || "Your SEO title"), imgSrc || (b.image && b.image.thumb) ? el("img", { src: imgSrc || b.image.thumb, alt: b.alt || "" }) : "",
      el("div", { class: "bp-body", html: safeHtml(b.body) || "<p class='muted'>Your post appears here.</p>" }));
    const words = String(b.body || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    meter.replaceChildren(el("span", { class: words >= 400 ? "okc" : "warnc" }, `${words} words (at least 400)`),
      el("span", { class: (b.title || "").length >= 30 && (b.title || "").length <= 60 ? "okc" : "warnc" }, `Title ${(b.title || "").length} chars (30–60)`),
      el("span", { class: (b.meta || "").length >= 120 && (b.meta || "").length <= 160 ? "okc" : "warnc" }, `Meta ${(b.meta || "").length} chars (120–160)`));
  };
  const ch = () => { onChange(); draw(); };
  const body = el("textarea", { rows: 16, class: "mono", placeholder: "<p>Hook sentence with your keyword…</p>\n<h2>First subheading</h2>\n<p>…</p>" });
  body.value = b.body || "";
  body.addEventListener("input", () => { b.body = body.value; ch(); });
  const bar = el("div", { class: "fmtbar" }, ...FMT.map(([label, a, z, sample]) => {
    const btn = el("button", { class: "btn small", type: "button", title: `Insert ${a}` }, label);
    btn.addEventListener("click", () => {
      const s = body.selectionStart, e = body.selectionEnd, sel = body.value.slice(s, e) || sample;
      body.setRangeText(a + sel + z, s, e, "end"); body.focus(); b.body = body.value; ch();
    });
    return btn;
  }));
  const slugBtn = el("button", { class: "btn small", type: "button" }, "Make from title");
  const slugIn = el("input", { type: "text", value: b.slug || "", placeholder: "breakfast-san-juan-la-union" });
  slugIn.addEventListener("input", () => { b.slug = slugIn.value; ch(); });
  slugBtn.addEventListener("click", () => { b.slug = slugIn.value = slugify(b.title); ch(); });
  const file = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true });
  const pick = el("button", { class: "btn small", type: "button" }, icon("download"), b.image ? "Replace the image" : "Upload the featured image");
  const imeta = el("div", { class: "imgmeta small" });
  const paintImg = () => {
    if (!b.image) return imeta.replaceChildren(el("span", { class: "muted" }, "Featured image: 1280 × 720 (16:9), compressed, with a descriptive file name."));
    const ok = C().studioCheck({ k: "ratio", path: "", w: 1280, h: 720, minW: 1280 }, b.image);
    imeta.replaceChildren(el("span", { class: "tag " + (ok ? "good" : "warn") }, ok ? "SIZE OK" : "CHECK SIZE"), ` ${b.image.name} · ${b.image.w} × ${b.image.h} px · ${Math.round(b.image.size / 1024)} KB`);
  };
  pick.addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const fl = file.files[0];
    if (!fl) return;
    try {
      const { im, url } = await readImage(fl);
      b.image = { w: im.naturalWidth, h: im.naturalHeight, name: fl.name, size: fl.size, thumb: shrink(im, 160, 0.6) };
      imgSrc = shrink(im, 720, 0.8); URL.revokeObjectURL(url);
      if (opts.scope) idb.set(opts.scope + "|blogimg", imgSrc);
      pick.lastChild.textContent = "Replace the image"; paintImg(); ch();
    } catch (e) { toast(e.message, "bad"); }
    file.value = "";
  });
  if (opts.scope && b.image) idb.get(opts.scope + "|blogimg").then((s) => { if (s) { imgSrc = s; draw(); } });
  paintImg(); draw();
  return el("div", { class: "stool" },
    opts.keywords && opts.keywords.length ? el("p", { class: "ctxline small" }, el("b", {}, "Long-tail keywords from your Day 2 list: "), opts.keywords.join(" · ")) : "",
    card("1 · Keyword and search result", "Write for people first; put the keyword where Google looks.",
      el("div", { class: "post-grid" }, el("div", { class: "post-form" },
        field("Main keyword (long-tail)", b, "keyword", { placeholder: "e.g. inabel blanket Paoay", onChange: ch }),
        field("SEO title (H1)", b, "title", { max: 60, placeholder: "Contains the keyword; 30–60 characters", onChange: ch }),
        el("label", { class: "sf" }, el("span", { class: "sf-l" }, "URL slug"), el("div", { class: "btnrow" }, slugIn, slugBtn)),
        field("Meta description", b, "meta", { area: true, rows: 3, max: 160, placeholder: "120–160 characters, with the keyword", onChange: ch })),
        el("div", { class: "post-pv" }, el("div", { class: "sf-l" }, "Google result preview"), serp))),
    card("2 · Category, tags and featured image", "",
      el("div", { class: "sgrid" }, el("label", { class: "sf" }, el("span", { class: "sf-l" }, "Content category"), select(CATS, b.category || "", (v) => { b.category = v; ch(); })),
        field("Tags (3–5, separated by commas)", b, "tags", { placeholder: "Paoay, inabel, handwoven, Ilocos Norte", onChange: ch })),
      el("div", { class: "btnrow" }, pick, file), imeta, field("Alt text of the image", b, "alt", { placeholder: "Describe the image, with the keyword if natural", onChange: ch })),
    card("3 · Write the post", "At least 400 words. Keyword in the first 100 words; 2 or more H2 subheadings; a list; one internal link (starts with /) and one trusted external link (https://).",
      el("div", { class: "post-grid blog-grid" }, el("div", { class: "post-form" }, bar, body, meter),
        el("div", { class: "post-pv" }, el("div", { class: "sf-l" }, "Page preview"), page))));
}

// ------------------------------------------------------------------ CAMPAIGN
function campaignTool(c, onChange, opts) {
  const qHost = el("div", {});
  const drawQ = () => qHost.replaceChildren(rowsEditor(c.queue, [{ key: "date", label: "Date", type: "date", w: "9.5rem" }, { key: "time", label: "Time", w: "6rem", placeholder: "7:00 PM" },
    { key: "platform", label: "Platform", type: "select", options: PLATFORMS, w: "9rem" }, { key: "content", label: "Content", type: "select", options: CONTENT, w: "10rem" },
    { key: "note", label: "Caption / note" }, { key: "status", label: "Status", type: "select", options: STATUS, w: "8rem" }], { addLabel: "Add to the queue", onChange, blank: () => ({ status: "Scheduled" }) }));
  drawQ();
  const imp = el("button", { class: "btn small", type: "button" }, "Import my Day 2 calendar");
  imp.addEventListener("click", () => {
    const cal = (opts.calendar || []).filter((r) => r.date || r.hook);
    if (!cal.length) return toast("Your Day 2 calendar is empty on this device.", "bad");
    const have = new Set(c.queue.map((r) => `${r.date}|${r.platform}|${r.note}`));
    let n = 0;
    for (const r of cal) {
      const row = { date: r.date || "", time: "", platform: r.platform || "", content: /reel|video/i.test(r.type || "") ? "Short video" : /blog/i.test(r.type || "") ? "Blog post" : "Other post",
        note: [r.hook, r.cta].filter(Boolean).join(" · "), status: "Scheduled" };
      if (!have.has(`${row.date}|${row.platform}|${row.note}`)) { c.queue.push(row); n++; }
    }
    drawQ(); onChange(); toast(`${n} post${n === 1 ? "" : "s"} imported. Add the times, and the content of each.`, "good");
  });
  const ab = c.ab, bo = c.boost;
  return el("div", { class: "stool" },
    card("1 · Scheduling queue", "Everything you scheduled in Meta Business Suite, TikTok Studio or WordPress: date, time, platform and content.",
      el("div", { class: "btnrow" }, imp), qHost),
    card("2 · A/B (split) test", "Two versions of ONE post that differ in one element only; same audience and budget.",
      el("div", { class: "sgrid" }, el("label", { class: "sf" }, el("span", { class: "sf-l" }, "Element that changes"), select(AB_ELEMENTS, ab.element || "", (v) => { ab.element = v; onChange(); })),
        field("Metric that decides the winner", ab, "metric", { placeholder: "e.g. link clicks (CTR)", onChange })),
      el("div", { class: "sgrid" }, field("Version A", ab, "a", { area: true, rows: 2, onChange }), field("Version B", ab, "b", { area: true, rows: 2, onChange }))),
    card("3 · Boost plan", "Boost the best organic post to a defined audience, with a budget and an end date (practice mode unless your trainer says otherwise).",
      el("div", { class: "sgrid" }, field("Post to boost", bo, "post", { onChange }), field("Location", bo, "location", { placeholder: "e.g. Laoag City + 25 km", onChange }),
        field("Age range", bo, "age", { placeholder: "e.g. 25–45", onChange }), field("Interests", bo, "interests", { placeholder: "e.g. handicrafts, travel, gifts", onChange }),
        field("Total budget (₱)", bo, "budget", { placeholder: "e.g. 500", onChange }), field("Days", bo, "days", { placeholder: "e.g. 5", onChange }))),
    card("4 · Prepared replies", "Answers to the questions and comments you expect, in the brand voice.",
      rowsEditor(c.faq, [{ key: "q", label: "Expected question or comment" }, { key: "a", label: "Reply" }], { addLabel: "Add a reply", onChange })));
}

// ------------------------------------------------------------------ mount, read-only views, text
export function mountProduce(tool, view, doc, onChange, opts) {
  if (tool === "video") return view === "produce" ? videoProduce(doc.video, onChange, opts) : videoPlan(doc.video, onChange);
  if (tool === "blog") return blogTool(doc.blog, onChange, opts);
  return campaignTool(doc.campaign, onChange, opts);
}
export function produceView(tool, a) {
  a = a || {};
  if (tool === "video") {
    const shots = a.shots || [];
    return el("div", { class: "sview" }, kv([["Title", a.title], ["Idea", a.idea]]), shots.length ? timeline(shots) : "",
      table(["#", "Shot", "Seen", "Heard", "Text", "Sec"], shots.map((s, i) => [String(i + 1), s.type, s.visual, s.audio, s.text, s.secs])),
      a.file ? el("div", { class: "pv-row" }, el("div", { class: "pv-mini" }, el("div", { class: "small" }, `${a.file.name} · ${a.file.w}×${a.file.h} · ${fmtS(a.file.dur)}`),
        reelPreview(a, a.brand, a.file.thumb))) : "",
      kv([["Set-up", SETUP.filter(([k]) => (a.setup || {})[k]).length + "/" + SETUP.length], ["Editing", EDIT.filter(([k]) => (a.edit || {})[k]).length + "/" + EDIT.length],
        ["SEO title", (a.seo || {}).title], ["Caption", (a.seo || {}).caption], ["Cover", (a.seo || {}).cover]]),
      table(["Clip / song / image", "Source", "License", "Consent"], (a.media || []).map((r) => [r.file, r.source, r.license, r.consent])));
  }
  if (tool === "blog") {
    return el("div", { class: "sview" }, serpPreview(a), kv([["Keyword", a.keyword], ["Category", a.category], ["Tags", a.tags], ["Image", a.image ? `${a.image.name} ${a.image.w}×${a.image.h}` : ""], ["Alt", a.alt]]),
      el("div", { class: "blogpv" }, el("h1", {}, a.title || ""), el("div", { class: "bp-body", html: safeHtml(a.body) })));
  }
  const ab = a.ab || {}, bo = a.boost || {};
  return el("div", { class: "sview" }, table(["Date", "Time", "Platform", "Content", "Note", "Status"], (a.queue || []).map((r) => [r.date, r.time, r.platform, r.content, r.note, r.status])),
    kv([["A/B element", ab.element], ["Version A", ab.a], ["Version B", ab.b], ["Metric", ab.metric], ["Boost", [bo.post, bo.location, bo.age, bo.interests, bo.budget && "₱" + bo.budget, bo.days && bo.days + " days"].filter(Boolean).join(" · ")]]),
    table(["Question / comment", "Reply"], (a.faq || []).map((r) => [r.q, r.a])));
}
export function produceText(tool, a) {
  a = a || {};
  if (tool === "video") return [`Title: ${a.title || ""}`, `Idea: ${a.idea || ""}`, "Storyboard:", ...(a.shots || []).map((s, i) => ` ${i + 1}. ${s.type} | ${s.visual} | ${s.audio} | ${s.text} | ${s.secs}s`),
    `Video: ${a.file ? `${a.file.name} (${a.file.w} x ${a.file.h}, ${a.file.dur} s)` : "none"}`, `SEO title: ${(a.seo || {}).title || ""}`, `Caption: ${(a.seo || {}).caption || ""}`,
    "Media:", ...(a.media || []).map((r) => ` - ${r.file} | ${r.source} | ${r.license} | ${r.consent}`)].join("\n");
  if (tool === "blog") return [`Keyword: ${a.keyword || ""}`, `SEO title: ${a.title || ""}`, `Slug: ${a.slug || ""}`, `Meta: ${a.meta || ""}`, `Category: ${a.category || ""}`, `Tags: ${a.tags || ""}`,
    `Image: ${a.image ? a.image.name : ""} | alt: ${a.alt || ""}`, "Body (HTML):", a.body || ""].join("\n");
  const ab = a.ab || {}, bo = a.boost || {};
  return ["Queue:", ...(a.queue || []).map((r) => ` - ${r.date} ${r.time} | ${r.platform} | ${r.content} | ${r.note} | ${r.status}`),
    `A/B: ${ab.element || ""} | A: ${ab.a || ""} | B: ${ab.b || ""} | metric: ${ab.metric || ""}`,
    `Boost: ${bo.post || ""} | ${bo.location || ""} | ${bo.age || ""} | ${bo.interests || ""} | P${bo.budget || ""} | ${bo.days || ""} days`,
    "Replies:", ...(a.faq || []).map((r) => ` - ${r.q} => ${r.a}`)].join("\n");
}
