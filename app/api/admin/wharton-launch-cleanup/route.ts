import {env} from 'cloudflare:workers';
import {planLaunchCleanup} from '../../../../lib/wharton-launch-cleanup.mjs';

export const dynamic = 'force-dynamic';
const markerKey = 'wharton-launch-cleanup-2026-11-18';
const tokenDigest = '610b93130f3918048133bdba452511cdc41ca0869058eb1f78d5992cbbd6b244';
const expires = Date.parse('2026-11-19T01:45:00Z');
const scope = "(key IN ('accounts-v1', 'account-auth-v1', 'experiment', 'product-tag-votes', 'pilot-events') OR key GLOB 'experiment:*')";
const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: {'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex'},
});

async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function handle(request: Request) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (Date.now() >= expires || !token || await hash(token) !== tokenDigest) return json({error: 'Not found.'}, 404);
  const db = env.DB;
  if (!db) return json({error: 'Database unavailable.'}, 503);

  const marker = await db.prepare('SELECT json, version FROM app_records WHERE key = ?')
    .bind(markerKey).first<{json: string; version: number}>();
  const verify = request.method === 'GET' && new URL(request.url).searchParams.has('verify');
  if (marker && !verify) {
    const saved = JSON.parse(marker.json);
    if (request.method === 'POST' && saved.photos.length) {
      if (!env.BUCKET) return json({applied: true, photosPending: saved.photos.length}, 503);
      try {
        await env.BUCKET.delete(saved.photos);
        await db.prepare('UPDATE app_records SET json = ?, version = version + 1 WHERE key = ? AND version = ?')
          .bind(JSON.stringify({...saved, photos: []}), markerKey, marker.version).run();
      } catch {
        return json({applied: true, photosPending: saved.photos.length}, 503);
      }
      saved.photos = [];
    }
    return json({applied: true, summary: saved.summary, photosPending: saved.photos.length});
  }

  const {results} = await db.prepare(`SELECT key, json, version FROM app_records WHERE ${scope} ORDER BY key`)
    .all<{key: string; json: string; version: number}>();
  const versions = JSON.stringify(Object.fromEntries(results.map(row => [row.key, row.version])));
  const revision = await hash(versions);
  const documents = new Map(results.map(row => [row.key, JSON.parse(row.json)]));
  const {changes, photos, summary} = await planLaunchCleanup(documents, hash);
  if (marker) {
    const saved = JSON.parse(marker.json);
    return json({applied: true, summary: saved.summary, photosPending: saved.photos.length, current: summary});
  }
  if (request.method === 'GET') return json({applied: false, revision, summary});
  if (request.headers.get('If-Match') !== '"' + revision + '"') {
    return json({error: 'The preview changed. Run it again before applying.'}, 412);
  }
  if (photos.some(photo => !/^[a-f0-9-]{36}\.png$/.test(photo)) || photos.length && !env.BUCKET) {
    return json({error: 'The profile photo cleanup could not be prepared.'}, 409);
  }

  const changed = results.filter(row => row.json !== JSON.stringify(changes.get(row.key)));
  try {
    await db.batch([
      // Raise an SQL error to roll back the complete batch if any scoped row changed.
      db.prepare(`SELECT CASE WHEN count(*) = ? AND count(*) = sum(
        CASE WHEN version = (SELECT value FROM json_each(?) AS expected WHERE expected.key = app_records.key)
        THEN 1 ELSE 0 END) THEN 1 ELSE json('stale cleanup snapshot') END AS checked
        FROM app_records WHERE ${scope}`).bind(results.length, versions),
      db.prepare('INSERT INTO app_records (key, json, version) VALUES (?, ?, 1)')
        .bind(markerKey, JSON.stringify({summary, photos})),
      ...changed.map(row => db.prepare('UPDATE app_records SET json = ?, version = version + 1 WHERE key = ?')
        .bind(JSON.stringify(changes.get(row.key)), row.key)),
    ]);
  } catch {
    return json({error: 'The cleanup transaction did not commit. Check the preview before retrying.'}, 409);
  }
  return json({applied: true, summary, photosPending: photos.length});
}

async function run(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    console.error('Wharton cleanup request failed:', error instanceof Error ? error.name : 'unknown');
    return json({error: 'The cleanup could not verify the production records.'}, 503);
  }
}
export const GET = run;
export const POST = run;
