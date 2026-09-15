import json

with open('frontend/public/models/model.json', 'r') as f:
    data = json.load(f)

# Traverse the model topology and set all regularizers to null
layers = data.get('modelTopology', {}).get('model_config', {}).get('config', {}).get('layers', [])
for layer in layers:
    config = layer.get('config', {})
    if 'kernel_regularizer' in config:
        config['kernel_regularizer'] = None
    if 'bias_regularizer' in config:
        config['bias_regularizer'] = None

with open('frontend/public/models/model.json', 'w') as f:
    json.dump(data, f)

print("model.json fixed!")
