const KEY = "contacthub:contacts";
let contacts = [];
try { contacts = JSON.parse(localStorage.getItem(KEY)) || []; } catch { contacts = []; }

const $ = (id) => document.getElementById(id);
const contactModal = new bootstrap.Modal($("contactModal"));
const form = $("contactForm");
const FIELDS = ["cName", "cPhone", "cEmail", "cAddress", "cNotes"];
let photoData = "";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const cleanPhone = (v) => v.replace(/[\s-]/g, "");

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(contacts)); return true; }
  catch { Swal.fire({ icon: "error", title: "Storage is full", text: "Try a smaller photo." }); return false; }
}

/* ---------- SweetAlert2 ---------- */
function notify(title, text) {
  return Swal.fire({ icon: "success", title, text, timer: 2200, timerProgressBar: true, showConfirmButton: false });
}
function confirmDelete(c) {
  Swal.fire({
    icon: "warning",
    title: "Are you sure?",
    html: `Do you really want to delete <b>${esc(c.name)}</b>?<br>You won't be able to undo this.`,
    showCancelButton: true,
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#f41845",
    reverseButtons: true,
    focusCancel: true,
  }).then((r) => {
    if (!r.isConfirmed) return;
    contacts = contacts.filter((x) => x.id !== c.id);
    save();
    render();
    notify("Deleted!", "Contact deleted successfully.");
  });
}

