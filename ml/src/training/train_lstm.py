"""Train candidate models from versioned canonical samples; never overwrite deployment."""
from ml.src.evaluation.evaluate import confidence_statistics
import argparse
import json
import importlib.metadata
import platform
import os
from pathlib import Path
import numpy as np
from ml.src.data.dataset import load_dataset
from .dataset_split import split_records, augment_training, sample_weights
from ml.src.evaluation.evaluate import write_evaluation, threshold_report
from ml.src.preprocessing.landmark_schema import SCHEMA_VERSION, PREPROCESSING_VERSION, SEQUENCE_VERSION


def export_tfjs(model, labels, output):
    """Export this Sequential LSTM architecture directly in TFJS layers format.

    Keras weight.path supplies canonical layer/tensor names; TFJS smoke/parity tests
    verify the exported layout. No optional Decision Forests module spoofing.
    """
    output.mkdir(parents=True, exist_ok=False)
    config = json.loads(model.to_json())
    for layer in config['config']['layers']:
        cfg = layer['config']
        if 'batch_shape' in cfg:
            cfg['batch_input_shape'] = cfg.pop('batch_shape')
        if isinstance(cfg.get('dtype'), dict):
            cfg['dtype'] = cfg['dtype']['config']['name']
    weights, chunks = [], []
    for layer in model.layers:
        for weight in layer.weights:
            array = np.asarray(weight.numpy(), dtype='<f4')
            # Recurrent cell is an implementation detail, not part of TFJS weight names.
            kind = weight.name.split('/')[-1].split(':')[0]
            weights.append(dict(name=f'{layer.name}/{kind}', shape=list(array.shape), dtype='float32'))
            chunks.append(array.tobytes())
    topology = dict(keras_version=__import__('keras').__version__, backend='tensorflow', model_config=config)
    manifest = dict(format='layers-model', generatedBy='Sanket Sequential exporter v1',
                    modelTopology=topology,
                    weightsManifest=[dict(paths=['group1-shard1of1.bin'], weights=weights)])
    (output / 'group1-shard1of1.bin').write_bytes(b''.join(chunks))
    (output / 'model.json').write_text(json.dumps(manifest))
    (output / 'labels.json').write_text(json.dumps(dict(enumerate(labels)), indent=2)+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('datasets', nargs='+', type=Path)
    parser.add_argument('--output', type=Path, required=True, help='New candidate directory; must not exist')
    parser.add_argument('--allow-legacy', action='store_true')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--epochs', type=int, default=120)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--include-weight', type=float, default=1.)
    parser.add_argument('--custom-weight', type=float, default=1.)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Output already exists; use a new candidate directory')
    if args.epochs < 1 or args.batch_size < 1:
        parser.error('epochs and batch-size must be positive')
    os.environ.setdefault('TF_NUM_INTRAOP_THREADS', '2')
    os.environ.setdefault('TF_NUM_INTEROP_THREADS', '2')
    import tensorflow as tf
    tf.keras.utils.set_random_seed(args.seed)
    tf.config.experimental.enable_op_determinism()
    rows = load_dataset(args.datasets, allow_legacy=args.allow_legacy)
    labels = sorted({row[1]['label'] for row in rows})
    if len(labels) < 2:
        raise ValueError('Need at least two classes')
    label_map = {label:i for i,label in enumerate(labels)}
    splits = split_records(rows, args.seed)
    arrays = {}
    for name, indices in splits.items():
        arrays[name] = (np.stack([rows[i][0] for i in indices]),
                        np.array([label_map[rows[i][1]['label']] for i in indices]))
    x, y = arrays['train']
    weights = sample_weights([rows[i][1] for i in splits['train']], args.include_weight, args.custom_weight)
    # Augmented descendants exist ONLY within training, after grouping/splitting.
    x_train = np.concatenate([x, augment_training(x, args.seed)])
    y_train = np.concatenate([y, y])
    weights = np.concatenate([weights, weights])
    args.output.mkdir(parents=True, exist_ok=False)
    manifest = {name:[dict(path=rows[i][2], **rows[i][1]) for i in indices] for name,indices in splits.items()}
    (args.output / 'split_manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    metadata = dict(schema_version=SCHEMA_VERSION, preprocessing_version=PREPROCESSING_VERSION,
                    sequence_version=SEQUENCE_VERSION, labels=labels, seed=args.seed,
                    epochs=args.epochs, batch_size=args.batch_size, python_version=platform.python_version(),
                    package_versions={name:importlib.metadata.version(name) for name in ('numpy','tensorflow','keras','scikit-learn')},
                    extraction=rows[0][1]['extraction'], include_weight=args.include_weight, custom_weight=args.custom_weight)
    (args.output / 'metadata.json').write_text(json.dumps(metadata, indent=2)+'\n')
    layers = tf.keras.layers
    model = tf.keras.Sequential([
        layers.Input((30,258)), layers.LSTM(64, return_sequences=True), layers.Dropout(.4),
        layers.LSTM(128, return_sequences=True), layers.Dropout(.4), layers.LSTM(64),
        layers.Dense(64, activation='relu'), layers.Dropout(.4), layers.Dense(32, activation='relu'),
        layers.Dense(len(labels), activation='softmax')])
    model.compile(optimizer=tf.keras.optimizers.Adam(.0005, clipnorm=1.),
                  loss='sparse_categorical_crossentropy', metrics=['sparse_categorical_accuracy'])
    def dataset(features, targets, weights=None, shuffle=False):
        values = (features,targets) if weights is None else (features,targets,weights)
        ds = tf.data.Dataset.from_tensor_slices(values)
        if shuffle:
            ds = ds.shuffle(len(features), seed=args.seed)
        options = tf.data.Options(); options.threading.private_threadpool_size = 2
        return ds.batch(args.batch_size).with_options(options)
    history = model.fit(dataset(x_train,y_train,weights,True), epochs=args.epochs,
        validation_data=dataset(*arrays['validation']), callbacks=[
            tf.keras.callbacks.ModelCheckpoint(str(args.output/'best.keras'), monitor='val_loss', save_best_only=True),
            tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=25, restore_best_weights=True)], shuffle=False, verbose=2)
    # Match the checkpoint even when a short run never triggers EarlyStopping.
    model = tf.keras.models.load_model(args.output/'best.keras')
    (args.output/'history.json').write_text(json.dumps(history.history, indent=2)+'\n')
    (args.output/'labels.json').write_text(json.dumps(dict(enumerate(labels)), indent=2)+'\n')
    export_tfjs(model, labels, args.output/'tfjs')
    def predict(features):
        return np.concatenate([model(features[i:i+args.batch_size], training=False).numpy()
                               for i in range(0,len(features),args.batch_size)])
    validation_scores = predict(arrays['validation'][0])
    evaluation = args.output/'evaluation'; evaluation.mkdir()
    (evaluation/'confidence_statistics.json').write_text(json.dumps(confidence_statistics(arrays['validation'][1], validation_scores), indent=2)+'\n')
    (evaluation/'validation_thresholds.json').write_text(json.dumps(threshold_report(arrays['validation'][1], validation_scores), indent=2)+'\n')
    known_signers = all(row[1]['signer_id'] for row in rows)
    scope = 'signer-grouped held-out samples' if known_signers else 'recording/duplicate-grouped held-out samples; signer independence NOT established'
    if args.allow_legacy:
        scope += '; legacy extraction provenance unknown'
    result = write_evaluation(evaluation, arrays['test'][1], predict(arrays['test'][0]), labels,
                             [rows[i][1] for i in splits['test']], scope)
    print(json.dumps({k:result[k] for k in ('samples','accuracy','macro_f1','top3_accuracy')}, indent=2))


if __name__ == '__main__':
    main()
