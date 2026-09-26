"""Evaluation of a fixed test partition; scores never substitute for source provenance."""
from pathlib import Path
import json
import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score


def metrics(y_true, scores, labels):
    scores = np.asarray(scores)
    if scores.shape != (len(y_true), len(labels)) or not np.isfinite(scores).all():
        raise ValueError('Invalid prediction scores/label dimensions')
    predicted = scores.argmax(axis=1)
    report = classification_report(y_true, predicted, labels=np.arange(len(labels)),
                                   target_names=labels, output_dict=True, zero_division=0)
    return dict(samples=len(y_true), accuracy=float(accuracy_score(y_true, predicted)),
                top1_accuracy=float(accuracy_score(y_true, predicted)),
                top3_accuracy=float(np.mean([target in top for target, top in zip(y_true, np.argsort(scores, axis=1)[:, -min(3,len(labels)):])])),
                macro_f1=float(f1_score(y_true,predicted,labels=np.arange(len(labels)),average='macro',zero_division=0)),
                weighted_f1=float(f1_score(y_true,predicted,average='weighted',zero_division=0)), per_class=report)


def write_evaluation(output, y_true, scores, labels, metadata, split_method):
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    result = metrics(y_true, scores, labels)
    result['evaluation_scope'] = split_method
    result['source_wise'] = {}
    for source in sorted({m['source'] for m in metadata}):
        indices = [i for i,m in enumerate(metadata) if m['source'] == source]
        result['source_wise'][source] = metrics(np.asarray(y_true)[indices], scores[indices], labels)
    (output / 'metrics.json').write_text(json.dumps(result, indent=2)+'\n')
    matrix = confusion_matrix(y_true, scores.argmax(axis=1), labels=np.arange(len(labels)))
    np.savetxt(output / 'confusion_matrix.csv', matrix, delimiter=',', fmt='%d')
    (output / 'labels.json').write_text(json.dumps(labels, indent=2)+'\n')
    (output / 'evaluation_report.md').write_text(
        f'# Evaluation\n\nScope: {split_method}.\n\nTest samples: {len(y_true)}. '
        f'Top-1: {result["accuracy"]:.4f}; top-3: {result["top3_accuracy"]:.4f}; '
        f'macro F1: {result["macro_f1"]:.4f}; weighted F1: {result["weighted_f1"]:.4f}.\n\n'
        'Confusion matrix rows are true labels, columns predicted labels, in labels.json order. '
        'Presegmented samples do not establish live camera or unknown-sign performance.\n')
    return result


def threshold_report(y_true, scores):
    ranked = np.sort(scores, axis=1)
    top = ranked[:, -1]; margin = top - ranked[:, -2] if scores.shape[1] > 1 else top
    correct = scores.argmax(axis=1) == y_true
    return [dict(confidence=threshold, margin=gap, accepted=int(np.sum(accepted)),
                 coverage=float(np.mean(accepted)),
                 selective_accuracy=float(np.mean(correct[accepted])) if accepted.any() else None)
            for threshold in (.4,.5,.6,.7,.8,.9) for gap in (0.,.1,.2)
            for accepted in [(top > threshold) & (margin >= gap)]]


def confidence_statistics(y_true, scores):
    """Descriptive validation statistics; never chooses a deployment threshold."""
    scores = np.asarray(scores, dtype=float)
    y_true = np.asarray(y_true)
    if scores.ndim != 2 or not len(scores) or scores.shape[1] < 2 or y_true.shape != (len(scores),):
        raise ValueError('Expected nonempty multiclass validation scores and targets')
    if not np.isfinite(scores).all() or (scores < 0).any() or (scores > 1).any() or not np.allclose(scores.sum(axis=1),1,atol=1e-5):
        raise ValueError('Expected finite class probabilities')
    if not np.issubdtype(y_true.dtype,np.integer) or (y_true < 0).any() or (y_true >= scores.shape[1]).any():
        raise ValueError('Invalid validation targets')
    ranked=np.sort(scores,axis=1)
    correct=scores.argmax(axis=1)==y_true
    def describe(values):
        return dict(count=len(values), mean=float(values.mean()) if len(values) else None,
                    quantiles=dict(zip(('min','p25','median','p75','max'),np.quantile(values,[0,.25,.5,.75,1]).tolist())) if len(values) else None)
    return dict(samples=len(scores), selection='No threshold selected; validation provenance and unknown-sign coverage require review',
                groups={name:dict(confidence=describe(ranked[mask,-1]),margin=describe((ranked[:,-1]-ranked[:,-2])[mask]))
                        for name,mask in [('correct',correct),('incorrect',~correct)]},
                thresholds=threshold_report(y_true,scores))
