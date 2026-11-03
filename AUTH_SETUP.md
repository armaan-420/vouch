# Vouch participant authentication

This account system is separate from organizer Sign in with ChatGPT. The organizer allowlist and Sites authentication routes remain unchanged. Email verification is required before a participant identity is issued. The same verified email returns to the same opaque account ID; emails do not appear in profile or authentication response payloads.

## Preview versus hosted email

The explicitly enabled **local test inbox** returns a newly generated six-digit code in the start response only when the request URL is HTTP loopback (`localhost`, `127.0.0.1`, or `[::1]`). It sends no email and is labeled accordingly. It uses a preview-only HMAC secret; no production identity can be minted with that fallback. Keep previews bound to loopback, not a public tunnel. The preview is not proof of email delivery.

Hosted email sign-in requires the following runtime values. Missing configuration returns HTTP 503 while experiment answers remain saved:

- `VOUCH_AUTH_SECRET`: stable, random secret of at least 32 characters. Generate outside source control and configure as a runtime secret. Changing it invalidates pending codes; existing random-token sessions are hashed independently.
- `RESEND_API_KEY`: transactional email API key, server-only.
- `VOUCH_EMAIL_FROM`: sender address at a verified sending domain, for example `Vouch <signin@your-verified-domain>`.

Do not paste credentials into source, release notes, or browser code. Sender-domain verification, DNS setup, any provider charges, actual inbox delivery, and production access checks must be completed and verified before claiming hosted email sign-in works. Configuring a `from` string alone does not verify its domain.

## Controls implemented

- Six-digit codes expire after ten minutes, permit five attempts, and are single-use. Resending invalidates the prior code for that email/browser pair.
- Codes are stored as HMAC-SHA-256 digests, with random challenge IDs and a server-only secret. A challenge is bound to an opaque browser cookie. Emails are normalized and stored only as SHA-256 lookup hashes in the private auth record.
- Requests are limited to one code per email per minute, five per email per hour, and twenty per source address per hour. Source keys are HMAC hashes, not recorded addresses.
- Session cookies contain random 256-bit tokens. Storage retains only token hashes. Cookies are HttpOnly and SameSite=Lax, with Secure on HTTPS, a seven-day idle expiry, and a thirty-day absolute expiry.
- Successful verification replaces the current device session token. Switching to a different account (or replacing an expired/invalid account cookie) also clears anonymous visitor/session cookies; a first signup preserves its anonymous edit. Logout revokes the current token and clears auth and anonymous visitor/session cookies to isolate subsequent users of a shared browser.
- Mutations require a matching Origin and reject cross-site browser requests. Missing Origin is rejected. Server authorization must still protect account APIs independently.
- Provider failures return a generic error and invalidate the undelivered challenge. Logs and error payloads omit codes, credentials, and provider responses.

## Storage and remaining launch work

`account-auth-v1` is a new scoped record using the existing storage adapter. Existing experiment response records are not rewritten. This bounded pilot implementation uses the existing JSON record concurrency controls; it is not the indexed relational account schema discussed in the proposed architecture. Load testing and normalization are required before a broad launch. Provider delivery should additionally have monitoring and spending controls; distributed abuse protection and a specialist security review have not been performed.

## Research basis

The Sites identity skill supplies platform identity and Sign in with ChatGPT, without an email-code interface. Cloudflare Workers supports standard Web APIs and HTTPS email-provider requests. Better Auth provides an established alternative email-OTP implementation, but requires its database integration and configured delivery provider; this preview adds a dedicated participant adapter without replacing Sites organizer authentication.

- [Better Auth email OTP](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/email-otp.mdx)
- [Better Auth email provider setup](https://better-auth.com/docs/concepts/email)
- [Cloudflare native email domain onboarding](https://developers.cloudflare.com/email-service/get-started/send-emails/)
- [Resend email API](https://resend.com/docs/api-reference/emails/send-email)
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet/)

## Resend and DNS setup for the owner

1. Create an account at https://resend.com/signup and open **Domains → Add domain**. Add `auth.v4ch.app` (a sending subdomain keeps website routing separate).
2. Open the DNS dashboard for the company managing `v4ch.app`. Add the exact record types, names, priorities, and values Resend displays. Do not guess values, replace the website A/CNAME records, or change existing mailbox MX records. Resend may display names relative to the DNS zone; follow its provider-specific guidance.
3. Return to Resend and verify the domain. Wait until Resend reports it verified. Use `Vouch <signin@auth.v4ch.app>` as `VOUCH_EMAIL_FROM`; a separate receiving mailbox is not required for sending, though a monitored support address is useful.
4. In **API Keys**, create a sending key restricted to the verified domain where supported. Keep it private. Configure it through the secure hosting settings as `RESEND_API_KEY`; do not send it in chat.
5. Configure a new random server-only `VOUCH_AUTH_SECRET` of at least 32 characters and the sender value. Local real-delivery testing can use ignored development secret settings; disable the local test inbox for that test. Hosted changes require a separate production release after review.
6. Send a code to an inbox you control, check delivery in Resend and the inbox, verify the code, sign out, and sign back in to the same collection. Test expired/incorrect codes and delivery failures. The local test-inbox checks do not substitute for this step.

Resend guide: https://resend.com/docs/dashboard/domains/introduction . The DNS provider is Namecheap. On November 2, 2026, the approved TXT record `resend._domainkey.auth` and CNAME records `rsend.auth` / `send.auth` were added. Resend confirmed `auth.v4ch.app` verified with sending enabled and receiving disabled. Existing website and email-forwarding records were preserved. The sender `Vouch <signin@auth.v4ch.app>` and an authentication secret have been staged in Sites runtime settings (environment revision 2); they require deployment to take effect. The owner created the `Vouch signup emails` key with Sending access restricted to `auth.v4ch.app`; its value was transferred into the Sites `RESEND_API_KEY` secret without displaying it in chat or writing it to project files. Environment revision 3 contains the sender, authentication secret, and email-provider key. No production deployment or real-email delivery test has been performed. No credentials are recorded in this document.

## Current release verification

Release preparation on November 2 confirmed the prior live version 17 used environment revision 3 and `/api/auth/status` returned available=true and previewDelivery=false. The verified domain, restricted sending key, sender, and authentication secret are configured. This proves the production adapter is enabled, not successful inbox receipt or code verification. A real production delivery/sign-in test remains unverified unless recorded in the release evidence. The setup history above is preserved as history; current deployment evidence is in docs/releases and the canonical Notion changelog.

Production version 18 deployed successfully with environment revision 3. Post-release HTTPS checks confirm email auth available=true, previewDelivery=false, and the production account page has no local test inbox. No email code was sent during these checks; actual inbox receipt/sign-in remains unverified.

## November 3 code optimization

Session validity is checked from storage on each request. Repeated checks within one request share a result; activity timestamps are written at most once per minute (or one quarter of a shorter configured idle lifetime). Idle expiration can therefore occur up to one minute earlier than the last request; absolute lifetime and logout revocation remain enforced.
