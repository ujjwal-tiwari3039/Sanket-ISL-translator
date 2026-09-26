# Indian Sign Language dataset and provenance

The acquisition code references **INCLUDE: A Large Scale Dataset for Indian Sign Language Recognition**, hosted in [Zenodo record 4010759](https://zenodo.org/records/4010759). The repository's `zenodo_files.json` contains a metadata snapshot of that record.

## Source and license

The snapshot names Advaith Sridhar, Rohith Gandhi Ganesan, Pratyush Kumar and Mitesh Khapra as dataset creators and records CC BY 4.0. Consult the original record and attribution requirements before downloading or redistributing material. This dataset license does not license Sanket's code, model weights or independently collected clips.

The related publication is [INCLUDE, ACM Multimedia 2020](https://doi.org/10.1145/3394171.3413528). This is the dataset publication's DOI, not a Sanket project DOI or a Sanket benchmark.

## Current data pipeline

`ml/src/data/process_include.py` re-extracts label-directory videos through the same canonical detector and preprocessing as custom collection. The downloader delegates to it. Each normalized NPZ records source, recording identity, signer (or unknown), timestamps, model hashes and schema versions. See [custom dataset instructions](custom-dataset.md).

The local legacy inventory has 3,679 sequences / 263 classes; the historical tracked `MP_Data_old_224` has 1,216 sequences / 77 classes. Legacy NPY shape is valid, but extraction/signer/mirroring provenance is unknown. Historical files are retained. Explicit conversion does not certify them; verified INCLUDE/custom mixing requires one matching extraction profile.

The new trainer groups original recordings, duplicates and known signers before augmentation and reserves validation/test partitions. It does not implement the official INCLUDE split automatically. Source-wise metrics are engineering results for the recorded manifest, not official benchmark claims. The old .98 report remains compromised by its legacy split methodology.

See [audit](audit/data-audit.md), [validation](audit/dataset-validation.md), [training](training.md) and [evaluation](evaluation.md).
