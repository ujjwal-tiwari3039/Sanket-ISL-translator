# Sanket ISL Translator — Discoverability Report

Audit and implementation date: 2026-09-20. Audited starting revision: `12337945`.

**DONE:** repository implementation, static documentation, metadata generation and local verification. **REQUIRES USER ACTION:** public deployment/domain, GitHub settings permissions, licensing/authorship confirmation and existing archive/history review. No ranking, indexing or AI citation is guaranteed.

## Current Architecture

React 19 + Vite 8 frontend, npm package locks, Node.js Express 4 sentence endpoint, MediaPipe browser landmarks, TensorFlow.js LSTM recognition, local Ollama `gemma2:2b`, and Python TensorFlow/Keras training scripts. The active browser captures until explicitly stopped; unused automatic-stop constants are not implemented behavior.

The shipped classifier has a `[batch, 30, 258]` input, LSTM layers 64/128/64, Dense head 64/32/263 and 245,831 parameters. Both label files have 263 entries with no idle class. Demo words, confidence values and final sentences are scripted. The old offline, MIT and idle-class claims were removed from authoritative documentation.

No pre-existing deployment was found, and the user confirmed that the project is not deployed. A static documentation layer now builds alongside the existing application. It does not deploy or replace the local backend.

## Files Added

| Exact path | Important change |
| --- | --- |
| [CHANGELOG.md](CHANGELOG.md) | Unreleased discoverability changes; no invented release history. |
| [DISCOVERABILITY_REPORT.md](DISCOVERABILITY_REPORT.md) | This implementation inventory, evidence, remaining actions and verification report. |
| [docs/about.md](docs/about.md) | Audience, problem, implementation, source, local setup and real interface screenshot. |
| [docs/architecture.md](docs/architecture.md) | Actual browser → LSTM → local Express/Ollama pipeline, Mermaid and network boundaries. |
| [docs/article.md](docs/article.md) | Project-authored technical article explaining implementation and methodological limitations. |
| [docs/citation.md](docs/citation.md) | Revision-based software citation and separate dataset attribution; CFF/DOI prerequisites. |
| [docs/dataset.md](docs/dataset.md) | INCLUDE provenance, license attribution, preprocessing, split and inventory limitations. |
| [docs/deployment.md](docs/deployment.md) | Production-origin gate, static hosting instructions, crawler paths and local-backend constraints. |
| [docs/discoverability.md](docs/discoverability.md) | Internal audit, claim evidence, search baseline, security findings and maintenance protocol. |
| [docs/faq.md](docs/faq.md) | 19 source-grounded questions covering models, local use, offline limits and reproduction. |
| [docs/glossary.md](docs/glossary.md) | ISL, recognition, glosses, landmarks, LSTM, TensorFlow.js, WebAssembly/WebGL and edge inference. |
| [docs/how-it-works.md](docs/how-it-works.md) | Manual capture through English generation; scripted demo explicitly distinguished. |
| [docs/index.md](docs/index.md) | Linked repository documentation hierarchy. |
| [docs/inference.md](docs/inference.md) | Active capture behavior, scheduling, browser inference, connectivity and privacy boundaries. |
| [docs/installation.md](docs/installation.md) | Node/npm/Ollama setup, usage, build checks and Python reproduction caveats. |
| [docs/limitations.md](docs/limitations.md) | Vocabulary, signing, cameras, non-manual grammar, evaluation, rights and deployment limits. |
| [docs/model.md](docs/model.md) | Exact shipped architecture, 245,831 parameters, 263 labels, training configuration and evaluation caveats. |
| [docs/overview.md](docs/overview.md) | Canonical identity, features, naming variants and research status. |
| [docs/preprocessing.md](docs/preprocessing.md) | 1,692 raw values → 258 features, x/y normalization, resampling and augmentation. |
| [docs/research.md](docs/research.md) | Problem, methodology, reproducibility gaps and proposed next experiments. |
| [docs/vocabulary.md](docs/vocabulary.md) | Complete ordered list of the 263 shipped output labels. |
| [frontend/public/discovery.css](frontend/public/discovery.css) | Responsive static-page styling isolated from the translator interface. |
| [frontend/public/screenshots/translator.png](frontend/public/screenshots/translator.png) | Actual local interface screenshot with camera access denied; no recognition claim. |
| [frontend/public/social-preview.png](frontend/public/social-preview.png) | 1200 × 630 social card, rendered from the editable project SVG. |
| [frontend/public/social-preview.svg](frontend/public/social-preview.svg) | Original typography-based social artwork; no generated marketing imagery. |
| [frontend/scripts/build-production.mjs](frontend/scripts/build-production.mjs) | Reject production publishing without an explicit canonical origin. |
| [frontend/scripts/check-discoverability.mjs](frontend/scripts/check-discoverability.mjs) | Build, link, metadata, model, asset, preview/production and optional HTTP checks. |
| [frontend/scripts/discoverability.mjs](frontend/scripts/discoverability.mjs) | Vite integration, shared metadata, static HTML/Markdown pages and crawler-file generation. |
| [netlify.toml](netlify.toml) | Optional hosting configuration with production gate and noindex preview contexts. |
| [project.json](project.json) | Machine-readable factual identity, repository, languages, status and relevant topics; website unset. |
| [scripts/configure-github.sh](scripts/configure-github.sh) | Exact requested GitHub description/topics update and optional verified homepage update. |

