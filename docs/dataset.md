# Indian Sign Language dataset and provenance

The acquisition code references **INCLUDE: A Large Scale Dataset for Indian Sign Language Recognition**, hosted in [Zenodo record 4010759](https://zenodo.org/records/4010759). The repository's `zenodo_files.json` contains a metadata snapshot of that record.

## Source and license

The snapshot names Advaith Sridhar, Rohith Gandhi Ganesan, Pratyush Kumar and Mitesh Khapra as dataset creators and records CC BY 4.0. Consult the original record and attribution requirements before downloading or redistributing material. This dataset license does not license Sanket's code, model weights or independently collected clips.

The related publication is [INCLUDE, ACM Multimedia 2020](https://doi.org/10.1145/3394171.3413528). This is the dataset publication's DOI, not a Sanket project DOI or a Sanket benchmark.

## What Sanket actually uses

`download_and_extract.py` downloads/extracts source archives and creates landmark sequences. `phase3_process_include.py` reads class directories beneath `islmodel/ProcessedData_vivit`. Other scripts support webcam collection and YouTube search/download. Their existence does not establish the provenance or redistribution rights of every training sample.

The exact training-source inventory, signer demographics, number of original recordings used, resolution and frame-rate distribution are unverified. The shipped model has 263 output labels; that count is not a verified count of the source dataset's signs or Sanket's independently validated vocabulary.

## Preprocessing and augmentation

Extraction produces 30 sampled frames for each processed sequence. The trainer normalizes x/y relative to the nose and shoulder distance and removes face features. It uses the original sequence plus seven variants: light and heavy jitter, boundary trimming, scaling, temporal warping, mirroring, and combined jitter/scaling.

## Train, validation and test partitions

The current trainer randomly assigns 10% of the augmented examples to a held-out partition, attempting stratification and falling back to an unstratified split. That partition serves both validation and final reporting. It does not load the official dataset train/test CSVs. Augmentation before splitting risks related-example leakage.

Before publishing new results, retain source-video identifiers, split by original recording and signer before augmentation, and reserve an untouched test set. See [preprocessing](preprocessing.md), [model](model.md), [research](research.md) and [limitations](limitations.md).

## Source evidence

- [zenodo_files.json](../zenodo_files.json)
- [download_and_extract.py](../download_and_extract.py)
- [phase3_process_include.py](../phase3_process_include.py)
- [phase2_train_lstm.py](../phase2_train_lstm.py)
