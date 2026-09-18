declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CENSUS_API_KEY?: string;
    IMPORTYETI_API_KEY?: string;
  }
}
