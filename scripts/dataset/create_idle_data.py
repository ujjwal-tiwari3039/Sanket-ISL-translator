"""Optional synthetic idle data from canonical samples; retain parent split groups."""
import argparse
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from ml.src.data.dataset import load_dataset,save_sample


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dataset',type=Path)
    parser.add_argument('--output',type=Path,default=Path('data/processed/synthetic-idle'))
    parser.add_argument('--samples',type=int,default=50)
    parser.add_argument('--seed',type=int,default=42)
    args=parser.parse_args()
    if args.samples<1:parser.error('samples must be positive')
    rows=load_dataset([args.dataset]);rng=np.random.default_rng(args.seed)
    for i in range(args.samples):
        features,metadata,_=rows[int(rng.integers(len(rows)))]
        candidates=features[np.any(features[:,:132],axis=1)]
        if not len(candidates):continue
        frames=np.repeat(candidates[:1],30,axis=0)
        if i%3==0:frames[:,132:]=0
        elif i%3==2:
            # Jitter XYZ only in observed hands, never visibility or missing slots.
            hand=frames[:,132:];mask=hand!=0;hand[mask]+=rng.normal(0,.005,hand.shape)[mask]
        print(save_sample(args.output,frames,label='idle',source='synthetic-idle',
            recording_id=metadata['recording_id'],signer_id=metadata['signer_id'],extraction=metadata['extraction']))


if __name__=='__main__':main()
