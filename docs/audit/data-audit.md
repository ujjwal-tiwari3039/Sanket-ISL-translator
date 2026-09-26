# Phase 0: data and provenance audit

## Full local structural scan

Every NPY below both dataset roots was loaded with `allow_pickle=False`, checked for shape and finite entries; numeric sequence directories were checked for frame files 0…29. This read-only scan did not normalize or rewrite data.

| Property | MP_Data | MP_Data_old_224 |
|---|---:|---:|
| Classes | 263 | 77 |
| Sequences | 3,679 | 1,216 |
| Frames | 110,370 | 36,480 |
| Feature shape | All `(1692,)` | All `(1692,)` |
| Frames per sequence | All 30 | All 30 |
| Missing expected files | 0 | 0 |
| Nonfinite/corrupt frames | 0 | 0 |
| Entirely zero frames | 31 | 0 |
| Min/max samples per class | 3 / 27 | 3 / 50 |

The historical root's 36,480 NPY files are tracked despite ignore rules and documentation saying data is uncommitted. The active root is local ignored data. No deletion or movement was performed. Structural validity does **not** establish sign correctness, acceptable missing-hand rates, physical coordinate validity or common provenance. Duplicate hashing, coordinate distributions, signer/source counts and semantic left/right validation remain Phase 6 work.

## Source paths and compatibility

`scripts/dataset/download_and_extract.py` references Zenodo record 4010759. It discovers videos, labels them from parent directories, samples 30 images using integer linspace, applies Python IMAGE-mode pose/hands, inserts 1434 face zeros, and saves raw 1692-vectors. Completed archive names are saved separately; source video identity, signer, fps, detector hashes, package version and frame timestamps are not attached to samples. Numbered outputs append on rerun, so interrupted/repeated processing can duplicate recordings. An archive can be marked complete despite skipped unreadable videos. Current old model paths prevent immediate reproduction without repair.

`ml/src/data/process_include.py` follows similar image selection but imports an absent old module and would use face extraction through that module. Existing NPYs cannot prove which script/version created them. `zenodo_files.json` and `completed_zips.txt` describe downloads, not a sample-to-source manifest.

`data_collection.py` hardcodes 15 labels and 15 takes, flips pixels before detection, and writes fixed numeric sample names without metadata. Existing samples can be overwritten. Camera failure can leave partial sequences; the trainer would silently pad them. It creates directories and detectors at import time. The requested `--label/--samples/--camera` interface does not exist.

`segmenter.py` takes manually selected boundaries, saves at most the first 30 frames and pads short segments with zeros. It does not resample the complete marked gesture. `automated_scraper.py` uses the first YouTube search result as a word video, without label or segmentation verification. Those results cannot be assumed valid INCLUDE-equivalent training examples.

`create_idle_data.py` derives synthetic sequences from other classes' first frames with no parent-sample metadata, unseeded NumPy noise and possible overwrites. Mixing these with the parent recordings requires grouped splitting. Current active labels do not include idle.

## Compatibility decision

**Not approved for silent canonical mixing.** Existing files fit the legacy shape and normalization assumptions, but there is insufficient evidence of detector version, mirror convention, source/signer identity and temporal acquisition equivalence. This is an unknown provenance result, not proof every legacy sequence is unusable.

A converter may mechanically remove face channels and normalize known legacy arrays, but cannot recover omitted frames, source fps, unrecorded mirroring or original handedness errors. Record that transformation as legacy conversion with unknown provenance; do not relabel it verified canonical extraction. Preferred verified path is re-extraction from identified source videos with matching Tasks assets, semantics and temporal processing. Custom collection must use the same implementation and metadata schema.

## Required formal sample contract

Future samples need label, source dataset and source recording ID/hash, signer ID or explicit unknown, stable sample ID, raw/canonical representation identifier, feature layout/version, frame count, timestamps/frame selection, detector versions/asset hashes, mirror convention and preprocessing version. Store dimensions and dtype; reject nonfinite/malformed/incompatible records. Preserve originals and conversion lineage. Source weights must be configurable and measured per class; signer-independent evaluation must remain unavailable when signer provenance is unknown.

No combined training run or compatibility claim is justified yet. The next implementation should reuse `ml/src/preprocessing` and `ml/src/data`, populate purposeful `data/` manifests, and preserve the existing directory separation.
