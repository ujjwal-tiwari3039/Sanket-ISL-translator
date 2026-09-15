import re

with open("phase2_train_lstm.py", "r") as f:
    content = f.read()

# Add regularizer stripping to the json post-processing
patch = """
        for layer in mj.get('modelTopology', {}).get('model_config', {}).get('config', {}).get('layers', []):
            if layer.get('class_name') == 'InputLayer':
                cfg = layer.get('config', {})
                if 'batch_shape' in cfg:
                    cfg['batch_input_shape'] = cfg['batch_shape']
                    cfg['batchInputShape'] = cfg['batch_shape']
            # Strip regularizers for TFJS compatibility
            cfg = layer.get('config', {})
            if 'kernel_regularizer' in cfg:
                cfg['kernel_regularizer'] = None
"""

content = re.sub(
    r"        for layer in mj\.get\('modelTopology', \{\}\)\.get\('model_config', \{\}\)\.get\('config', \{\}\)\.get\('layers', \[\]\):\n            if layer\.get\('class_name'\) == 'InputLayer':\n                cfg = layer\.get\('config', \{\}\)\n                if 'batch_shape' in cfg:\n                    cfg\['batch_input_shape'\] = cfg\['batch_shape'\]\n                    cfg\['batchInputShape'\] = cfg\['batch_shape'\]",
    patch, content)

with open("phase2_train_lstm.py", "w") as f:
    f.write(content)

print("Export script patched!")
