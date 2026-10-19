// Contact form endpoint — the direct-send backend for every "reach out"
// form on the site (contact page, newsletter banner, business "get notified").
//
// Deployed as part of the Worker via the @astrojs/cloudflare adapter
// (NOT the Pages `functions/` directory — that is ignored in this setup).
//
// One-time Cloudflare dashboard setup (all free — see ARCHITECTURE.md §8.1):
//   1. Email Routing: add alternating.ai, forwarding rule
//      contact@alternating.ai -> owner's Gmail inbox
//   2. Email Sending: onboard/verify the domain so it can be the `from`
//   3. Optional: Turnstile — site key in src/pages/contact.astro, secret
//      set as the TURNSTILE_SECRET var on this Worker

import { sendEmail } from "cloudflare:email";

// Server-only: this route must run on the Cloudflare Worker runtime, where
// `cloudflare:email` exists. Do not prerender it at static build time.
export const prerender = false;

const RECIPIENT = "contact@alternating.ai";
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 2000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}

export async function POST({ request, locals, env }) {
  // Bindings may surface as `locals.env` or `env` depending on adapter version.
  const envObj = (locals && locals.env) || env || {};

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }

  // Honeypot: a hidden field humans never see or fill. If it has a value,
  // it's a bot — pretend success and send nothing.
  if (typeof data.company === "string" && data.company !== "") {
    return json({ ok: true });
  }

  const name = String(data.name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const message = String(data.message ?? "").trim();
  const topic = String(data.topic ?? "").trim().slice(0, 60);
  const token = String(data.token ?? "");

  if (!name || name.length > MAX_NAME) {
    return json({ ok: false, error: "Please enter your name (max 100 characters)." }, 400);
  }
  if (email.length > MAX_EMAIL || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }
  if (!message || message.length > MAX_MESSAGE) {
    return json({ ok: false, error: "Please enter a message (max 2000 characters)." }, 400);
  }

  // Turnstile: only enforced once TURNSTILE_SECRET is configured.
  const turnstileSecret = envObj.TURNSTILE_SECRET;
  if (turnstileSecret) {
    if (!token) {
      return json({ ok: false, error: "Security check not complete. Please try again." }, 403);
    }
    let result;
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(token)}`,
      });
      result = await res.json();
    } catch {
      return json({ ok: false, error: "Security check unavailable. Please try again in a moment." }, 503);
    }
    if (!result.success) {
      return json({ ok: false, error: "Security check failed. Please try again." }, 403);
    }
  }

  const headers = {};
  if (email) headers["Reply-To"] = email;

  try {
    await sendEmail({
      from: RECIPIENT,
      to: [RECIPIENT],
      subject: `Alternating.ai — ${topic || 'New message'}`,
      text: `${message}\n\n—\n${name}${email ? " <" + email + ">" : ""}`,
      headers,
    });
  } catch {
    return json(
      { ok: false, error: "Something went wrong sending your message. Please try again later." },
      502
    );
  }

  return json({ ok: true });
}