import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const publicRoot = path.join(root, 'apps/frontend/public');
const project = JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8'));
const sourceURL = `${project.repository}/blob/main/`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Explicit publication inventory: repository notes and arbitrary public files are never copied.
export const pages = [
  ['overview', 'What is Sanket ISL Translator?', 'Purpose, features and project status of Sanket ISL Translator, an Indian Sign Language to English research prototype.'],
  ['architecture', 'System architecture', 'The Sanket pipeline: webcam, MediaPipe landmarks, TensorFlow.js LSTM recognition, Express and local English sentence generation.'],
  ['how-it-works', 'How ISL becomes English output', 'Follow gesture capture, landmark extraction, sign classification and English output in Sanket ISL Translator.'],
  ['model', 'Sign recognition model', 'Verified Sanket LSTM layers, 30 × 258 input, 263 output labels, training configuration and evaluation limitations.'],
  ['dataset', 'Dataset and provenance', 'INCLUDE dataset references, source licensing, training provenance gaps and split methodology used by Sanket.'],
  ['preprocessing', 'Landmark preprocessing', 'How Sanket normalizes pose and hand coordinates, removes face features and resamples temporal sign sequences.'],
  ['landmark-schema', 'Canonical landmark schema', 'Versioned landmark indices, side slots, missingness, normalization and tensor layout shared by Python and JavaScript.'],
  ['custom-dataset', 'Collect and prepare sign data', 'Record custom signs and re-extract INCLUDE videos into validated metadata-bearing canonical samples.'],
  ['training', 'Train candidate models', 'Reproducible recording-group splits, train-only augmentation, source weighting and isolated candidate exports.'],
  ['evaluation', 'Evaluate models and parity', 'Held-out metrics, source-wise reporting, threshold analysis and cross-runtime preprocessing and prediction checks.'],
  ['temporal-segmentation', 'Temporal gesture capture', 'Arming, motion thresholds, capture bounds, stop hysteresis and shared thirty-frame temporal resampling.'],
  ['inference', 'Browser inference', 'TensorFlow.js sign classification, local Ollama sentence generation, privacy boundaries and connectivity requirements.'],
  ['installation', 'Installation and usage', 'Run Sanket ISL Translator locally with React, Vite, Express and Ollama; learn camera and training requirements.'],
  ['vocabulary', 'Shipped recognition vocabulary', 'The complete ordered list of 263 labels in Sanket’s shipped model, with no implied recognition accuracy guarantee.'],
  ['faq', 'Frequently asked questions', 'Answers about Sanket, ISL translation, MediaPipe, LSTM, TensorFlow.js, offline limitations and local installation.'],
  ['limitations', 'Limitations', 'Understand Sanket’s restricted vocabulary, camera and signer variation, evaluation leakage and generated-text limitations.'],
  ['glossary', 'ISL recognition glossary', 'Definitions of Indian Sign Language, recognition, glosses, LSTM, hand landmarks, browser inference and sentence generation.'],
  ['research', 'Research methodology', 'Sanket methodology, reproducibility gaps and proposed experiments for evaluating ISL recognition and sentence fidelity.'],
  ['article', 'How Sanket connects vision to English', 'A technical article about landmark features, temporal modeling, browser inference and lessons from building Sanket.'],
  ['citation', 'Citation and attribution', 'How to reference Sanket by repository revision and cite the INCLUDE dataset separately without inventing project metadata.'],
  ['deployment', 'Deployment and public URLs', 'Build and publish Sanket’s static documentation with a verified canonical origin, crawler files and deployment checks.'],
];

export function configuredOrigin() {
  if (process.env.SANKET_PREVIEW === '1') {
    if (process.env.SANKET_PRODUCTION === '1') throw new Error('Production cannot use SANKET_PREVIEW.');
    return null;
  }
  const value = process.env.SITE_URL || project.website;
  if (!value) {
    if (process.env.SANKET_PRODUCTION === '1') throw new Error('Production requires SITE_URL set to the verified HTTPS site origin.');
    return null;
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      /^(localhost|127\.|0\.|\[::1\]|example\.(com|org|net)$)/i.test(url.hostname)) {
    throw new Error('SITE_URL must be a public HTTPS origin with no path, credentials, query or fragment. Deploy at an origin root.');
  }
  return url.origin;
}