## Files Modified

| Exact path | Important change |
| --- | --- |
| [.gitignore](.gitignore) | Ignore local environment variants and deployment-account state; preserve example env files. |
| [MOTION_SIGN_BOUNDARY_FIX.md](MOTION_SIGN_BOUNDARY_FIX.md) | Mark historical/unverified experimental claims and link current audited documentation. |
| [PROGRESS.md](PROGRESS.md) | Mark historical/unverified experimental claims and link current audited documentation. |
| [README.md](README.md) | Complete technical rewrite, canonical identity, screenshot, installation, source links and honest limitations. |
| [backend/server.js](backend/server.js) | Canonical project name in the backend health text; inference behavior unchanged. |
| [codex_trial.md](codex_trial.md) | Mark historical/unverified experimental claims and link current audited documentation. |
| [frontend/README.md](frontend/README.md) | Replace starter text with project setup and authoritative documentation links. |
| [frontend/index.html](frontend/index.html) | Build-injected metadata and persistent visible project content around the React root. |
| [frontend/package-lock.json](frontend/package-lock.json) | Lock marked and compatible nanoid security patch (3.3.16 → 3.3.19). |
| [frontend/package.json](frontend/package.json) | Static-build production gate and validation commands; add Markdown renderer as dev dependency. |
| [frontend/public/favicon.svg](frontend/public/favicon.svg) | Replace generic favicon with original Sanket S mark. |
| [frontend/src/App.jsx](frontend/src/App.jsx) | Canonical name, single homepage H1 hierarchy, and production demo availability notice/control. |
| [frontend/src/DemoMode.jsx](frontend/src/DemoMode.jsx) | Canonical name, visible scripted-output disclosure and usable Exit demo button. |
| [frontend/src/index.css](frontend/src/index.css) | Style canonical app heading and prevent header controls crowding the longer name. |
| [frontend/vite.config.js](frontend/vite.config.js) | Integrate static documentation; production emits an allowlist instead of copying public recursively. |
| [trace.md](trace.md) | Mark historical/unverified experimental claims and link current audited documentation. |

## Website Changes

**DONE:** 19 indexable-in-production HTML pages: `/`, `/about/`, `/docs/`, and these topic routes:

`/docs/overview/`, `/docs/architecture/`, `/docs/how-it-works/`, `/docs/model/`, `/docs/dataset/`, `/docs/preprocessing/`, `/docs/inference/`, `/docs/installation/`, `/docs/vocabulary/`, `/docs/faq/`, `/docs/limitations/`, `/docs/glossary/`, `/docs/research/`, `/docs/article/`, `/docs/citation/`, `/docs/deployment/`.

Every page has a descriptive title, unique meta description, visible H1, meaningful static text and navigation. Technical pages do not load the React bundle or require JavaScript/camera access. Visible breadcrumbs reflect the page hierarchy. The homepage keeps its text outside React's mount node so it remains present when the app runs. No hidden keyword text, fake testimonials or keyword pages were added.

A separate noindex `404.html` is generated. The Netlify configuration is an optional hosting target, not a deployed service. The production app's demo control explains the local setup requirement because unreviewed demo footage is excluded.

## GitHub Changes

**DONE locally:** rewritten README, technical documentation, factual project manifest and executable metadata-update script. The canonical repository is [ujjwal-tiwari3039/Sanket-ISL-translator](https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator); the old Git remote redirects there.

**NOT APPLIED remotely:** `gh repo edit` returned HTTP 404 when applying the requested description/topics. Authenticated inspection reported WRITE access, but read-back confirmed the old description and empty topics remained. A repository administrator must run `bash scripts/configure-github.sh`. No homepage was invented; configure it after deployment. No commit, push, release, archive publication or external post was performed.

Topics prepared: indian-sign-language, isl, sign-language, sign-language-recognition, sign-language-translation, isl-translator, computer-vision, deep-learning, machine-learning, gesture-recognition, mediapipe, tensorflow, tensorflowjs, lstm, browser-based.

