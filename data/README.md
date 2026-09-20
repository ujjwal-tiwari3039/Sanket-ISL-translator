# Data

Training datasets for Sanket ISL Translator are **not committed to this repository**.

## What is tracked here

```text
data/
├── manifests/   Future: dataset manifests, checksums, split definitions
├── samples/     Future: small verified reference samples
└── README.md    This file
```

## What is NOT tracked

- `MP_Data/` — primary training keypoint sequences (gitignored; large)
- `MP_Data_old_224/` — historical 224-resolution variant (rights/maintenance status under review)
- `downloaded_files/` — source video archives (gitignored)
- `Raw_Videos/` — raw source video (gitignored)

## Dataset Provenance

The primary training data derives from the [INCLUDE dataset](https://zenodo.org/record/4010759). Dataset rights and redistribution review is pending. See [dataset documentation](../docs/dataset.md) for provenance details and limitations.

## Acquiring Data

Use `scripts/dataset/download_and_extract.py` to download and extract source archives. Ensure you have the right to use and process the data under applicable licensing terms before training.
