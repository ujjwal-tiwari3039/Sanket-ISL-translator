# Landmark data

Canonical custom and INCLUDE samples are local NPZ files under `data/custom` and `data/include`, with normalized `(30,258)` features and validated metadata. See [collection and conversion](../docs/custom-dataset.md).

`data/processed/legacy` is an explicit conversion destination with unknown extraction provenance. Do not mix it with verified canonical extraction. Original `MP_Data` remains local ignored data; `MP_Data_old_224` includes historical files already tracked by Git. Ignore patterns do not remove tracked files.

The pipeline creates only directories it uses. No source dataset or signer metadata was fabricated. Generated samples should be kept out of version control; share only approved fixtures and aggregate reports.