## SEO Changes

**DONE:** canonical project identity, descriptive title and description, social metadata, original favicon/social card, persistent HTML, internal linking and source-evidence links. Historical notes now clearly distinguish old experiments from current capabilities. No fabricated license badge, benchmark, affiliation or award remains in the authoritative README.

The browser-application bundle still triggers Vite's large-chunk warning; static documentation avoids that bundle entirely. This task did not optimize inference or promise a performance score.

## Structured Data

**DONE:** JSON-LD generated by `frontend/scripts/discoverability.mjs`:

- `WebSite`: shared project website identity.
- `WebPage`: each page's name, description and relationship to the site/project.
- `SoftwareApplication`: Sanket identity, appropriate educational application category, and browser/local-service requirements.
- `SoftwareSourceCode`: verified `codeRepository`, Python/JavaScript languages and target application.
- `BreadcrumbList`: with a configured origin, matches the visible documentation hierarchy.

Stable production IDs use `/#website`, `/#application`, `/#source` and each page's `#page`/`#breadcrumbs`. Canonical URLs and absolute IDs are generated from one origin. Source-code-specific properties are not misapplied to WebSite. No guessed author, Organization, license, ratings, offers or achievements are added. FAQPage is omitted; visible FAQ content is provided without promising Google FAQ rich results. Local checks parse JSON-LD and check entity/URL consistency; third-party live validation remains a deployment action.

## AI-Friendly Documentation

**DONE:** audited source Markdown, static technical HTML, page-specific Markdown alternatives, a visible 19-question FAQ, glossary, full label list, methodology page and a substantive technical article. Links connect architecture, model, dataset, inference and limitations.

Each technical HTML page advertises `rel="alternate" type="text/markdown"` and `rel="describedby"` for the llms index. Internal audit documents are not copied into public output. The llms proposal is an optional consumption convention, not an instruction that forces AI answers.

## llms.txt

**DONE in actual website output:** `frontend/dist/llms.txt` and `frontend/dist/llms-full.txt`. The latter consolidates substantive technical documentation rather than marketing copy. The index links generated Markdown pages and the verified repository.

These files are emitted by the Vite plugin at the deployment root; they are not repository-root files incorrectly assumed to be web URLs. Local Vite development serves generated documents through middleware. Public URLs do not exist before deployment.

## Sitemap

**DONE generator and tests:** `frontend/dist/sitemap.xml`. With `SITE_URL` configured, it lists exactly the 19 public HTML routes using canonical URLs. It excludes the 404 page, source Markdown alternatives and internal maintenance documents. No invented timestamps or placeholder public URLs are inserted.

The current unpublished output has an empty sitemap because no domain exists. This is deliberate; it is not ready for sitemap submission.

## Robots

**DONE generator and tests:** `frontend/dist/robots.txt` allows public crawling with `User-agent: *` and `Allow: /`. A configured production origin adds the sitemap reference. No speculative individual AI crawler rules are used. HTML previews use noindex, while production pages do not. robots.txt is not a mechanism for protecting private data; build isolation provides the publication boundary.

## Canonical URLs

| Resource | Current status |
| --- | --- |
| Website canonical URL | Not assigned; user confirmed no deployment |
| GitHub URL | https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator |
| llms.txt public URL | Not assigned; emitted at `/llms.txt` after deployment |
| llms-full.txt public URL | Not assigned; emitted at `/llms-full.txt` after deployment |
| Sitemap public URL | Not assigned; emitted at `/sitemap.xml` after deployment |
| Robots public URL | Not assigned; emitted at `/robots.txt` after deployment |
| Local validation URL | `http://127.0.0.1:4173/` during verification only; not a canonical public address |

Set `SITE_URL` to a verified root HTTPS origin, or set `project.json.website` once established. `npm run build:production` refuses an unset origin. Normal builds without one are explicitly unpublished/noindex; Netlify preview contexts remain noindex even with a production URL in the environment. URL normalization uses trailing slashes, and `_redirects` maps explicit index.html aliases. Live host redirects cannot be confirmed until deployment.

## External Discoverability

**DONE:** limited search baseline and a project-authored technical article. The exact repository and Zenodo dataset record resolve. Search results contain other projects called Sanket; their authors, licenses, metrics and technology must not be merged with this entity. The baseline did not establish the target repository's indexing, which is not proof of non-indexing. See [search evidence](docs/discoverability.md).

**REQUIRES USER ACTION:** publish genuine technical/portfolio material under an appropriate account after a real deployment. No existing portfolio was supplied. No fake backlinks, directory entries, third-party endorsements or social posts were created. No project DOI was invented. CFF/DOI publication is deferred until real authors, rights and release metadata are confirmed; commit identities alone were not converted into scholarly authorship.

