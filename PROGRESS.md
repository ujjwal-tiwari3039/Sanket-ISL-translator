# Progress Log

## Phase 1 — Mine the reference repos (Complete)
- Created branch `rebuild/isl-v2`.
- Cloned all 6 reference repositories into `/reference/` and added to `.gitignore`.
- Examined the codebases and documented their techniques and findings in `/reference/NOTES.md`.
- Key takeaways: 
  - Verified class imbalance challenges (from `sumedhsp`) which we will handle in Phase 4 via weighted loss/sampling.
  - Confirmed the necessity of multiple signers for self-recorded data (from `GesturalAI-Nerds`).
  - Validated our normalization approach against `InterpretableTransformer` and `CodingSamrat`.
  - Gathered ideas for the UI confidence indicator (from `signVLM`).