export function createSite() {
  const origin = configuredOrigin();
  const url = pathname => origin ? `${origin}${pathname}` : pathname;
  const assets = new Map();
  const put = (name, content) => assets.set(name.replace(/^\//, ''), content);
  const nav = `<nav aria-label="Project"><a href="/">Sanket ISL Translator</a><a href="/about/">About</a><a href="/docs/">Documentation</a><a href="/docs/faq/">FAQ</a><a href="${project.repository}">GitHub source</a></nav>`;
  const footer = `<footer class="discovery-footer"><p>${escape(project.description)}</p><p><a href="/docs/limitations/">Limitations</a> · <a href="/docs/citation/">Citation</a> · <a href="/llms.txt">AI documentation index</a></p></footer>`;
  const sourceEntity = {
    '@type': 'SoftwareSourceCode', '@id': url('/#source'), name: project.name,
    codeRepository: project.repository, programmingLanguage: project.programmingLanguage,
    description: project.description, targetProduct: { '@id': url('/#application') },
  };
  const application = {
    '@type': 'SoftwareApplication', '@id': url('/#application'), name: project.name,
    description: project.description, applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web browser with local Node.js and Ollama services for sentence generation',
    sameAs: [project.repository], ...(origin ? { url: url('/') } : {}),
  };
  const website = { '@type': 'WebSite', '@id': url('/#website'), name: project.name, ...(origin ? { url: url('/') } : {}) };

  function head(title, description, route, markdownRoute, crumbs = []) {
    const graph = [website, application, sourceEntity, {
      '@type': 'WebPage', '@id': url(`${route}#page`), name: title, description,
      ...(origin ? { url: url(route) } : {}), isPartOf: { '@id': url('/#website') }, about: { '@id': url('/#application') },
    }];
    if (origin && crumbs.length) graph.push({ '@type': 'BreadcrumbList', '@id': url(`${route}#breadcrumbs`), itemListElement: crumbs.map(([label, href], index) => ({ '@type': 'ListItem', position: index + 1, name: label, item: url(href) })) });
    const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
    return `<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="application-name" content="${project.name}">
${origin ? `<link rel="canonical" href="${escape(url(route))}">` : '<meta name="robots" content="noindex, follow">'}
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${project.name}">
${origin ? `<meta property="og:url" content="${escape(url(route))}">` : ''}
<meta property="og:image" content="${escape(url('/social-preview.png'))}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Sanket — Indian Sign Language to English — Real-Time AI Translator">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(url('/social-preview.png'))}">
<meta name="twitter:image:alt" content="Sanket — Indian Sign Language to English — Real-Time AI Translator">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/discovery.css">
<link rel="describedby" href="/llms.txt" type="text/plain">
<link rel="alternate" type="text/markdown" href="${markdownRoute}">
<script type="application/ld+json">${schema}</script>`;
  }

  const published = new Set(pages.map(([slug]) => slug));
  function rewriteMarkdown(markdown, absolute = false) {
    return markdown.replace(/\]\(([^)]+)\)/g, (match, href) => {
      if (/^(https?:|#)/.test(href)) return match;
      const [filename, hash] = href.split('#');
      let target;
      if (filename === 'index.md') target = '/docs/';
      else if (filename === 'about.md') target = '/about/';
      else if (filename.startsWith('../apps/frontend/public/screenshots/')) target = filename.replace('../apps/frontend/public', '');
      else if (published.has(filename.replace(/\.md$/, ''))) target = `/docs/${filename.replace(/\.md$/, '')}/`;
      else target = `${sourceURL}${filename.startsWith('../') ? filename.slice(3) : 'docs/' + filename}`;
      if (absolute && target.startsWith('/')) target = url(target);
      return `](${target}${hash ? '#' + hash : ''})`;
    });
  }
  function render(markdown) {
    return marked.parse(rewriteMarkdown(markdown));
  }
  function page(route, title, description, markdown, crumbs) {
    const markdownRoute = `${route}index.md`;
    const bread = `<nav aria-label="Breadcrumb">${crumbs.map(([label, href]) => `<a href="${href}">${escape(label)}</a>`).join(' <span aria-hidden="true">/</span> ')}</nav>`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head(`${title} | ${project.name}`, description, route, markdownRoute, crumbs)}</head><body class="documentation">${nav}<main class="discovery-document">${bread}${render(markdown)}<p class="source-link"><a href="${markdownRoute}">Read this page as Markdown</a></p></main>${footer}</body></html>`;
    put(`${route}index.html`, html);
    put(markdownRoute, rewriteMarkdown(markdown, true));
  }

  const contents = new Map(pages.map(([slug]) => [slug, fs.readFileSync(path.join(root, `docs/${slug}.md`), 'utf8')]));
  for (const [slug, title, description] of pages) page(`/docs/${slug}/`, title, description, contents.get(slug), [['Home', '/'], ['Documentation', '/docs/'], [title, `/docs/${slug}/`]]);
  const index = `# Sanket ISL Translator Documentation\n\n${project.description}\n\n${pages.map(([slug, title, description]) => `- [${title}](${slug}.md): ${description}`).join('\n')}\n`;
  page('/docs/', 'Technical documentation', 'Technical documentation for Sanket ISL Translator: architecture, LSTM model, dataset, preprocessing, installation, FAQ and limitations.', index, [['Home', '/'], ['Documentation', '/docs/']]);
  page('/about/', 'About the project', 'Who Sanket ISL Translator is for, what it does, its technologies, research goals, source code and practical limitations.', fs.readFileSync(path.join(root, 'docs/about.md'), 'utf8'), [['Home', '/'], ['About', '/about/']]);

  const homeMarkdown = `# Sanket ISL Translator\n\n${project.name} is a real-time Indian Sign Language (ISL) to English translation system using computer vision and deep learning.\n\nMediaPipe extracts pose and hand landmarks, a TensorFlow.js LSTM recognizes selected ISL signs, and local Express/Ollama services generate English text from the label sequence.\n\nThis research prototype has a fixed vocabulary. Presentation mode uses scripted words and sentences. MediaPipe assets require external downloads; fully offline operation is not established.\n\n- [Architecture](/docs/architecture/)\n- [Installation](/docs/installation/)\n- [FAQ](/docs/faq/)\n- [Limitations](/docs/limitations/)\n- [GitHub source](${project.repository})\n`;
  put('index.md', homeMarkdown);
  const home = `${nav}<section class="discovery-home" aria-labelledby="project-title"><p class="discovery-eyebrow">COMPUTER VISION · BROWSER INFERENCE</p><h1 id="project-title">Sanket ISL Translator — Indian Sign Language to English</h1><p>${project.name} is a real-time Indian Sign Language (ISL) to English translation system using computer vision and deep learning.</p><p>MediaPipe extracts pose and hand landmarks; a TensorFlow.js LSTM recognizes selected signs. Local Express and Ollama services generate English text from recognized labels.</p><div class="discovery-links"><a href="#translator">Open translator ↓</a><a href="/docs/installation/">Run locally</a><a href="/docs/architecture/">Recognition architecture</a><a href="/docs/model/">Model</a><a href="/docs/dataset/">Dataset</a></div><p class="discovery-note">Research prototype with a fixed vocabulary. Sentence generation needs the local service. Presentation mode uses scripted outputs. <a href="/docs/limitations/">Read limitations</a>.</p></section>`;
  const homeDescription = `${project.name} is a real-time Indian Sign Language (ISL) to English translation system using computer vision and deep learning.`;
  const homeHead = head('Sanket ISL Translator — Real-Time Indian Sign Language to English', homeDescription, '/', '/index.md');

  let llms = `# ${project.name}\n\n> ${project.description}\n\nSelected webcam signs are classified in the browser. English generation uses local Express and Ollama. Demo outputs are scripted. External MediaPipe assets are required. Read limitations before interpreting results.\n\n## Project\n\n- [Homepage](${url('/')}): Project description and interactive application; sentence generation requires local services.\n- [Homepage Markdown](${url('/index.md')}): Plain-text overview.\n- [About the project](${url('/about/index.md')}): Purpose, audience and project source.\n- [GitHub repository](${project.repository}): Source code and contribution history.\n\n## Documentation\n\n`;
  llms += pages.map(([slug, title, description]) => `- [${title}](${url(`/docs/${slug}/index.md`)}): ${description}`).join('\n');
  llms += `\n\n## Optional\n\n- [Full technical documentation](${url('/llms-full.txt')}): Consolidated technical pages.\n`;
  put('llms.txt', llms);
  put('llms-full.txt', `# ${project.name}: full technical documentation\n\n${project.description}\n\n${pages.map(([slug]) => `Source: ${url(`/docs/${slug}/`)}\n\n${rewriteMarkdown(contents.get(slug), true)}`).join('\n\n---\n\n')}`);
  const routes = ['/', '/about/', '/docs/', ...pages.map(([slug]) => `/docs/${slug}/`)];
  put('_redirects', routes.map(route => `${route}index.html ${route} 301!`).join('\n') + '\n');
  put('robots.txt', `User-agent: *\nAllow: /\n${origin ? `\nSitemap: ${url('/sitemap.xml')}\n` : '\n# Unpublished build: HTML pages carry noindex; configure SITE_URL for production.\n'}`);
  put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${origin ? routes.map(route => `  <url><loc>${escape(url(route))}</loc></url>`).join('\n') : ''}\n</urlset>\n`);
  put('project.json', JSON.stringify({ ...project, website: origin, ...(origin ? { documentation: url('/docs/') } : {}) }, null, 2) + '\n');
  put('404.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page not found | Sanket ISL Translator</title><meta name="robots" content="noindex"></head><body><h1>Page not found</h1><p>Visit <a href="/">Sanket ISL Translator</a> or the <a href="/docs/">documentation</a>.</p></body></html>');

  const model = JSON.parse(fs.readFileSync(path.join(publicRoot, 'models/model.json'), 'utf8'));
  const publicFiles = ['favicon.svg', 'social-preview.svg', 'social-preview.png', 'screenshots/translator.png', 'discovery.css', 'models/model.json', 'models/labels.json'];
  for (const group of model.weightsManifest) for (const shard of group.paths) {
    if (path.basename(shard) !== shard) throw new Error('Unexpected model shard path');
    publicFiles.push(`models/${shard}`);
  }
  for (const filename of publicFiles) put(filename, fs.readFileSync(path.join(publicRoot, filename)));
  // Presentation footage has no verified redistribution license. Keep local dev footage local.
  put('demo/manifest.json', '[]\n');
  return { origin, assets, routes, home, homeHead, footer };
}

export function discoverabilityPlugin() {
  let site;
  const contentType = filename => ({ '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }[path.extname(filename)] || 'application/octet-stream');
  return {
    name: 'sanket-static-documentation',
    configResolved() { site = createSite(); },
    transformIndexHtml(html) {
      return html.replace('<!-- sanket:head -->', site.homeHead).replace('<!-- sanket:overview -->', site.home).replace('<!-- sanket:footer -->', site.footer);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (pathname === '/' || pathname === '/index.html' || pathname.startsWith('/demo/')) return next();
        const canonical = site.routes.find(route => route !== '/' && (pathname === route.slice(0, -1) || pathname === `${route}index.html`));
        if (canonical) { res.writeHead(301, { Location: canonical }); return res.end(); }
        const filename = pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
        if (!site.assets.has(filename)) return next();
        res.setHeader('Content-Type', contentType(filename));
        res.end(site.assets.get(filename));
      });
    },
    generateBundle() {
      for (const [fileName, source] of site.assets) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}