## Verification Checklist

| Check | Result |
| --- | --- |
| Final Vite build | PASS |
| Static pages and local paths | PASS: 19 HTML routes, 391 generated internal links |
| README/documentation relative links | PASS: 149 links |
| HTTP routes and crawler endpoints | PASS: 19 HTML routes + 6 llms/robots/sitemap/Markdown/image endpoints |
| JavaScript-disabled content | PASS: homepage and FAQ; app script downloads blocked and empty React root checked |
| React mount / heading hierarchy | PASS; single H1 with app heading as H2 |
| Desktop/mobile rendering | PASS on checked homepage and FAQ, including 390px viewport; screenshots inspected |
| Model facts and labels | PASS: 263 labels, no idle, matching label maps, 245,831 weight parameters |
| JSON-LD and metadata | PASS local syntax/entity/unique-title/description/social checks |
| Production-origin behavior | PASS isolated generation test and absent-origin refusal; no invented test origin written to dist |
| Public asset safety | PASS allowlist and absence of env/archive/training/video files in dist |
| Core external links | 7 HTTP 200; dataset DOI destination returned HTTP 403 (identifier verified through Zenodo) |
| Frontend dependency audit | PASS: zero known vulnerabilities after compatible nanoid patch |
| Lint | PASS exit status; 17 existing application warnings remain |
| Backend syntax / diff whitespace | PASS |
| Recognition accuracy / camera translation | Not re-benchmarked; camera denied for screenshot; existing pipeline behavior retained |
| GitHub description/topics | NOT DONE: update denied, read-back unchanged |
| Domain, public canonical/crawler URLs | NOT DONE: no domain/deployment |
| Production deployment and host redirect verification | NOT DONE |
| Search Console / Bing verification and submission | NOT DONE: requires deployed domain and account access |
| Live structured-data tools and AI-search citations | NOT DONE: post-deployment work |

Reproduce local checks from the repository root:

```bash
npm --prefix frontend run build
npm --prefix frontend run check:discoverability
npm --prefix frontend run lint
node --check backend/server.js
git diff --check
```

With the preview server running, add `-- --url http://127.0.0.1:4173` to the discoverability check for HTTP verification. The browser checks used a temporary headless Chromium-compatible browser with camera access denied; the screenshot is an interface capture, not inference evidence.

## Remaining Manual Actions

1. **Review existing sensitive material:** tracked `sign_language_backup.tar.gz` contains a `.env` with a populated `GEMINI_API_KEY` field. Its validity was not tested and no value was printed. Review privately, revoke/rotate if real, and coordinate archive/history cleanup. Existing tracked MP_Data_old_224 files and dependency directories also need rights/maintenance review. Ignore rules do not untrack old objects. A limited scan of 157 historical text blobs found no checked credential-format matches; this is not a complete secret audit. The new website build excludes these artifacts.
2. **Confirm rights/authorship:** establish the code/model/demo licensing and agreed author list. Then create an accurate LICENSE and CITATION.cff; archive a real research release only if useful. No project DOI currently exists.
3. **Publish the repository changes and configure a real host/domain:** optional Netlify configuration is ready. Set `SITE_URL`, build with `build:production`, deploy only `frontend/dist/`, and verify the resulting URLs. The interactive frontend still requires local Express/Ollama for sentence generation; static deployment is not a hosted backend.
4. **Apply GitHub settings with adequate permission:** run `bash scripts/configure-github.sh`, supplying the actual SITE_URL only after deployment, then verify the About description, topics and homepage.
5. **Update identity links after deployment:** set `project.json.website`, README live URL and any genuine portfolio/article profiles, then rebuild. Replace the current factual “not deployed” status only after publication succeeds.
6. **Submit and measure:** verify domain ownership in Google/Bing webmaster tools, submit the sitemap, inspect URLs and validate live structured data. Run the recorded AI/search questions without forcing answers; distinguish this repository from unrelated Sanket projects.

### Claims that could not be verified

`[VERIFY]` independent accuracy, latency/FPS, generalization to unfamiliar signers, exact original training sample inventory, dataset resolution/frame-rate distribution, fully offline operation, code/model/media licenses, agreed scholarly authorship, release metadata, production readiness and demonstrated accessibility outcomes. These are omitted as facts or explicitly qualified in the public documentation. Source constants and historical claims that contradict active code are not promoted as features.

Search engines maintain independent indexes; AI systems use different retrieval mechanisms and not all consume llms.txt. Indexing can take time. Rankings and citations cannot be guaranteed. Useful content, stable URLs, legitimate external references and project authority matter, and GitHub discovery is separate from web discovery.
