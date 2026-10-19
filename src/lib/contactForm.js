// Shared submit helper for every "reach out" form on the site:
// the /contact page, the Newsletter banner (home + blog) and the
// business "get notified" form.
//
// All of them POST to the Cloudflare Pages Function at /api/contact,
// which emails the owner via Cloudflare Email Service. When the endpoint
// is unavailable (local dev, or not yet deployed), we return a prefilled
// mailto: URL so the caller can fall back to the visitor's mail client
// — the form always has a working path.

const FALLBACK_RECIPIENT = ['psbd225', 'gmail.com'].join('@');

function mailtoUrl(subject, message, name, email) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(
    message + '\n\n—\n' + (name || email || 'Website visitor')
  );
  return 'mailto:' + FALLBACK_RECIPIENT + '?subject=' + s + '&body=' + b;
}

/**
 * Send a message via /api/contact.
 *
 * @param {object} p
 * @param {string} p.name      Sender name (required by the endpoint)
 * @param {string} p.email     Sender email (used for Reply-To)
 * @param {string} p.message   Message body
 * @param {string} p.topic     Short label used for the email subject
 * @param {string} p.company   Honeypot value (empty for real users)
 * @param {string} p.token     Turnstile token (when enabled)
 * @returns {Promise<{ok:true}|{ok:false, error?:string, fallbackUrl?:string}>}
 */
export async function sendMessage({
  name = '',
  email = '',
  message = '',
  topic = 'New message',
  company = '',
  token = '',
} = {}) {
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message, topic, company, token }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true };
    // Endpoint missing or broken (local dev, not deployed yet) -> mailto.
    if (res.status === 404 || res.status >= 500) {
      return { ok: false, fallbackUrl: mailtoUrl(topic, message, name, email) };
    }
    return { ok: false, error: data.error || 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, fallbackUrl: mailtoUrl(topic, message, name, email) };
  }
}