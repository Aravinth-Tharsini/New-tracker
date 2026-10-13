async function getSignature() {
  const r = await fetch("/index.html?t=" + Date.now(), { cache: "no-store" });
  const etag = r.headers.get("etag");
  if (etag) return etag;
  const text = await r.text();
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return "h" + h + "_" + text.length;
}

function showUpdateBanner(sig) {
  if (document.getElementById("upd-banner")) return;
  const b = document.createElement("div");
  b.id = "upd-banner";
  b.style.cssText = "position:fixed;left:12px;right:12px;bottom:16px;z-index:99999;background:#111;color:#fff;padding:12px 16px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4)";
  b.innerHTML = '<span>New update available</span><button id="upd-btn" style="background:#4f46e5;color:#fff;border:0;padding:8px 16px;border-radius:8px;font-size:15px">Update</button>';
  document.body.appendChild(b);
  document.getElementById("upd-btn").onclick = async () => {
    try { localStorage.setItem("app_sig", sig); } catch (e) {}
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    } catch (e) {}
    location.reload();
  };
}

async function checkUpdate() {
  try {
    const sig = await getSignature();
    const saved = localStorage.getItem("app_sig");
    if (!saved) { localStorage.setItem("app_sig", sig); return; }
    if (saved !== sig) showUpdateBanner(sig);
  } catch (e) {}
}

checkUpdate();
setInterval(checkUpdate, 5 * 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkUpdate();
});
