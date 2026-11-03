"""Fixed-size copies of RVM for vj-matte: one each for landscape, portrait and square clips.

RVM's ONNX file leaves its frame size and the coarse pass's scale open until it runs, so ONNX Runtime has to work its
shapes out on every frame, and CoreML (and other GPU back ends) cannot compile the parts that depend on them and hand
them back to the CPU. Fixing the size and the scale lets every shape be worked out once, here: the same model, the
same matte, about twice as fast on a Mac's GPU and several times faster on a CPU.

    pip install onnx onnxruntime onnxsim numpy
    python tools/freeze.py [models/rvm_mobilenetv3_fp32.onnx]

writes models/rvm_landscape.onnx, rvm_portrait.onnx and rvm_square.onnx beside the original.
"""

import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import onnxsim
from onnx import numpy_helper

# width x height, both multiples of 32; vj-matte pads each frame to the one for its shape
SIZES = {"landscape": (960, 544), "portrait": (544, 960), "square": (768, 768)}


def freeze(src: Path, out: Path, w: int, h: int) -> None:
    # RVM's own advice: the coarse pass at about 512 px, as vj-matte does with the original model
    ratio = min(512 / max(w, h), 1.0)
    # the recurrent state's shapes at this size, from one run
    s = ort.InferenceSession(str(src), providers=["CPUExecutionProvider"])
    z = np.zeros((1, 1, 1, 1), np.float32)
    feed = {"src": np.zeros((1, 3, h, w), np.float32), "r1i": z, "r2i": z, "r3i": z, "r4i": z,
            "downsample_ratio": np.array([ratio], np.float32)}
    outs = dict(zip([o.name for o in s.get_outputs()], s.run(None, feed)))
    shapes = {"src": [1, 3, h, w], **{f"r{i}i": list(outs[f"r{i}o"].shape) for i in range(1, 5)}}

    m = onnx.load(str(src))
    # the scale becomes a constant
    m.graph.initializer.append(numpy_helper.from_array(np.array([ratio], np.float32), "downsample_ratio"))
    keep = [i for i in m.graph.input if i.name != "downsample_ratio"]
    del m.graph.input[:]
    m.graph.input.extend(keep)
    for i in m.graph.input:
        dims = i.type.tensor_type.shape.dim
        for k, v in enumerate(shapes[i.name]):
            dims[k].ClearField("dim_param")
            dims[k].dim_value = v
    # every shape worked out and folded in
    m, ok = onnxsim.simplify(m)
    if not ok:
        sys.exit(f"could not check {out.name}")
    onnx.save(m, str(out))
    print(f"{out.name}: {w}x{h}, coarse pass x{ratio:.3f}")


if __name__ == "__main__":
    src = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent.parent / "models" / "rvm_mobilenetv3_fp32.onnx")
    for name, (w, h) in SIZES.items():
        freeze(src, src.parent / f"rvm_{name}.onnx", w, h)