/* ---------- Validation ---------- */
const rules = {
  cName(v) {
    if (!v) return "Full name is required.";
    if (v.length < 2) return "Name must be at least 2 characters.";
    if (v.length > 40) return "Name must be 40 characters or less.";
    if (!/^\p{L}[\p{L}\s'.-]*$/u.test(v)) return "Name can only contain letters and spaces.";
    if (v.split(/\s+/).some((w) => /\p{Ll}/u.test(w[0]))) return "Each word must start with a capital letter (e.g. Aya Ahmed).";
    return "";
  },
  cPhone(v) {
    if (!v) return "Phone number is required.";
    const p = cleanPhone(v);
    if (!/^\d+$/.test(p)) return "Phone number can only contain digits.";
    if (!/^01[0125]\d{8}$/.test(p)) return "Enter a valid 11-digit number starting with 010, 011, 012 or 015.";
    const editId = $("contactId").value;
    if (contacts.some((c) => c.phone === p && c.id !== editId)) return "This phone number is already saved.";
    return "";
  },
  cEmail(v) {
    if (!v) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email (name@example.com).";
    return "";
  },
  cAddress(v) { return v.length > 100 ? "Address must be 100 characters or less." : ""; },
  cNotes(v) { return v.length > 200 ? "Notes must be 200 characters or less." : ""; },
};

function validateField(id) {
  const input = $(id);
  const msg = rules[id](input.value.trim());
  input.classList.toggle("is-invalid", !!msg);
  $(id + "Err").textContent = msg;
  return !msg;
}

FIELDS.forEach((id) => {
  $(id).addEventListener("blur", () => validateField(id));
  $(id).addEventListener("input", () => { if ($(id).classList.contains("is-invalid")) validateField(id); });
});

/* ---------- Photo ---------- */
function setPreview() {
  $("photoPreview").innerHTML = photoData ? `<img src="${photoData}" alt="">` : `<i class="fa-solid fa-user"></i>`;
  $("photoRemove").hidden = !photoData;
}
$("photoBtn").addEventListener("click", () => $("photoInput").click());
$("photoRemove").addEventListener("click", () => { photoData = ""; $("photoInput").value = ""; setPreview(); });
$("photoInput").addEventListener("change", (e) => {
  const f = e.target.files[0];
  $("photoErr").textContent = "";
  if (!f) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { $("photoErr").textContent = "Please choose a PNG, JPG or WEBP image."; return; }
  if (f.size > 5 * 1024 * 1024) { $("photoErr").textContent = "Image must be smaller than 5 MB."; return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = 256, m = Math.min(img.width, img.height);
      const cv = document.createElement("canvas");
      cv.width = cv.height = s;
      cv.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      photoData = cv.toDataURL("image/jpeg", 0.8);
      setPreview();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
});

/* ---------- Render ---------- */
const avatarHTML = (c, size = "") =>
  c.photo ? `<img class="avatar ${size}" src="${esc(c.photo)}" alt="${esc(c.name)}">`
          : `<div class="avatar ${size}">${esc(initials(c.name))}</div>`;

function cardHTML(c) {
  return `
  <div class="col-12 col-md-6">
    <div class="contact-card">
      <div class="cc-body">
        <div class="cc-head">
          <div class="avatar-wrap">
            ${avatarHTML(c)}
            ${c.emg ? '<span class="badge-emg"><i class="fa-solid fa-heart-pulse"></i></span>' : ""}
            ${c.fav ? '<span class="badge-fav"><i class="fa-solid fa-star"></i></span>' : ""}
          </div>
          <h4>${esc(c.name)}</h4>
        </div>
        <div class="cc-row"><div class="cc-ico blue"><i class="fa-solid fa-phone"></i></div><span>${esc(c.phone)}</span></div>
        ${c.email ? `<div class="cc-row"><div class="cc-ico purple"><i class="fa-solid fa-envelope"></i></div><span>${esc(c.email)}</span></div>` : ""}
        ${c.address ? `<div class="cc-row"><div class="cc-ico green"><i class="fa-solid fa-location-dot"></i></div><span>${esc(c.address)}</span></div>` : ""}
        ${c.notes ? `<div class="cc-row notes"><div class="cc-ico amber"><i class="fa-solid fa-note-sticky"></i></div><span>${esc(c.notes)}</span></div>` : ""}
        ${(c.group || c.emg || c.fav) ? `<div class="cc-tags">
          ${c.group ? `<span class="tag group">${esc(c.group)}</span>` : ""}
          ${c.emg ? '<span class="tag emg"><i class="fa-solid fa-heart-pulse me-1"></i>Emergency</span>' : ""}
          ${c.fav ? '<span class="tag fav"><i class="fa-solid fa-star me-1"></i>Favorite</span>' : ""}
        </div>` : ""}
      </div>
      <div class="cc-actions">
        <a class="act-btn call" href="tel:${esc(c.phone)}" title="Call"><i class="fa-solid fa-phone"></i></a>
        ${c.email ? `<a class="act-btn mail" href="mailto:${esc(c.email)}" title="Email"><i class="fa-solid fa-envelope"></i></a>` : ""}
        <button class="act-btn fav spacer ${c.fav ? "on" : ""}" data-act="fav" data-id="${c.id}" title="Favorite"><i class="${c.fav ? "fa-solid" : "fa-regular"} fa-star"></i></button>
        <button class="act-btn emg ${c.emg ? "on" : ""}" data-act="emg" data-id="${c.id}" title="Emergency"><i class="${c.emg ? "fa-solid fa-heart-pulse" : "fa-regular fa-heart"}"></i></button>
        <button class="act-btn" data-act="edit" data-id="${c.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="act-btn del" data-act="del" data-id="${c.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  </div>`;
}

const sideHTML = (list, msg, cls) => list.length
  ? list.map((c) => `<a class="side-item" href="tel:${esc(c.phone)}">${avatarHTML(c, "sm")}<div class="info"><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></div><span class="side-call ${cls}"><i class="fa-solid fa-phone"></i></span></a>`).join("")
  : `<p class="side-empty">${msg}</p>`;

const norm = (s) => String(s || "").toLowerCase();
function matches(c, q) {
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  if (digits && digits.length === q.replace(/[\s+-]/g, "").length && c.phone.includes(digits)) return true;
  return [c.name, c.phone, c.email, c.address, c.group].some((v) => norm(v).includes(q));
}

function render() {
  const raw = $("search").value;
  const q = raw.trim().replace(/\s+/g, " ").toLowerCase();
  document.querySelector(".search-box").classList.toggle("has-text", !!raw);

  const filtered = contacts.filter((c) => matches(c, q));
  $("contactsGrid").innerHTML = filtered.map(cardHTML).join("");

  $("emptyState").style.display = filtered.length ? "none" : "block";
  if (!filtered.length) {
    if (contacts.length) {
      $("emptyTitle").textContent = "No matching contacts";
      $("emptyText").textContent = `Nothing matches "${raw.trim()}". Try a name, phone or email.`;
    } else {
      $("emptyTitle").textContent = "No contacts found";
      $("emptyText").textContent = 'Click "Add Contact" to get started';
    }
  }

  const favs = contacts.filter((c) => c.fav);
  const emgs = contacts.filter((c) => c.emg);
  $("statTotal").textContent = contacts.length;
  $("statFav").textContent = favs.length;
  $("statEmg").textContent = emgs.length;
  $("countText").textContent = contacts.length;
  $("favList").innerHTML = sideHTML(favs, "No favorites yet", "orange");
  $("emgList").innerHTML = sideHTML(emgs, "No emergency contacts", "red");
}

/* ---------- Search ---------- */
$("search").addEventListener("input", render);
$("clearSearch").addEventListener("click", () => { $("search").value = ""; render(); $("search").focus(); });

/* ---------- Open add / edit ---------- */
function resetForm() {
  form.reset();
  $("contactId").value = "";
  photoData = "";
  $("photoErr").textContent = "";
  FIELDS.forEach((id) => { $(id).classList.remove("is-invalid"); $(id + "Err").textContent = ""; });
  setPreview();
}
$("openAdd").addEventListener("click", () => {
  resetForm();
  $("modalTitle").textContent = "Add New Contact";
});
$("contactModal").addEventListener("shown.bs.modal", () => $("cName").focus());

/* ---------- Card actions ---------- */
$("contactsGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const c = contacts.find((x) => x.id === btn.dataset.id);
  if (!c) return;
  const act = btn.dataset.act;

  if (act === "fav") c.fav = !c.fav;
  else if (act === "emg") c.emg = !c.emg;
  else if (act === "del") {
    confirmDelete(c);
    return;
  } else if (act === "edit") {
    resetForm();
    $("contactId").value = c.id;
    $("cName").value = c.name;
    $("cPhone").value = c.phone;
    $("cEmail").value = c.email || "";
    $("cAddress").value = c.address || "";
    $("cGroup").value = c.group || "";
    $("cNotes").value = c.notes || "";
    $("cFav").checked = !!c.fav;
    $("cEmg").checked = !!c.emg;
    photoData = c.photo || "";
    setPreview();
    $("modalTitle").textContent = "Edit Contact";
    contactModal.show();
    return;
  }
  save();
  render();
});

/* ---------- Save form ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const results = FIELDS.map(validateField);
  if (results.includes(false)) {
    form.querySelector(".is-invalid")?.focus();
    return;
  }

  const id = $("contactId").value;
  const data = {
    name: $("cName").value.trim().replace(/\s+/g, " "),
    phone: cleanPhone($("cPhone").value.trim()),
    email: $("cEmail").value.trim(),
    address: $("cAddress").value.trim(),
    group: $("cGroup").value,
    notes: $("cNotes").value.trim(),
    fav: $("cFav").checked,
    emg: $("cEmg").checked,
    photo: photoData,
  };

  const backup = JSON.stringify(contacts);
  if (id) Object.assign(contacts.find((c) => c.id === id), data);
  else contacts.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...data });

  if (!save()) { contacts = JSON.parse(backup); return; }
  render();
  contactModal.hide();
  notify(id ? "Updated!" : "Added!", id ? "Contact updated successfully." : "Contact added successfully.");
});

render();
