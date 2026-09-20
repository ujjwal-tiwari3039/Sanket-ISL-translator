# Discoverability maintenance record

Internal repository document; excluded from the static website and llms-full.txt.

Audit date: 2026-09-20. Baseline checkout: `12337945`. User confirmed that the project has never been deployed.

## Canonical identity

- Name: **Sanket ISL Translator**.
- Primary description: **Real-time Indian Sign Language (ISL) to English translation using computer vision and deep learning.**
- Entity sentence: **Sanket ISL Translator is a real-time Indian Sign Language (ISL) to English translation system using computer vision and deep learning.**
- Repository: https://github.com/ujjwal-tiwari3039/Sanket-ISL-translator
- Website: unset; no live canonical URL, sitemap URL or robots URL exists yet.
- Previous Git remote: `ujjwal-tiwari3039/Ai_sign_language_translator-`, which GitHub redirects to the repository above.
- Naming variants: Sanket, Sanket ISL, Sanket ISL Translator, descriptive Sanket Indian Sign Language Translator. Historical identifier: Sanket-ISLT.
- Terminology: Indian Sign Language recognition, ISL to English, computer vision, pose estimation, hand landmarks, MediaPipe, LSTM, TensorFlow.js, browser inference, English sentence generation.

Do not describe local inference as verified offline operation. Avoid calling public source an open-source licensed release until the project license is established.

## Baseline architecture and metadata audit

| Item | Baseline finding |
| --- | --- |
| Frontend/backend | React 19 + Vite 8 / Node.js Express 4 |
| Package manager | npm with tracked apps/frontend & apps/backend package-lock.json |
| Python workflow | OpenCV/MediaPipe extraction, TensorFlow/Keras training; incomplete requirements.txt for training |
| Deployment platform/URL | None found; user confirmed not deployed; GitHub homepage empty, Pages disabled |
| README | Long technical overview with unsupported MIT, offline and idle-class claims |
| Existing docs | PROGRESS.md, trace.md, MOTION_SIGN_BOUNDARY_FIX.md and codex_trial.md; historical experiments, some inconsistent with active source |
| HTML head | Title, viewport, favicon and old application-name only |
| Canonical, OG, Twitter, JSON-LD | Absent |
| robots.txt / sitemap / llms files | Absent |
| Favicon | Existing generic graphic, replaced with project-specific S mark |
| Model | Shipped Keras/TFJS artifacts, 263 labels, 245,831 parameters |
| Dataset | INCLUDE acquisition scripts and Zenodo metadata; exact used subset unverified |
| Citations | Dataset publication DOI in Zenodo snapshot; no Sanket DOI or paper |
| License | No root license; GitHub API license null; old MIT badge invalid |
| Authors/contributors | Commit display names recorded; repository owner is not automatically the sole author |
| Demo/screenshot | Local video manifest and ignored videos; no verified public demo link; existing hero.png not treated as a verified screenshot |
| Performance | Saved rounded 0.98 classification report; leakage-prone split and no untouched test set |
| Repository inventory | 37,595 tracked files, including 36,480 files under MP_Data_old_224 and 1,032 tracked dependency files |

## Claim evidence and unresolved verification

| Claim | Evidence / treatment |
| --- | --- |
| React, MediaPipe, TensorFlow.js, Express, Gemma 2 | package manifests, App.jsx and apps/backend/server.js |
| 30 × 258 input, LSTM 64/128/64, Dense 263 | shipped model.json, trainer; checked automatically |
| 245,831 parameters | calculated from shipped weight shapes; checked automatically |
| 263 labels, no idle | both label dictionaries; checked automatically |
| Manual capture stop | active App.jsx recording branch; unused hysteresis/padding constants do not establish behavior |
| Demo words/confidence/sentence are scripted | DemoMode.jsx uses manifest words, confidence and sentence typing |
| Offline application | [VERIFY] not established; external WASM, models and fonts; claim removed |
| Accuracy/generalization | [VERIFY] saved report is development evidence only; no reproducible independent test |
| Dataset subset, raw counts, resolution/FPS | [VERIFY] no source-video inventory tied to model run |
| Model/demo/code redistribution rights | [VERIFY] missing project license; dataset CC BY 4.0 does not resolve all artifacts |
| Scholarly authors, release version/date | [VERIFY] maintainer confirmation needed before CITATION.cff |
| Latency/FPS/user outcomes | [VERIFY] no reproducible measurements |
| Production readiness/accessibility outcomes | [VERIFY] no user study or production validation |

## GitHub metadata

Authenticated inspection reported `viewerPermission: WRITE`. Updating description/topics with `gh repo edit` returned HTTP 404. A subsequent metadata read must confirm application when retried by a repository administrator. `scripts/configure-github.sh` contains the exact requested operation; `project.json` records the description and relevant topics. The homepage field cannot be set until a real site is established.

GitHub metadata update is **not done**. No license, stars, downloads, awards or affiliations were invented. Read-back confirmed the old description and empty topics remained unchanged. No new commit, push or release was performed.

## Security and publication inventory

The generated website uses an explicit asset allowlist, not a recursive copy of public or repository directories. Only classifier assets, approved project graphics, documentation and compiled application assets are emitted. Demo footage is omitted; the published demo manifest is empty and the production UI identifies the local setup requirement. `.env` variants and provider state directories are ignored.

**Existing exposure requiring owner review:** tracked `sign_language_backup.tar.gz` contains a `.env` with a populated `GEMINI_API_KEY` field. Values were never printed or used; credential validity is unknown. Review privately and revoke/rotate if real. Removing a file in a new commit does not remove old Git objects; coordinated archive/history cleanup is a separate owner action. Existing tracked MP_Data_old_224 data and dependency files also remain despite ignore rules. Do not claim that repository history is free of sensitive material.

