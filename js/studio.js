// D1 Studio: the content tools of the lab. Each tool edits one part of the day's studio document (saved on this device,
// sent with the activity as the answer of its "studio" part) and redraws a live preview.
//   planner  · view "strategy": client brief, vision, purpose, SMART goals, audience, platforms, equipment and tools
//            · view "calendar": keyword list and the content calendar (mix bar + two-week calendar view)
//   posts    · post composer: image size check, caption with counters, framework, CTA, proofreading checklist,
//              live Facebook / Instagram / TikTok / Story previews, and the media log
import { el, icon, toast } from "./ui.js";
import { field, select, rowsEditor, card, idb, readImage, shrink, kv, table } from "./studio-kit.js";
import { emptyProduce, mountProduce, produceView, produceText } from "./studio-produce.js";

const C = () => window.LabCheck;

// ------------------------------------------------------------------ reference data
export const PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Blog / website"];
const LIMITS = { Facebook: 63206, Instagram: 2200, TikTok: 2200, YouTube: 5000, LinkedIn: 3000, "Blog / website": 20000 };
const FOLD = { Facebook: 125, Instagram: 125, TikTok: 100, YouTube: 100, LinkedIn: 210, "Blog / website": 160 };
export const FORMATS = {
  feed: { label: "Feed post", w: 1080, h: 1080, ratio: "1:1" },
  promo: { label: "Promo (portrait)", w: 1080, h: 1350, ratio: "4:5" },
  story: { label: "Story / Reel cover", w: 1080, h: 1920, ratio: "9:16" },
  wide: { label: "Thumbnail / blog image", w: 1280, h: 720, ratio: "16:9" },
};
const TOOL_TYPES = ["Equipment", "Design tool", "Video / photo editing", "Word processing", "Scheduling tool", "Time tracking"];
const KW_TYPES = ["Long-tail", "Local", "Hashtag", "Short-tail"];
const PURPOSES = ["Awareness", "Consideration", "Sales"];
const CONTENT_TYPES = ["Photo post", "Carousel", "Reel / short video", "Story", "Live video", "Blog article", "Boosted post"];
const MIX = [["value", "Value (teach / entertain)"], ["engagement", "Engagement (ask / user content)"], ["offer", "Offer (promo / sale)"]];
const STATUS = ["Draft", "For approval", "Approved", "Scheduled", "Published"];
const SOURCES = ["Own photo", "Own video", "Canva Pro library", "Pexels / Pixabay (free license)", "Client-provided"];
const CONSENT = ["Not needed (no identifiable person)", "Yes, signed consent", "Missing"];
export const PROOF = [["kw", "Keywords", "Planned keywords and hashtags are used naturally"],
  ["grammar", "Grammar and spelling", "English / Filipino correct; names and prices spelled right"],
  ["structure", "Structure", "Starts with a hook, ends with ONE clear call to action"],
  ["tone", "Tone and brand voice", "Sounds like the brand"],
  ["compliance", "Compliance", "Follows laws, platform rules, clear promo terms"],
  ["trigger", "Trigger words", "No flagged or offensive words, no exaggerated claims"],
  ["accuracy", "Relevance and accuracy", "Every fact, price, date and claim is true and current"]];
const FRAMEWORKS = {
  AIDA: ["Attention: the hook", "Interest: what it is", "Desire: why they want it", "Action: what to do now"],
  PAS: ["Problem", "Agitate: why it hurts", "Solution: your product"],
  BAB: ["Before: the situation now", "After: the better situation", "Bridge: how your product gets them there"],
};

