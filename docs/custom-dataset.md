# Custom landmark dataset

Run commands from the repository root using Python 3.11 with `ml/requirements.txt` installed. No frame data is uploaded by the collector.

```bash
python -m ml.src.data.data_collection --camera 0 --label hello --samples 100 --signer-id signer-01
```

Press R to start a take, perform one complete sign, and press R to stop. Q exits. Collect at least 20 sampled frames per take; takes over 300 frames are rejected. The preview is mirrored, but detector pixels are unmirrored. Use consistent framing, visible shoulders and hands, varied recordings and stable pseudonymous signer IDs. The collector rejects malformed, handless or poseless samples and never overwrites numbered takes. Recording order is not a signer ID.

Both custom recordings and re-extracted INCLUDE videos use `LandmarkExtractor`, the [canonical schema](landmark-schema.md), normalization and resampling. Each saved NPZ contains only:

- `features`: float32 `(30,258)`, already normalized. Do not normalize again.
- `metadata`: JSON string, parsed with no pickle, describing the label, sample UUID, dataset source, recording ID, signer ID (null if unknown), input timestamps/count, extraction settings and model hashes, schema/preprocessing/sequence versions, output dimensions and feature checksum.

Default output is `data/custom`. Metadata is validated when saving and loading. Samples with different extraction profiles are not silently mixed. Store signer IDs consistently across sources if the same person contributes to both.

## INCLUDE re-extraction

Supply original videos grouped into label directories:

```bash
python -m ml.src.data.process_include --videos /path/to/include/videos --output data/include
python -m ml.src.data.validate_dataset data/include data/custom
```

Both collection and video processing sample at most every 66 ms, use VIDEO tracking, retain the complete captured segment and interpolate normalized features to 30 frames. Video fps must be valid. Source video SHA-256 becomes recording identity. Specify `--signer-id` only if every video processed by that invocation shares the known signer. Missing signer information prevents a signer-independent claim.

The automatic downloader now delegates extraction to this same implementation. Existing `completed_zips.txt` from legacy extraction is not reused as canonical completion evidence. Interrupted re-extraction may create duplicate samples; validate and keep duplicate/source groups together when splitting.

## Existing NPY data

Raw legacy `MP_Data` is 1692-wide, not canonical dataset storage. Its detector version, mirroring and signer history cannot be reconstructed from shape. Re-extraction is preferred. For explicitly labeled legacy experiments:

```bash
python -m ml.src.data.convert_legacy --input MP_Data --output data/processed/legacy --acknowledge-unknown-provenance
python -m ml.src.data.validate_dataset data/processed/legacy
```

This conversion trims face features and normalizes; it records `legacy-unknown` provenance. Training requires `--allow-legacy` and still refuses to mix that profile with newly extracted data. Conversion does not repair historical hand swaps or lost frame timing. Original NPYs are retained.
