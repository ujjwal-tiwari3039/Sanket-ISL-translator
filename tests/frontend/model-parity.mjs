import fs from 'node:fs';
import path from 'node:path';
import * as tf from '../../apps/frontend/node_modules/@tensorflow/tfjs/dist/tf.node.js';
const directory = process.argv[2] || 'apps/frontend/public/models';
const spec = JSON.parse(fs.readFileSync(path.join(directory,'model.json')));
const labels = JSON.parse(fs.readFileSync(path.join(directory,'labels.json')));
const data = Buffer.concat(spec.weightsManifest.flatMap(g=>g.paths.map(p=>fs.readFileSync(path.join(directory,p)))));
const model = await tf.loadLayersModel(tf.io.fromMemory({modelTopology:spec.modelTopology,
  weightSpecs:spec.weightsManifest.flatMap(g=>g.weights),weightData:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}));
if (model.inputs[0].shape[1] !== 30 || model.inputs[0].shape[2] !== 258 || model.outputs[0].shape[1] !== Object.keys(labels).length) throw new Error('Model/label shape mismatch');
const values = JSON.parse(fs.readFileSync(0,'utf8'));
const input = tf.tensor3d(values);const prediction=model.predict(input);
process.stdout.write(JSON.stringify(Array.from(await prediction.data())));
input.dispose();prediction.dispose();model.dispose();