// ------------------------------------------------------------------ document
export function emptyDoc() {
  return {
    v: 1,
    planner: {
      client: { name: "", products: "", location: "", pages: "" }, vision: "", purpose: "",
      goals: [{ text: "" }, { text: "" }],
      audience: { cold: { who: "", msg: "" }, warm: { who: "", msg: "" }, hot: { who: "", msg: "" } },
      platforms: [{ name: "", why: "" }, { name: "", why: "" }], tools: [{ type: "", name: "" }],
      keywords: [], calendar: [],
    },
    posts: { items: [], log: [] },
    ...emptyProduce(),
  };
}
/** Fill gaps left by older saves so every tool can rely on its fields. */
export function normDoc(d) {
  const e = emptyDoc();
  d = d && typeof d === "object" ? d : {};
  const p = { ...e.planner, ...(d.planner || {}) };
  p.client = { ...e.planner.client, ...(p.client || {}) };
  p.audience = { cold: { ...e.planner.audience.cold, ...((p.audience || {}).cold || {}) },
    warm: { ...e.planner.audience.warm, ...((p.audience || {}).warm || {}) }, hot: { ...e.planner.audience.hot, ...((p.audience || {}).hot || {}) } };
  for (const k of ["goals", "platforms", "tools", "keywords", "calendar"]) if (!Array.isArray(p[k])) p[k] = [];
  const posts = { items: [], log: [], ...(d.posts || {}) };
  const e2 = emptyProduce();
  const video = { ...e2.video, ...(d.video || {}) };
  video.seo = { ...e2.video.seo, ...(video.seo || {}) }; video.setup = video.setup || {}; video.edit = video.edit || {};
  if (!Array.isArray(video.shots) || !video.shots.length) video.shots = e2.video.shots;
  if (!Array.isArray(video.media)) video.media = [];
  const blog = { ...e2.blog, ...(d.blog || {}) };
  const campaign = { ...e2.campaign, ...(d.campaign || {}) };
  campaign.ab = { ...e2.campaign.ab, ...(campaign.ab || {}) }; campaign.boost = { ...e2.campaign.boost, ...(campaign.boost || {}) };
  for (const k of ["queue", "faq"]) if (!Array.isArray(campaign[k])) campaign[k] = [];
  return { v: 1, planner: p, posts, video, blog, campaign };
}
/** The part of the document an activity part sends as its answer. */
export function answerOf(tool, doc) {
  if (tool === "posts") {
    const pl = doc.planner || {};
    return { ...doc.posts, brand: (pl.client || {}).name || "" };
  }
  if (tool === "video") return { ...doc.video, brand: ((doc.planner || {}).client || {}).name || "" };
  if (tool === "blog" || tool === "campaign") return doc[tool];
  return doc.planner;
}

// ------------------------------------------------------------------ the checks list (task pane + trainer view)
export function checkList(checks, answer) {
  return el("ul", { class: "chk" }, ...(checks || []).map((c) => {
    const ok = C().studioCheck(c, answer);
    return el("li", { class: ok ? "ok" : "no" }, el("span", { class: "chk-i" }, ok ? icon("check") : ""), el("span", {}, c.label || c.k));
  }));
}

// ------------------------------------------------------------------ PLANNER
function plannerStrategy(p, onChange) {
  const ch = onChange;
  const temp = (k, title, hint) => el("div", { class: "temp t-" + k }, el("div", { class: "temp-h" }, title, el("span", { class: "small muted" }, hint)),
    field("Who they are", p.audience[k], "who", { area: true, rows: 2, onChange: ch }),
    field("Key message for them", p.audience[k], "msg", { area: true, rows: 2, onChange: ch }));
  return el("div", { class: "stool" },
    card("Client brief", "Read the brief or interview the owner. Write what you learn.",
      el("div", { class: "sgrid" },
        field("Business name", p.client, "name", { placeholder: "e.g. Kape't Alon Cafe", onChange: ch }),
        field("Location", p.client, "location", { placeholder: "e.g. San Juan, La Union", onChange: ch }),
        field("Products / services and prices", p.client, "products", { area: true, rows: 2, onChange: ch }),
        field("Current pages and followers", p.client, "pages", { area: true, rows: 2, placeholder: "e.g. Facebook page 1,200 followers; no Instagram yet", onChange: ch }))),
    card("Vision and purpose", "What the brand wants to become, and why this content exists.",
      field("Vision (long term)", p, "vision", { area: true, rows: 2, placeholder: "The favorite … of every … in …", onChange: ch }),
      field("Purpose of the content", p, "purpose", { area: true, rows: 2, onChange: ch })),
    card("SMART goals", "Specific, Measurable, Achievable, Relevant, Time-bound. Put a number and a deadline in each.",
      rowsEditor(p.goals, [{ key: "text", label: "Goal", placeholder: "Reach 15,000 people and get 60 orders in 2 weeks" }], { addLabel: "Add a goal", onChange: ch, min: 1, blank: () => ({ text: "" }) })),
    card("Audience and messaging", "Match the message to the audience temperature.",
      el("div", { class: "temps" }, temp("cold", "Cold", "never heard of the brand"), temp("warm", "Warm", "know it, have interacted"), temp("hot", "Hot", "ready to buy"))),
    card("Platforms", "Two or three platforms where this audience already spends time. Say why.",
      rowsEditor(p.platforms, [{ key: "name", label: "Platform", type: "select", options: PLATFORMS, w: "11rem" }, { key: "why", label: "Why this platform fits the audience" }],
        { addLabel: "Add a platform", onChange: ch, min: 1, blank: () => ({ name: "", why: "" }) })),
    card("Equipment and tools", "What you will use to produce, schedule and track the content.",
      rowsEditor(p.tools, [{ key: "type", label: "Type", type: "select", options: TOOL_TYPES, w: "11rem" }, { key: "name", label: "Equipment or tool", placeholder: "e.g. Canva, CapCut, Meta Business Suite" }],
        { addLabel: "Add equipment or a tool", onChange: ch, min: 1, blank: () => ({ type: "", name: "" }) })));
}

