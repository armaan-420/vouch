declare namespace Cloudflare {
  interface Env {
    CHANNEL3_API_KEY?: string;
    SHOPIFY_CATALOG_CLIENT_ID?: string;
    SHOPIFY_CATALOG_CLIENT_SECRET?: string;
    SHOPIFY_CATALOG_MCP_URL?: string;
    SHOPIFY_CATALOG_ID?: string;
    SHOPIFY_UCP_PROFILE_URL?: string;
    CATALOG_LIVE_PROVIDERS?: string;
    CATALOG_DAILY_LIVE_SEARCH_BUDGET?: string;
    CATALOG_LINK_PASTE?: string;
    CATALOG_WHERE_TO_BUY?: string;
    CATALOG_BARCODE?: string;
    CATALOG_PHOTO_SEARCH?: string;
    GO_UPC_API_KEY?: string;
    UPCITEMDB_USER_KEY?: string;
    DB?: D1Database;
    ADMIN_EMAILS?: string;
    VOUCH_AUTH_SECRET?: string;
    RESEND_API_KEY?: string;
    VOUCH_EMAIL_FROM?: string;
    BUCKET?: R2Bucket;
  }
}
