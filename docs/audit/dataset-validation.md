# Dataset validation results

Command: `venv/bin/python -m ml.src.data.validate_dataset MP_Data --legacy`.

Result: 3,679 samples, 263 classes, zero structural/finite/visibility errors and zero exact duplicate normalized sequence groups. Full output: `models/evaluation/dataset_report.json`. Missing pose/hand counts and class distribution are recorded there. This report does not establish signer identity, extraction version, anatomical handedness or semantic label correctness.

The validator checks dimensions, frame counts, finite values, metadata/checksums, labels, source/profile consistency, exact duplicates and contradictory duplicate labels. Pose visibility outside [0,1] is an error; normalized coordinate magnitude above 100 is flagged for inspection rather than incorrectly constraining normalized XY to [0,1]. Anatomical left/right correctness cannot be recovered from arbitrary vectors without source footage.

Real retained video checks: `happy_MVI_5263.MOV` and `year_MVI_4637.MOV` successfully produced canonical `(30,258)` NPZ samples in a temporary directory. `deaf_MVI_9851.MOV` produced no usable hand observations and was rejected, as required. These clips are engineering checks, not an independent evaluation set.
