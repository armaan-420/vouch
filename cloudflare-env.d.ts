declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_EMAILS?: string;
    VOUCH_AUTH_SECRET?: string;
    RESEND_API_KEY?: string;
    VOUCH_EMAIL_FROM?: string;
    BUCKET?: R2Bucket;
  }
}