A limited scan of 157 historical first-party text blobs (up to 2 MB each) found no matches for the checked AWS/GitHub/Google key formats or private-key headers. This excludes binary archives/dependencies and is not a complete secret or personal-data audit. The backup was inspected separately. The public build is checked to exclude environment files, archives, key files, training arrays and videos.

## Current indexed-page evidence and naming confusion

Web search baseline used the available search provider, not authenticated Google/Bing webmaster data. Queries included:

- `"Sanket ISL Translator"`
- `"Sanket-ISL-translator" "ujjwal"`
- `site:github.com "Indian Sign Language" "Sanket"`
- `site:github.com/ujjwal-tiwari3039/Ai_sign_language_translator-`

Returned results did not establish indexing of this repository. That is **not proof of non-indexing**. Search results included other projects with overlapping names, for example [Mishra-Shreya/Sanket](https://github.com/Mishra-Shreya/Sanket) and [ayush2635/sanket-isl-translator](https://huggingface.co/ayush2635/sanket-isl-translator). Their architecture, metrics, authors and licenses are not evidence about this project. Do not add these to sameAs.

Public indexed website pages: not applicable before deployment. The exact GitHub URL resolves; discovery via broad queries remains unestablished.

## Search and AI verification protocol

After deployment, verify domain ownership in Google Search Console and Bing Webmaster Tools, submit the actual sitemap and inspect `/`, `/docs/model/` and `/docs/faq/`. Use a normal HTTP fetch to confirm meaningful HTML, canonical URLs, redirects, no login/noindex blocks, sitemap contents and public crawler resources. Validate JSON-LD with Schema.org's validator; Google rich-result tools need not report every valid semantic schema type.

Test natural questions in Google, Bing and the search-enabled modes of ChatGPT, Claude, Gemini and Perplexity:

- What is Sanket ISL Translator?
- Find Sanket ISL Translator.
- Find an Indian Sign Language to English translator.
- Find GitHub projects for Indian Sign Language recognition.
- Is there a real-time ISL translation project using MediaPipe and LSTM?
- Does Sanket work offline?

For every test record date, exact system/mode, exact query, locale, returned URLs and whether it (1) finds this website, (2) finds this GitHub repository, (3) identifies the entity correctly, (4) states limitations accurately, (5) links source, (6) links a real demo, and (7) confuses another Sanket project. Save verbatim excerpts only within permitted quotation limits. A system without browsing may not know a new project.

| System | Status |
| --- | --- |
| Available web search provider | Baseline above; no verified target indexing; naming collisions observed |
| Google Search Console / Bing Webmaster Tools | Requires deployed domain and account ownership; not submitted |
| ChatGPT / Claude / Gemini / Perplexity | No post-deployment test; deployed website does not exist |
| GitHub direct URL | HTTP 200; description/topics update denied |

## External presence

The project-authored [technical article](article.md) is ready for the website. No external posts, portfolio edits, backlinks, directory listings, DOI registration or endorsements were created. No portfolio repository/domain was supplied. After deployment and rights review, publish a substantive article or portfolio page under the maintainer's own account using the canonical name, description, source URL and real screenshots. External material must be genuine and should explain the implementation.

## Reference guidance consulted

- [llms.txt proposal, v2](https://llmstxt.org/): concise Markdown index, Markdown alternatives and discovery link relations.
- [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features): crawlability and useful, visible content remain relevant.
- [Google structured-data changes](https://developers.google.com/search/blog/2023/08/howto-faq-changes): do not promise FAQ rich results; no FAQPage schema is added.
- [Schema.org SoftwareSourceCode](https://schema.org/SoftwareSourceCode): repository/language metadata belongs on source-code entity.
- [Netlify configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/): build contexts and publish directory.

Search engines index independently. AI systems use different retrieval mechanisms; not all consume llms.txt. Indexing takes time, rankings/citations cannot be guaranteed, and external references and project authority matter. GitHub discovery and website discovery are separate mechanisms.

## Verification results

- Static build passed; 19 public HTML pages plus a noindex 404 document.
- 391 generated internal links and 149 README/documentation relative links checked.
- All 19 HTML routes and 6 crawler/Markdown/image endpoints returned HTTP 200 from local Vite preview.
- Homepage and FAQ readable with JavaScript disabled/blocked; React mounts when enabled. Desktop and 390px mobile checks passed with no horizontal overflow on the checked pages.
- JSON-LD parses; WebSite, WebPage, SoftwareApplication and SoftwareSourceCode identities are consistent. BreadcrumbList is emitted with canonical origins. No author/license/rating/FAQPage assertions were fabricated.
- Production-origin generation and missing-origin refusal are tested in memory. No fixture URL is written to deployment output.
- Seven core external URLs (repository, contributors, issues, dataset record and three badges) returned HTTP 200. The dataset DOI redirected to a publisher HTTP 403; the identifier is corroborated by the live Zenodo metadata, but automated publisher access could not be verified. Do not claim every external URL is fetchable by every crawler.
- Frontend npm audit reported zero vulnerabilities after a compatible nanoid patch. Lint exits successfully with 17 existing warnings in application code; build retains the existing large JavaScript chunk warning.
- Actual interface screenshot added with camera disabled, clearly identified as interface documentation rather than performance evidence.
- Live domain, deployment, public canonical URL resolution, Google/Bing ownership verification/submission and post-deployment AI citation tests remain unperformed.