function mixBar(cal) {
  const rows = cal.filter((r) => r.mix);
  const n = rows.length || 1;
  const pct = (k) => Math.round((100 * rows.filter((r) => r.mix === k).length) / n);
  const segs = MIX.map(([k, t]) => ({ k, t, p: rows.length ? pct(k) : 0 }));
  return el("div", { class: "mix" },
    el("div", { class: "mix-bar" }, ...segs.map((s) => el("span", { class: "m-" + s.k, style: `width:${s.p}%`, title: `${s.t}: ${s.p}%` }))),
    el("div", { class: "mix-key small" }, ...segs.map((s) => el("span", {}, el("i", { class: "m-" + s.k }), `${s.t.split(" (")[0]} ${s.p}%`)),
      el("span", { class: "muted" }, "Target about 70 / 20 / 10")));
}
function calendarGrid(cal) {
  const dated = cal.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date || "")).sort((a, b) => a.date.localeCompare(b.date));
  if (!dated.length) return el("p", { class: "small muted" }, "Give your posts dates to see them on the two-week calendar.");
  const d0 = new Date(dated[0].date + "T00:00:00");
  const start = new Date(d0); start.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));         // Monday of the first week
  const days = [...Array(14)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const plat = (s) => "p-" + String(s || "").toLowerCase().replace(/[^a-z]/g, "");
  return el("div", { class: "calgrid" }, ...["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => el("div", { class: "cg-h" }, w)),
    ...days.map((d) => el("div", { class: "cg-d" }, el("span", { class: "cg-n" }, d.toLocaleDateString(undefined, { month: "short", day: "numeric" })),
      ...dated.filter((r) => r.date === key(d)).map((r) => el("div", { class: "cg-post " + plat(r.platform), title: `${r.platform} · ${r.type}\n${r.hook}\nCTA: ${r.cta}` },
        el("b", {}, r.platform || "?"), " ", r.hook || r.type || "")))));
}
function plannerCalendar(p, onChange) {
  const live = el("div", {});
  const redraw = () => live.replaceChildren(mixBar(p.calendar), calendarGrid(p.calendar));
  const ch = () => { onChange(); redraw(); kwList.replaceChildren(...p.keywords.filter((k) => k.kw).map((k) => el("option", { value: k.kw }))); };
  const kwList = el("datalist", { id: "kwlist" });
  const goals = (p.goals || []).map((g) => g.text).filter(Boolean);
  const plats = (p.platforms || []).map((x) => x.name).filter(Boolean);
  const tool = el("div", { class: "stool" }, kwList,
    goals.length || plats.length ? el("div", { class: "ctxline small" }, el("b", {}, "From your strategy: "),
      goals.length ? `Goals: ${goals.join(" · ")}. ` : "", plats.length ? `Platforms: ${plats.join(", ")}.` : "") : "",
    card("Keyword list", "Use Google search suggestions, Google Trends and platform search bars. Long-tail and local keywords work best for MSMEs.",
      rowsEditor(p.keywords, [{ key: "kw", label: "Keyword or hashtag", placeholder: "iced coffee near San Juan La Union" },
        { key: "type", label: "Type", type: "select", options: KW_TYPES, w: "8.5rem" }, { key: "purpose", label: "Purpose", type: "select", options: PURPOSES, w: "9.5rem" },
        { key: "where", label: "Where used", placeholder: "caption, blog title…", w: "10rem" }], { addLabel: "Add a keyword", onChange: ch })),
    card("Content calendar", "At least 8 posts over two weeks. Every post needs a platform, a hook, a keyword and a call to action.",
      rowsEditor(p.calendar, [{ key: "date", label: "Date", type: "date", w: "9.5rem" }, { key: "platform", label: "Platform", type: "select", options: PLATFORMS, w: "8.5rem" },
        { key: "type", label: "Type", type: "select", options: CONTENT_TYPES, w: "9rem" }, { key: "hook", label: "Topic / hook" },
        { key: "kw", label: "Keyword / hashtag", list: "kwlist", w: "10rem" }, { key: "cta", label: "Call to action", w: "10rem" },
        { key: "mix", label: "Mix", type: "select", options: MIX.map(([k, t]) => [k, t.split(" (")[0]]), w: "7.5rem" },
        { key: "status", label: "Status", type: "select", options: STATUS, w: "8rem" }], { addLabel: "Add a post", onChange: ch, blank: () => ({ status: "Draft" }) }),
      live));
  ch();
  return tool;
}

// ------------------------------------------------------------------ POSTS (composer)
const imgKey = (scope, i) => `${scope}|${i}`;

/** The live mock-up of one post on its platform. */
export function postPreview(it, brand, src) {
  const f = FORMATS[it.fmt] || FORMATS.feed;
  const plat = it.platform || "Facebook";
  const name = brand || "Your brand";
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const media = el("div", { class: "pv-media", style: `aspect-ratio:${f.w}/${f.h}` },
    src ? el("img", { src, alt: "" }) : el("div", { class: "pv-empty" }, el("span", {}, f.ratio), el("span", { class: "small" }, `${f.w} × ${f.h}`)));
  const text = String(it.caption || "");
  const fold = FOLD[plat] || 125;
  const cap = (pre) => el("div", { class: "pv-cap" }, pre ? el("b", {}, pre + " ") : "", text.length > fold ? [text.slice(0, fold), el("span", { class: "pv-more" }, "… See more")] : text || el("span", { class: "muted" }, "Your caption appears here."));
  if (it.fmt === "story" || plat === "TikTok") {
    return el("div", { class: "pv pv-story" }, media,
      el("div", { class: "pv-top" }, el("span", { class: "pv-av" }, initials), el("b", {}, name), el("span", {}, plat === "TikTok" ? "" : "· now")),
      el("div", { class: "pv-bottom" }, plat === "TikTok" ? el("div", { class: "pv-tcap" }, el("b", {}, "@" + name.toLowerCase().replace(/\W+/g, "")), " ", text.slice(0, 100) + (text.length > 100 ? "…" : "")) : "",
        it.cta ? el("span", { class: "pv-sticker" }, it.cta) : ""));
  }
  if (plat === "Instagram") {
    return el("div", { class: "pv pv-ig" }, el("div", { class: "pv-head" }, el("span", { class: "pv-av" }, initials), el("b", {}, name.toLowerCase().replace(/\s+/g, "")), el("span", { class: "pv-dots" }, "•••")),
      media, el("div", { class: "pv-acts" }, "♡  ◯  ➤"), cap(name.toLowerCase().replace(/\s+/g, "")),
      it.cta ? el("div", { class: "pv-ctabar" }, it.cta, el("span", {}, "›")) : "");
  }
  return el("div", { class: "pv pv-fb" }, el("div", { class: "pv-head" }, el("span", { class: "pv-av" }, initials),
    el("div", {}, el("b", {}, name), el("div", { class: "small muted" }, (plat === "LinkedIn" ? "Company page" : "Just now") + " · Public"))),
    cap(""), media, it.cta ? el("div", { class: "pv-ctabar" }, el("span", { class: "small muted" }, plat.toUpperCase()), el("span", { class: "pv-btn" }, it.cta)) : "",
    el("div", { class: "pv-react small muted" }, el("span", {}, "Like"), el("span", {}, "Comment"), el("span", {}, "Share")));
}

function postsTool(doc, onChange, opts) {
  const P = doc.posts, slots = opts.slots || ["feed", "promo", "story"], scope = opts.scope;
  const brand = () => (doc.planner.client || {}).name || "";
  const plats = (doc.planner.platforms || []).map((x) => x.name).filter(Boolean);
  slots.forEach((fmt, i) => { if (!P.items[i]) P.items[i] = { fmt, platform: plats[0] || "", caption: "", cta: "", framework: "AIDA", proof: {} }; P.items[i].fmt = fmt; });
  P.items.length = slots.length;
  const srcs = {};
  const one = (it, i) => {
    const f = FORMATS[it.fmt];
    const pvHost = el("div", { class: "pv-host" });
    const drawPv = () => pvHost.replaceChildren(postPreview(it, brand(), srcs[i] || (it.img && it.img.thumb)));
    const meta = el("div", { class: "imgmeta small" });
    const paintMeta = () => {
      const im = it.img;
      if (!im) return meta.replaceChildren(el("span", { class: "muted" }, `Needs ${f.w} × ${f.h} px (${f.ratio}).`));
      const ok = C().studioCheck({ k: "ratio", path: "", w: f.w, h: f.h, minW: f.w }, im);
      meta.replaceChildren(el("span", { class: "tag " + (ok ? "good" : "warn") }, ok ? "SIZE OK" : "CHECK SIZE"),
        el("span", {}, ` ${im.name || "image"} · ${im.w} × ${im.h} px`), ok ? "" : el("span", { class: "bad" }, ` Needs ${f.w} × ${f.h} (${f.ratio}). Resize it in Canva: Resize › Custom size.`));
    };
    const file = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true });
    const pick = el("button", { class: "btn small", type: "button" }, icon("download"), it.img ? "Replace the graphic" : "Upload the graphic");
    pick.addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      const fl = file.files[0];
      if (!fl) return;
      try {
        const { im, url } = await readImage(fl);
        it.img = { w: im.naturalWidth, h: im.naturalHeight, name: fl.name, size: fl.size, thumb: shrink(im, 120, 0.6) };
        srcs[i] = shrink(im, 720, 0.82);
        URL.revokeObjectURL(url);
        if (scope) idb.set(imgKey(scope, i), srcs[i]);
        pick.lastChild.textContent = "Replace the graphic";
        paintMeta(); drawPv(); onChange();
        if (!P.log.some((r) => r.file === fl.name)) { P.log.push({ file: fl.name, source: "", license: "", consent: "" }); drawLog(); onChange(); }
      } catch (e) { toast(e.message, "bad"); }
      file.value = "";
    });
    const capBox = el("textarea", { rows: 6, placeholder: FRAMEWORKS[it.framework || "AIDA"].join("\n") });
    capBox.value = it.caption || "";
    const stats = el("div", { class: "capstats small" });
    const paintStats = () => {
      const t = capBox.value, lim = LIMITS[it.platform] || 2200, tags = (t.match(/#[^\s#.,!?;:()]+/g) || []).length, fold = FOLD[it.platform] || 125;
      stats.replaceChildren(el("span", { class: t.length > lim ? "bad" : "" }, `${t.length} / ${lim} characters`),
        el("span", { class: tags >= 3 && tags <= 5 ? "okc" : "warnc" }, `${tags} hashtag${tags === 1 ? "" : "s"} (use 3–5)`),
        el("span", { class: "muted" }, `First ${fold} characters show before "See more"`));
    };
    capBox.addEventListener("input", () => { it.caption = capBox.value; paintStats(); drawPv(); onChange(); });
    const fw = select(Object.keys(FRAMEWORKS).map((k) => [k, k === "BAB" ? "Before-After-Bridge" : k]), it.framework || "AIDA", (v) => {
      it.framework = v; capBox.placeholder = (FRAMEWORKS[v] || []).join("\n"); onChange(); }, "Framework");
    const outline = el("button", { class: "btn small", type: "button", title: "Put the framework's steps in the caption box as a guide" }, "Insert outline");
    outline.addEventListener("click", () => {
      if (capBox.value.trim() && !confirm("Add the outline under your caption?")) return;
      capBox.value = (capBox.value.trim() ? capBox.value.trim() + "\n\n" : "") + (FRAMEWORKS[it.framework || "AIDA"] || []).map((s) => s.split(":")[0] + ": ").join("\n");
      capBox.dispatchEvent(new Event("input")); capBox.focus();
    });
    const plat = select(PLATFORMS.filter((x) => x !== "Blog / website"), it.platform || "", (v) => { it.platform = v; paintStats(); drawPv(); onChange(); }, "Platform");
    const ctaIn = el("input", { type: "text", value: it.cta || "", placeholder: "e.g. Message us to order" });
    ctaIn.addEventListener("input", () => { it.cta = ctaIn.value; drawPv(); onChange(); });
    it.proof = it.proof || {};
    const proof = el("div", { class: "proof" }, ...PROOF.map(([k, t, q]) => {
      const cb = el("input", { type: "checkbox", checked: !!it.proof[k] });
      cb.addEventListener("change", () => { it.proof[k] = cb.checked; onChange(); });
      return el("label", { class: "choice" }, cb, el("span", {}, el("b", {}, t), el("span", { class: "small muted" }, " " + q)));
    }));
    paintMeta(); paintStats(); drawPv();
    if (scope && !srcs[i]) idb.get(imgKey(scope, i)).then((s) => { if (s && it.img) { srcs[i] = s; drawPv(); } });
    return el("section", { class: "scard post" },
      el("div", { class: "scard-h" }, el("h3", {}, `Post ${i + 1} · ${f.label}`), el("span", { class: "tag" }, `${f.w} × ${f.h} · ${f.ratio}`)),
      el("div", { class: "post-grid" },
        el("div", { class: "post-form" },
          el("div", { class: "sf" }, el("span", { class: "sf-l" }, "Graphic"), el("div", { class: "btnrow" }, pick, file), meta),
          el("div", { class: "sgrid two" }, el("label", { class: "sf" }, el("span", { class: "sf-l" }, "Platform"), plat),
            el("label", { class: "sf" }, el("span", { class: "sf-l" }, "Copywriting framework"), el("div", { class: "btnrow" }, fw, outline))),
          el("label", { class: "sf" }, el("span", { class: "sf-l" }, "Caption"), capBox, stats),
          el("label", { class: "sf" }, el("span", { class: "sf-l" }, "Call to action (button / sticker)"), ctaIn),
          el("details", { class: "proofbox", open: true }, el("summary", {}, "Proofreading checklist"), proof)),
        el("div", { class: "post-pv" }, el("div", { class: "sf-l" }, "Live preview"), pvHost)));
  };
  const logHost = el("div", {});
  const drawLog = () => logHost.replaceChildren(rowsEditor(P.log, [{ key: "file", label: "File name", w: "11rem" },
    { key: "source", label: "Source", type: "select", options: SOURCES, w: "12rem" }, { key: "license", label: "License / permission", placeholder: "own work · Canva Pro license · Pexels license" },
    { key: "consent", label: "Consent (people)", type: "select", options: CONSENT, w: "12rem" }], { addLabel: "Add a media file", onChange }));
  drawLog();
  return el("div", { class: "stool" },
    brand() ? "" : el("p", { class: "ctxline small" }, "Tip: write the business name in the Content Planner (Client brief) so the previews show it."),
    ...P.items.map(one),
    card("Media log", "Every photo, video, icon or music you used: where it came from and its license. Proves the content is legal (RA 8293, RA 10372, RA 10173).", logHost));
}

