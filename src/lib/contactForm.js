// Shared submit helper for every "reach out" form on the site:
// the /contact page, the Newsletter banner (home + blog) and the
// business "get notified" form.
//
// Delivery priority:
//   1. EXTERNAL_CONTACT_ENDPOINT — your standalone dual-purpose Cloudflare
//      Worker (sends directly to the owner's inbox) when a URL is set.
//   2. Otherwise the site's own /api/contact route (send_email binding).
//   3. Otherwise a prefilled mailto: URL (the visitor's mail client).
//      The form always has a working path.
//
// Paste your Worker's URL here once it is deployed:
const EXTERNAL_CONTACT_ENDPOINT = ''; // e.g. 'https://contact-gateway.psbd125.workers.dev'

const FALLBACK_RECIPIENT = ['psbd225', 'gmail.com'].join('@');

function mailtoUrl(subject, message, name, email) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(
    message + '\n\n—\n' + (name || email || 'Website visitor')
  );
  return 'mailto:' + FALLBACK_RECIPIENT + '?subject=' + s + '&body=' + b;
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/**
 * Send a message via the configured contact endpoint.
 *
 * @param {object} p
 * @param {string} p.name      Sender name
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
  const payload = { name, email, message, topic, company, token };
  const endpoint = EXTERNAL_CONTACT_ENDPOINT || '/api/contact';

  try {
    const { status, data } = await postJson(endpoint, payload);
    // /api/contact answers {ok:true}; the external Worker answers {success:true}.
    if (status >= 200 && status < 300 && (data.ok || data.success)) {
      return { ok: true };
    }
    // Endpoint missing or server-side failure -> mailto fallback.
    if (status === 404 || status >= 500) {
      return { ok: false, fallbackUrl: mailtoUrl(topic, message, name, email) };
    }
    return { ok: false, error: data.error || 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, fallbackUrl: mailtoUrl(topic, message, name, email) };
  }
}