# vj-matte

Person mattes for any clip with [Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting) (Lin et al.,
2021), run through ONNX Runtime with the [`ort`](https://crates.io/crates/ort) crate. RVM remembers the frames before
each frame, so the matte holds steady and keeps soft edges (hair, motion blur). It uses CoreML on a Mac, DirectML on
Windows and, on Linux, WebGPU or CUDA when built with them (the CPU otherwise); ffmpeg decodes and encodes.

`plugins/vj/tools/matte.mjs` runs it when it is built, for `<PopArt>` and anything else that takes a matte.

## Build

```sh
cd plugins/vj/matte
mkdir -p models
curl -L -o models/rvm_mobilenetv3_fp32.onnx \
  https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx
cargo build --release
```

On Linux, pick a GPU when building (one or the other, as ONNX Runtime's prebuilt libraries come with one):

```sh
cargo build --release --features webgpu   # any GPU, over Vulkan
cargo build --release --features cuda     # NVIDIA, with CUDA 13 and cuDNN installed
```

A WebGPU build times a few frames on the GPU and on the CPU when it starts and keeps the faster, so a weak GPU never
makes it slower than the CPU (WebGPU on an M4 is slower than its CPU). Plain `cargo build --release` runs on the CPU.

Then make the fixed-size models, once (Python 3.10 or later):

```sh
pip install onnx onnxruntime onnxsim numpy
python tools/freeze.py
```

This writes `models/rvm_landscape.onnx` (960x544), `rvm_portrait.onnx` (544x960) and `rvm_square.onnx` (768x768).
RVM's own file leaves its frame size open until it runs, so ONNX Runtime works its shapes out on every frame and GPU
back ends hand most of it to the CPU; with the size fixed, every shape is worked out once. vj-matte picks the one for
the clip's shape and pads each frame to fit. Without them it falls back to the original file, about 2.4 times slower.

`ort` downloads a prebuilt ONNX Runtime while building. On macOS the build links clang's runtime (`build.rs`) and
targets macOS 13.4 (`.cargo/config.toml`), as that prebuilt runtime needs.

## Run

```sh
target/release/vj-matte --in clip.mp4 --out matte.mp4 --track person.json
```

- `--jobs` (default 2): pieces of the clip matted at once, each on its own copy of the model. Each piece starts 24
  frames early so RVM's memory has settled before the frames it keeps (the first piece runs its own first 24 frames
  backwards, so frame 0 has no holes); the pieces are joined without encoding them again.
- `--cpu`: the CPU only.
- `--model`: another RVM ONNX file. `--work` (default 960) is the width the original, open-size file sees.
- `--size` (default 1920x1080): the space the track is written in.

A 12 s 1080p clip takes about 15 s on an M4 Mac with the fixed-size models (31 s with the original file).

## Licence

GPL-3.0-only (`LICENSE`), as RVM is. vj-matte is a separate program: the rest of `@kinetographdev/vj` (MIT) only runs
it and reads the matte video and track it writes, and those files are not covered by the GPL.
