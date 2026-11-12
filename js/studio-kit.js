// Shared widgets of the D1 Studio tools: labelled fields, selects, row editors, cards, media storage (IndexedDB),
// image / video reading, and small read-only tables.
import { el, icon, toast } from "./ui.js";

// ------------------------------------------------------------------ small editors
export function field(label, obj, key, { area = false, rows = 3, placeholder = "", hint = "", onChange, max = null } = {}) {
  const inp = el(area ? "textarea" : "input", area ? { rows, placeholder } : { type: "text", placeholder });
  inp.value = obj[key] || "";
  const cnt = max ? el("span", { class: "cnt" }) : "";
  const paint = () => { if (cnt) { cnt.textContent = `${inp.value.length}/${max}`; cnt.classList.toggle("over", inp.value.length > max); } };
  inp.addEventListener("input", () => { obj[key] = inp.value; paint(); onChange && onChange(); });
  paint();
  return el("label", { class: "sf" }, el("span", { class: "sf-l" }, label, cnt), inp, hint ? el("span", { class: "sf-h" }, hint) : "");
}
export function select(options, value, onPick, placeholder = "Choose…") {
  const s = el("select", {}, el("option", { value: "" }, placeholder),
    ...options.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return el("option", { value: v, selected: v === value }, t); }));
  s.addEventListener("change", () => onPick(s.value));
  return s;
}
/** A list of rows: a table on wide screens, stacked cards on a phone (CSS). cols: {key,label,type,options,placeholder,list,w} */
export function rowsEditor(rows, cols, { addLabel = "Add a row", onChange, min = 0, numbered = true, blank } = {}) {
  const host = el("div", { class: "rows" });
  const body = el("div", { class: "rows-body" });
  const draw = () => {
    body.replaceChildren(...rows.map((r, i) => {
      const cells = cols.map((c) => {
        let inp;
        if (c.type === "select") inp = select(c.options, r[c.key] || "", (v) => { r[c.key] = v; onChange(); });
        else {
          inp = el("input", { type: c.type === "date" ? "date" : "text", placeholder: c.placeholder || "", list: c.list || null });
          inp.value = r[c.key] || "";
          inp.addEventListener("input", () => { r[c.key] = inp.value; onChange(); });
        }
        return el("label", { class: "rc", style: c.w ? `--w:${c.w}` : null }, el("span", { class: "rc-l" }, c.label), inp);
      });
      const del = el("button", { class: "btn icon small rdel", type: "button", title: "Remove this row", "aria-label": "Remove this row" }, icon("close"));
      del.addEventListener("click", () => { if (rows.length <= min) return toast(`Keep at least ${min} row${min > 1 ? "s" : ""}.`); rows.splice(i, 1); draw(); onChange(); });
      return el("div", { class: "rrow" }, numbered ? el("span", { class: "rnum mono" }, String(i + 1)) : "", ...cells, del);
    }));
  };
  const head = el("div", { class: "rows-head" }, numbered ? el("span", { class: "rnum" }, "#") : "",
    ...cols.map((c) => el("span", { class: "rc", style: c.w ? `--w:${c.w}` : null }, c.label)), el("span", { class: "rdel" }));
  const add = el("button", { class: "btn small", type: "button" }, "+ " + addLabel);
  add.addEventListener("click", () => { rows.push(blank ? blank() : {}); draw(); onChange(); body.lastChild?.querySelector("input,select")?.focus(); });
  draw();
  host.append(head, body, add);
  return host;
}
export const card = (title, sub, ...kids) => el("section", { class: "scard" }, el("div", { class: "scard-h" }, el("h3", {}, title), sub ? el("p", { class: "small muted" }, sub) : ""), ...kids);

export const idb = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open("d1lab_media", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("img");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = (mode, fn) => open().then((db) => new Promise((res, rej) => {
    const t = db.transaction("img", mode), q = fn(t.objectStore("img"));
    t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
  }));
  return { get: (k) => tx("readonly", (s) => s.get(k)).catch(() => null), set: (k, v) => tx("readwrite", (s) => s.put(v, k)).catch(() => null) };
})();
export function readImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => res({ im, url });
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("This file is not an image the browser can read (use JPG or PNG).")); };
    im.src = url;
  });
}
export function shrink(im, maxW, q) {
  const s = Math.min(1, maxW / im.naturalWidth), c = document.createElement("canvas");
  c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
  c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", q);
}
export const kv = (pairs) => el("dl", { class: "kv small" }, ...pairs.filter(([, v]) => v).flatMap(([k, v]) => [el("dt", {}, k), el("dd", {}, v)]));
export const table = (head, rows) => rows.some((r) => r.some(Boolean)) ? el("table", { class: "stable small" }, el("thead", {}, el("tr", {}, ...head.map((h) => el("th", {}, h)))),
  el("tbody", {}, ...rows.map((r) => el("tr", {}, ...r.map((c) => el("td", {}, c || "")))))) : "";

/** Video file -> {w, h, dur, name, size, thumb, still} (thumb ~120 px, still ~540 px JPEG of the frame at 1 s). */
export function readVideo(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), v = document.createElement("video");
    v.preload = "auto"; v.muted = true; v.playsInline = true;
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = () => {
      const grab = (maxW, q) => { const s = Math.min(1, maxW / v.videoWidth), c = document.createElement("canvas");
        c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s); c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", q); };
      const out = { w: v.videoWidth, h: v.videoHeight, dur: Math.round(v.duration * 10) / 10, name: file.name, size: file.size, thumb: grab(120, 0.6), still: grab(540, 0.8) };
      URL.revokeObjectURL(url); res(out);
    };
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error("This video cannot be read by the browser (export it as MP4, H.264).")); };
    v.src = url;
  });
}
