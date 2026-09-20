import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSite, pages } from './discoverability.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const dist = path.join(root, 'apps/frontend/dist');
const read = file => fs.readFileSync(path.join(dist, file), 'utf8');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
assert(fs.existsSync(path.join(dist, 'index.html')), 'Run npm run build first');
const project = JSON.parse(read('project.json'));
const origin = project.website;
const site = createSite();
const routes = site.routes;
const titles = new Set();
const descriptions = new Set();
let linksChecked = 0;
const headings = html => [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
const known = new Map(routes.map(route => [route, route === '/' ? 'index.html' : `${route.slice(1)}index.html`]));
function checkLink(href, parentRoute) {
  href = href.replace(/&amp;/g, '&');
  if (/^(mailto:|data:)/.test(href)) return;
  const resolved = new URL(href, `https://local.invalid${parentRoute}`);
  if (resolved.origin !== 'https://local.invalid' && resolved.origin !== origin) return;
  const pathname = decodeURIComponent(resolved.pathname);
  const file = known.get(pathname) || pathname.slice(1);
  assert(file && fs.existsSync(path.join(dist, file)), `Broken link: ${parentRoute} -> ${href}`);
  if (resolved.hash && file.endsWith('.html')) assert(headings(read(file)).includes(resolved.hash.slice(1)), `Missing fragment: ${href}`);
  linksChecked++;
}
for (const [route, file] of known) {
  const html = read(file);
  assert(!html.includes('sanket:head'), 'Unexpanded template');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${route}: one visible H1`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/name="description" content="([^"]+)"/)?.[1];
  assert(title && description && !titles.has(title) && !descriptions.has(description), `Missing/duplicate metadata: ${route}`);
  titles.add(title); descriptions.add(description);
  assert(html.includes('application/ld+json') && html.includes('twitter:card') && html.includes('og:image'), `Missing metadata: ${route}`);
  assert(html.includes('rel="alternate"') && html.includes('rel="describedby"'), `Missing agent links: ${route}`);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert(graph.find(entity => entity['@type'] === 'SoftwareSourceCode')?.codeRepository === project.repository);
  assert(graph.find(entity => entity['@type'] === 'SoftwareApplication')?.name === project.name);
  assert(!graph.some(entity => entity['@type'] === 'FAQPage'), 'No FAQ rich-result claim');
  assert(!graph.some(entity => entity.license || entity.author || entity.aggregateRating), 'Unverified identity/ratings');
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  if (origin) {
    assert.equal(canonical, origin + route);
    assert(!html.includes('noindex'), `Production noindex: ${route}`);
    assert(html.includes(`property="og:url" content="${origin}${route}"`));
  } else {
    assert(!canonical && html.includes('noindex, follow'), 'Unpublished preview must not invent canonical URLs');
  }
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) checkLink(match[1], route);
  if (route !== '/') assert(!html.includes('type="module"'), 'Docs must be independent of the app bundle');
}
const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.deepEqual(sitemap, origin ? routes.map(route => origin + route) : []);
assert(read('robots.txt').includes('Allow: /') && !read('robots.txt').includes('Disallow: /'));
assert.equal(read('robots.txt').includes('Sitemap:'), Boolean(origin));
for (const match of read('llms.txt').matchAll(/\]\(([^)]+)\)/g)) checkLink(match[1], '/llms.txt');
assert(read('llms-full.txt').length > read('llms.txt').length * 3);
for (const file of walk(dist)) {
  const relative = path.relative(dist, file);
  assert(!/(^|\/)(\.env|node_modules|MP_Data|Raw_Videos|scratch)|\.(tar|gz|zip|mp4|MOV|npy|pem|key)$/i.test(relative), `Unsafe published asset: ${relative}`);
}
assert.deepEqual(JSON.parse(read('demo/manifest.json')), [], 'Unreviewed demo media must not be published');
const model = JSON.parse(read('models/model.json'));
const labels = JSON.parse(read('models/labels.json'));
assert.equal(Object.keys(labels).length, 263);
assert(!Object.values(labels).includes('idle'));
assert.deepEqual(labels, JSON.parse(fs.readFileSync(path.join(root, 'models/labels.json'), 'utf8')));
let parameters = 0;
for (const group of model.weightsManifest) {
  for (const shard of group.paths) assert(fs.statSync(path.join(dist, 'models', shard)).size > 0);
  for (const weight of group.weights) parameters += weight.shape.reduce((a, b) => a * b, 1);
}
assert.equal(parameters, 245831, 'Update model docs when topology changes');
const png = fs.readFileSync(path.join(dist, 'social-preview.png'));
assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
assert(read('index.html').includes('Indian Sign Language') && read('index.html').includes('computer vision') && read('index.html').includes('deep learning'));
assert(read('docs/faq/index.html').includes('Does Sanket work offline?'));
// Test the production generation path without publishing a made-up origin.
const previous = { SITE_URL: process.env.SITE_URL, SANKET_PREVIEW: process.env.SANKET_PREVIEW, SANKET_PRODUCTION: process.env.SANKET_PRODUCTION };
try {
  process.env.SITE_URL = 'https://sanket-validation.invalid'; delete process.env.SANKET_PREVIEW;
  const fixture = createSite();
  assert(fixture.homeHead.includes('rel="canonical" href="https://sanket-validation.invalid/"'));
  assert(!fixture.homeHead.includes('noindex'));
  assert.equal([...fixture.assets.get('sitemap.xml').matchAll(/<loc>/g)].length, routes.length);
  assert(fixture.assets.get('robots.txt').includes('Sitemap: https://sanket-validation.invalid/sitemap.xml'));
  for (const [slug] of pages) assert(fixture.assets.get(`docs/${slug}/index.html`).includes(`rel="canonical" href="https://sanket-validation.invalid/docs/${slug}/"`));
  process.env.SANKET_PREVIEW = '1'; assert.equal(createSite().origin, null);
  delete process.env.SANKET_PREVIEW; process.env.SITE_URL = 'https://example.com'; assert.throws(createSite);
  delete process.env.SITE_URL; process.env.SANKET_PRODUCTION = '1';
  if (!project.website) assert.throws(createSite, /Production requires SITE_URL/);
} finally {
  for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
}
let repositoryLinks = 0;
for (const filename of ['README.md', ...fs.readdirSync(path.join(root, 'docs')).filter(name => name.endsWith('.md')).map(name => `docs/${name}`)]) {
  const source = fs.readFileSync(path.join(root, filename), 'utf8');
  for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(match[1])) continue;
    const target = match[1].split('#')[0];
    assert(fs.existsSync(path.resolve(root, path.dirname(filename), target)), `Missing repository link: ${filename} -> ${target}`);
    repositoryLinks++;
  }
}
console.log(`PASS: ${repositoryLinks} README/documentation relative links.`);
console.log(`PASS: ${routes.length} static HTML pages; ${linksChecked} internal links; model/labels; JSON-LD; social image; safe asset inventory; llms files; ${origin ? 'production' : 'unpublished preview'} metadata; isolated production-generation checks.`);

const urlFlag = process.argv.indexOf('--url');
if (urlFlag !== -1) {
  const base = process.argv[urlFlag + 1];
  assert(base, 'Provide a running preview origin after --url');
  for (const [route, file] of known) {
    const response = await fetch(new URL(route, base));
    assert.equal(response.status, 200, `${route}: HTTP status`);
    assert(response.headers.get('content-type')?.includes('text/html'), `${route}: HTML MIME`);
    const body = await response.text();
    assert(body.includes(read(file).match(/<title>[^<]+<\/title>/)[0]), `${route}: wrong route content`);
  }
  for (const filename of ['llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml', 'docs/model/index.md', 'social-preview.png']) {
    const response = await fetch(new URL('/' + filename, base));
    assert.equal(response.status, 200, filename);
    assert(!response.headers.get('content-type')?.includes('text/html'), `${filename}: SPA fallback`);
    assert((await response.arrayBuffer()).byteLength > 0);
  }
  console.log('PASS: 19 HTML routes and 6 crawler/Markdown/image endpoints served over HTTP.');
}