// ------------------------------------------------------------------ mount
/** Draw a tool into host. doc is the day's studio document (mutated in place); onChange saves it. */
export function mountTool(host, tool, view, doc, onChange, opts = {}) {
  const t = ["video", "blog", "campaign"].includes(tool) ? mountProduce(tool, view, doc, onChange, opts) : tool === "posts" ? postsTool(doc, onChange, opts) : view === "calendar" ? plannerCalendar(doc.planner, onChange) : plannerStrategy(doc.planner, onChange);
  host.replaceChildren(t);
}
export const TOOL_NAMES = { planner: "Content Planner", posts: "Post Composer", video: "Storyboard", blog: "Blog Editor", campaign: "Campaign Scheduler" };

// ------------------------------------------------------------------ read-only views (trainer board) and text (export)
export function studioView(tool, a) {
  a = a || {};
  if (["video", "blog", "campaign"].includes(tool)) return produceView(tool, a);
  if (tool === "posts") {
    return el("div", { class: "sview" }, el("div", { class: "pv-row" }, ...(a.items || []).map((it, i) => el("div", { class: "pv-mini" },
      el("div", { class: "small" }, el("b", {}, `Post ${i + 1} · ${(FORMATS[it.fmt] || {}).label || ""}`), it.img ? ` · ${it.img.w}×${it.img.h}` : " · no graphic"),
      postPreview(it, a.brand, it.img && it.img.thumb),
      el("div", { class: "small muted" }, `Proofread: ${PROOF.filter(([k]) => (it.proof || {})[k]).length}/${PROOF.length} · ${it.framework || ""}`)))),
      table(["File", "Source", "License", "Consent"], (a.log || []).map((r) => [r.file, r.source, r.license, r.consent])));
  }
  const au = a.audience || {};
  return el("div", { class: "sview" },
    kv([["Client", [a.client?.name, a.client?.location].filter(Boolean).join(", ")], ["Products", a.client?.products], ["Vision", a.vision], ["Purpose", a.purpose]]),
    table(["SMART goal"], (a.goals || []).map((g) => [g.text])),
    table(["Audience", "Who", "Message"], ["cold", "warm", "hot"].map((k) => [k, (au[k] || {}).who, (au[k] || {}).msg])),
    table(["Platform", "Why"], (a.platforms || []).map((r) => [r.name, r.why])),
    table(["Type", "Equipment / tool"], (a.tools || []).map((r) => [r.type, r.name])),
    (a.keywords || []).length ? table(["Keyword", "Type", "Purpose", "Where"], a.keywords.map((r) => [r.kw, r.type, r.purpose, r.where])) : "",
    (a.calendar || []).length ? table(["Date", "Platform", "Type", "Hook", "Keyword", "CTA", "Mix", "Status"], a.calendar.map((r) => [r.date, r.platform, r.type, r.hook, r.kw, r.cta, r.mix, r.status])) : "");
}
export function studioText(tool, a) {
  a = a || {};
  if (["video", "blog", "campaign"].includes(tool)) return produceText(tool, a);
  const L = [];
  if (tool === "posts") {
    (a.items || []).forEach((it, i) => {
      L.push(`POST ${i + 1} · ${(FORMATS[it.fmt] || {}).label || it.fmt} · ${it.platform || "-"}`,
        `Graphic: ${it.img ? `${it.img.name} (${it.img.w} x ${it.img.h})` : "none"}`, `Framework: ${it.framework || "-"}`,
        `Caption:\n${it.caption || ""}`, `Call to action: ${it.cta || "-"}`,
        `Proofread: ${PROOF.filter(([k]) => (it.proof || {})[k]).map(([, t]) => t).join(", ") || "-"}`, "");
    });
    L.push("MEDIA LOG", ...(a.log || []).map((r) => `${r.file} | ${r.source} | ${r.license} | ${r.consent}`));
    return L.join("\n");
  }
  const au = a.audience || {};
  L.push(`Client: ${a.client?.name || ""} (${a.client?.location || ""})`, `Products: ${a.client?.products || ""}`, `Pages: ${a.client?.pages || ""}`,
    `Vision: ${a.vision || ""}`, `Purpose: ${a.purpose || ""}`, "SMART goals:", ...(a.goals || []).map((g) => ` - ${g.text}`),
    ...["cold", "warm", "hot"].map((k) => `${k.toUpperCase()}: ${(au[k] || {}).who || ""} | message: ${(au[k] || {}).msg || ""}`),
    "Platforms:", ...(a.platforms || []).map((r) => ` - ${r.name}: ${r.why}`), "Equipment and tools:", ...(a.tools || []).map((r) => ` - ${r.type}: ${r.name}`));
  if ((a.keywords || []).length) L.push("Keywords:", ...a.keywords.map((r) => ` - ${r.kw} | ${r.type} | ${r.purpose} | ${r.where}`));
  if ((a.calendar || []).length) L.push("Content calendar:", ...a.calendar.map((r) => ` - ${r.date} | ${r.platform} | ${r.type} | ${r.hook} | ${r.kw} | ${r.cta} | ${r.mix} | ${r.status}`));
  return L.join("\n");
}
