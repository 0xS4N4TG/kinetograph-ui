//! vj-matte: a person matte for any clip, with Robust Video Matting (RVM, Lin et al. 2021) run through ONNX Runtime.
//! RVM carries a memory of the frames before into each frame, so the matte holds steady from frame to frame and keeps
//! soft edges (hair, motion blur). ffmpeg decodes the clip and encodes the matte; nothing else is needed.
//!
//!   vj-matte --in clip.mp4 --out matte.mp4 [--track person.json] [--model rvm.onnx] [--jobs 2] [--cpu]
//!            [--work 960] [--size 1920x1080]
//!
//! --model  an RVM ONNX file. By default the fixed-size model for the clip's shape (models/rvm_landscape.onnx,
//!          rvm_portrait.onnx or rvm_square.onnx, made by tools/freeze.py, see README.md), else the original
//!          models/rvm_mobilenetv3_fp32.onnx.
//! --jobs   pieces of the clip matted at once, each on its own copy of the model. Each piece starts WARM frames early
//!          (the first on its own first frames run backwards) so RVM's memory has settled before its first frame is
//!          kept. Default 2.
//! --cpu    the CPU only, no GPU or neural engine. On Linux the GPU is WebGPU or CUDA, when built with
//!          `--features webgpu` or `--features cuda`.
//! --work   width the original model sees (the height follows the clip). A fixed-size model sets its own size.
//! --size   the space the track is written in (the clip covering it). Default 1920x1080, the space <PopArt> draws in.
//!
//! The matte is grey (white = person) at the clip's size and rate. The track is { fps, width, height, points:
//! [[x, y], ...] }: the matte's centroid per frame, smoothed over nine frames (tools/track.mjs's format).
//!
//! Licensed GPL-3.0-only, as RVM is. It is a separate program: the vj plugin only runs it and reads the files it
//! writes.

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use ort::session::Session;
use ort::value::Tensor;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

/// Frames run before each piece's first kept frame, to settle RVM's memory: the frames before it, or for the clip's
/// first piece its own first frames run backwards.
const WARM: usize = 24;

struct Args {
    input: String,
    output: String,
    track: Option<String>,
    model: Option<String>,
    jobs: usize,
    cpu: bool,
    work: u32,
    size: (u32, u32),
}

fn args() -> Result<Args> {
    let mut a = std::env::args().skip(1);
    let (mut input, mut output, mut track, mut model, mut jobs, mut cpu, mut work, mut size) = (None, None, None, None, 2, false, 960, (1920, 1080));
    while let Some(k) = a.next() {
        if k == "--cpu" {
            cpu = true;
            continue;
        }
        let mut v = || a.next().ok_or_else(|| format!("{k} needs a value"));
        match k.as_str() {
            "--in" => input = Some(v()?),
            "--out" => output = Some(v()?),
            "--track" => track = Some(v()?),
            "--model" => model = Some(v()?),
            "--jobs" => jobs = v()?.parse::<usize>()?.max(1),
            "--work" => work = v()?.parse()?,
            "--size" => {
                let s = v()?;
                let (w, h) = s.split_once('x').ok_or("--size is WxH")?;
                size = (w.parse()?, h.parse()?);
            }
            _ => return Err(format!("unknown argument {k}").into()),
        }
    }
    Ok(Args {
        input: input.ok_or("usage: vj-matte --in clip.mp4 --out matte.mp4 [--track person.json] [--model rvm.onnx] [--jobs 2] [--cpu] [--work 960] [--size 1920x1080]")?,
        output: output.ok_or("--out is needed")?,
        track,
        model,
        jobs,
        cpu,
        work,
        size,
    })
}

/// The clip's size, frame rate and frame count, from ffprobe.
fn probe(path: &str) -> Result<(u32, u32, String, usize)> {
    let out = Command::new("ffprobe")
        .args(["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=width,height,r_frame_rate,nb_read_packets", "-of", "csv=p=0", path])
        .output()?;
    if !out.status.success() {
        return Err(format!("ffprobe cannot read {path}").into());
    }
    let s = String::from_utf8(out.stdout)?;
    let f: Vec<&str> = s.trim().split(',').collect();
    Ok((f[0].parse()?, f[1].parse()?, f[2].to_string(), f[3].parse()?))
}

/// One model session: CoreML on a Mac and DirectML on Windows when there is one, the CPU otherwise.
/// Whether this build can reach a GPU: CoreML on a Mac, DirectML on Windows, WebGPU or CUDA on Linux when built with
/// them.
const GPU: bool = cfg!(any(target_os = "macos", target_os = "windows", feature = "webgpu", feature = "cuda"));

fn session(env: &ort::environment::Environment, model: &Path, gpu: bool, threads: usize) -> Result<Session> {
    // the builder's errors carry the builder, which cannot cross threads: keep only their message
    let msg = |e: ort::Error<ort::session::builder::SessionBuilder>| e.to_string();
    let mut b = Session::builder(env)?.with_intra_threads(threads).map_err(msg)?;
    if gpu {
        #[cfg(target_os = "macos")]
        {
            // the ML Program format on the GPU: the fastest of CoreML's choices for RVM, once its shapes are fixed
            use ort::ep::coreml::{ComputeUnits, ModelFormat};
            let ep = ort::ep::CoreML::default().with_model_format(ModelFormat::MLProgram).with_compute_units(ComputeUnits::CPUAndGPU);
            b = b.with_execution_providers([ep.build()]).map_err(msg)?;
        }
        #[cfg(target_os = "windows")]
        {
            b = b.with_execution_providers([ort::ep::DirectML::default().build()]).map_err(msg)?;
        }
        #[cfg(all(target_os = "linux", feature = "cuda"))]
        {
            b = b.with_execution_providers([ort::ep::CUDA::default().build()]).map_err(msg)?;
        }
        #[cfg(all(target_os = "linux", feature = "webgpu"))]
        {
            b = b.with_execution_providers([ort::ep::WebGPU::default().build()]).map_err(msg)?;
        }
    }
    Ok(b.commit_from_file(model)?)
}

/// How a frame fits the model: the model's frame (mw x mh), the picture inside it (fw x fh) at (px, py), the rest
/// padded black. The original model has no fixed size, so its frame is the picture.
#[derive(Clone, Copy)]
struct Fit {
    mw: u32,
    mh: u32,
    fw: u32,
    fh: u32,
    px: u32,
    py: u32,
    /// the original model: it takes the coarse pass's scale as an input
    ratio: Option<f32>,
}

fn fit(s: &Session, cw: u32, ch: u32, work: u32) -> Fit {
    let src = s.inputs().iter().find(|i| i.name() == "src").and_then(|i| i.dtype().tensor_shape()).map(|s| s.to_vec());
    match src {
        Some(d) if d.len() == 4 && d[2] > 0 && d[3] > 0 => {
            let (mw, mh) = (d[3] as u32, d[2] as u32);
            let k = (mw as f64 / cw as f64).min(mh as f64 / ch as f64);
            let fw = ((cw as f64 * k).round() as u32).min(mw) & !1;
            let fh = ((ch as f64 * k).round() as u32).min(mh) & !1;
            Fit { mw, mh, fw, fh, px: (mw - fw) / 2, py: (mh - fh) / 2, ratio: None }
        }
        _ => {
            // --work wide, the clip's shape, both sides even; RVM's own advice: the coarse pass at about 512 px
            let fw = work.min(cw) & !1;
            let fh = ((fw as f64 * ch as f64 / cw as f64).round() as u32) & !1;
            Fit { mw: fw, mh: fh, fw, fh, px: 0, py: 0, ratio: Some((512.0 / fw.max(fh) as f32).min(1.0)) }
        }
    }
}

/// The recurrent state before the first frame: zeros of the fixed model's shapes, or the original model's 1x1x1x1.
fn empty_state(s: &Session) -> [(Vec<i64>, Vec<f32>); 4] {
    ["r1i", "r2i", "r3i", "r4i"].map(|name| {
        let shape = s.inputs().iter().find(|i| i.name() == name).and_then(|i| i.dtype().tensor_shape()).map(|s| s.to_vec());
        match shape.filter(|s| s.iter().all(|&d| d > 0)) {
            Some(s) => {
                let n = s.iter().product::<i64>() as usize;
                (s, vec![0f32; n])
            }
            None => (vec![1, 1, 1, 1], vec![0f32]),
        }
    })
}

struct Piece {
    /// the first frame kept, and how many
    from: usize,
    count: usize,
    /// frames run before `from` and thrown away
    warm: usize,
    out: PathBuf,
}

/// Runs one frame (packed RGB at the model's size) through the model, carrying its memory in `rec`, and returns the
/// matte at the model's size.
fn step(s: &mut Session, f: Fit, rec: &mut [(Vec<i64>, Vec<f32>); 4], rgb: &[u8]) -> Result<Vec<f32>> {
    // planar RGB, 0..1
    let n = (f.mw * f.mh) as usize;
    let mut src = vec![0f32; n * 3];
    for (i, px) in rgb.chunks_exact(3).enumerate() {
        for c in 0..3 {
            src[c * n + i] = px[c] as f32 / 255.0;
        }
    }
    let mut inputs = ort::inputs![
        "src" => Tensor::from_array((vec![1i64, 3, f.mh as i64, f.mw as i64], src))?,
        "r1i" => Tensor::from_array(rec[0].clone())?,
        "r2i" => Tensor::from_array(rec[1].clone())?,
        "r3i" => Tensor::from_array(rec[2].clone())?,
        "r4i" => Tensor::from_array(rec[3].clone())?,
    ];
    if let Some(r) = f.ratio {
        inputs.push(("downsample_ratio".into(), Tensor::from_array((vec![1i64], vec![r]))?.into()));
    }
    let outputs = s.run(inputs)?;
    for (i, name) in ["r1o", "r2o", "r3o", "r4o"].iter().enumerate() {
        let (shape, data) = outputs[*name].try_extract_tensor::<f32>()?;
        rec[i] = (shape.iter().copied().collect(), data.to_vec());
    }
    Ok(outputs["pha"].try_extract_tensor::<f32>()?.1.to_vec())
}

/// Mattes one piece of the clip to `piece.out` and returns the person's centroid on each kept frame.
fn matte(a: &Args, s: &mut Session, f: Fit, cw: u32, ch: u32, rate: &str, fps: f64, piece: &Piece) -> Result<Vec<Option<(f64, f64)>>> {
    let start = piece.from - piece.warm;
    let mut decode = Command::new("ffmpeg");
    decode.args(["-v", "error"]);
    if start > 0 {
        // half a frame early, so rounding never skips the first frame wanted
        decode.args(["-ss", &format!("{:.6}", (start as f64 - 0.5) / fps)]);
    }
    let vf = format!("scale={}:{},pad={}:{}:{}:{}:black", f.fw, f.fh, f.mw, f.mh, f.px, f.py);
    let total = (piece.warm + piece.count).to_string();
    let mut decode = decode
        .args(["-i", &a.input, "-frames:v", &total, "-vf", &vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
        .stdout(Stdio::piped())
        .spawn()?;
    let out = piece.out.to_string_lossy();
    // x264's fastest preset: a matte is mostly flat, so it looks the same as the slower ones (about 55 dB apart) and
    // leaves the CPU to the model instead of taking most of it
    let mut encode = Command::new("ffmpeg")
        .args([
            "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", &format!("{}x{}", f.fw, f.fh), "-r", rate, "-i", "-",
            "-vf", &format!("scale={cw}:{ch}:flags=bicubic,format=yuv420p"), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-movflags", "+faststart",
            &out,
        ])
        .stdin(Stdio::piped())
        .spawn()?;
    let mut frames = decode.stdout.take().unwrap();
    let mut sink = encode.stdin.take().unwrap();

    let mut rec = empty_state(s);
    let (mw, mh, fw, fh) = (f.mw as usize, f.mh as usize, f.fw as usize, f.fh as usize);
    let mut grey = vec![0u8; fw * fh];
    let (tw, th) = (192usize, (192.0 * a.size.1 as f64 / a.size.0 as f64).round() as usize);
    let mut centroids = Vec::with_capacity(piece.count);
    let read = |frames: &mut std::process::ChildStdout| {
        let mut rgb = vec![0u8; mw * mh * 3];
        frames.read_exact(&mut rgb).ok().map(|_| rgb)
    };

    // the frames before the ones kept: those before `from`, or for the clip's first piece, which has none, its own
    // first frames run backwards (frame WARM down to 1), so RVM's memory has the person in it by frame 0 instead of
    // starting empty and leaving holes for the first second
    let mut kept: std::collections::VecDeque<Vec<u8>> = Default::default();
    if piece.warm > 0 {
        for _ in 0..piece.warm {
            let Some(rgb) = read(&mut frames) else { break };
            step(s, f, &mut rec, &rgb)?;
        }
    } else {
        while kept.len() <= WARM.min(piece.count - 1) {
            let Some(rgb) = read(&mut frames) else { break };
            kept.push_back(rgb);
        }
        for rgb in kept.iter().skip(1).rev() {
            step(s, f, &mut rec, rgb)?;
        }
    }

    while centroids.len() < piece.count {
        let Some(rgb) = kept.pop_front().or_else(|| read(&mut frames)) else { break };
        let pha = step(s, f, &mut rec, &rgb)?;
        // the picture's part of the model's frame, without the padding
        for y in 0..fh {
            let row = &pha[(y + f.py as usize) * mw + f.px as usize..][..fw];
            for (g, p) in grey[y * fw..][..fw].iter_mut().zip(row) {
                *g = (p.clamp(0.0, 1.0) * 255.0).round() as u8;
            }
        }
        sink.write_all(&grey)?;

        // the person's centroid in the track's space (the clip covering it), from a small copy of the matte
        let cover = (tw as f64 / fw as f64).max(th as f64 / fh as f64);
        let (ox, oy) = ((fw as f64 * cover - tw as f64) / 2.0, (fh as f64 * cover - th as f64) / 2.0);
        let (mut sx, mut sy, mut c) = (0.0, 0.0, 0.0);
        for y in 0..th {
            for x in 0..tw {
                let px = (((x as f64 + 0.5 + ox) / cover) as usize).min(fw - 1);
                let py = (((y as f64 + 0.5 + oy) / cover) as usize).min(fh - 1);
                if grey[py * fw + px] > 128 {
                    sx += x as f64 + 0.5;
                    sy += y as f64 + 0.5;
                    c += 1.0;
                }
            }
        }
        centroids.push((c > 0.0).then(|| (sx / c * a.size.0 as f64 / tw as f64, sy / c * a.size.1 as f64 / th as f64)));
    }
    drop(sink);
    drop(frames);
    decode.wait()?;
    if !encode.wait()?.success() {
        return Err("ffmpeg could not write the matte".into());
    }
    Ok(centroids)
}

/// Whether the GPU beats the CPU on this machine: a few frames on each, after two to settle (the GPU compiles its
/// work on the first). Only WebGPU is checked: it reaches any GPU, and a slow one can lose to the CPU (on an M4 it
/// does); CoreML, DirectML and CUDA win where they run.
fn gpu_faster(env: &ort::environment::Environment, model: &Path, cw: u32, ch: u32, work: u32, threads: usize) -> Result<bool> {
    let per_frame = |gpu: bool| -> Result<f64> {
        let mut s = session(env, model, gpu, threads)?;
        let f = fit(&s, cw, ch, work);
        let (mut rec, rgb) = (empty_state(&s), vec![0u8; (f.mw * f.mh * 3) as usize]);
        for _ in 0..2 {
            step(&mut s, f, &mut rec, &rgb)?;
        }
        let t = std::time::Instant::now();
        for _ in 0..4 {
            step(&mut s, f, &mut rec, &rgb)?;
        }
        Ok(t.elapsed().as_secs_f64() / 4.0)
    };
    let (g, c) = (per_frame(true)?, per_frame(false)?);
    println!("{:.0} ms a frame on the GPU, {:.0} ms on the CPU: the {}", g * 1e3, c * 1e3, if g < c { "GPU" } else { "CPU" });
    Ok(g < c)
}

/// The model to use when --model is not given: the fixed-size one for the clip's shape when it has been made.
fn default_model(cw: u32, ch: u32) -> PathBuf {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("models");
    let aspect = cw as f64 / ch as f64;
    let shape = if aspect >= 1.25 { "landscape" } else if aspect <= 0.8 { "portrait" } else { "square" };
    let fixed = dir.join(format!("rvm_{shape}.onnx"));
    if fixed.exists() { fixed } else { dir.join("rvm_mobilenetv3_fp32.onnx") }
}

/// A fresh folder for the pieces, readable by this user only. Its name is not guessable (time and pid hashed), and it is
/// made with a plain create that fails if the path exists, so a folder or link planted in the shared temp directory is
/// never written through (ffmpeg's `-y` would follow a link).
fn scratch_dir() -> Result<PathBuf> {
    use std::hash::{BuildHasher, Hasher};
    for attempt in 0..16u32 {
        let mut h = std::collections::hash_map::RandomState::new().build_hasher();
        h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
        h.write_u32(std::process::id());
        h.write_u32(attempt);
        let dir = std::env::temp_dir().join(format!("vj-matte-{:016x}", h.finish()));
        let mut b = std::fs::DirBuilder::new();
        #[cfg(unix)]
        std::os::unix::fs::DirBuilderExt::mode(&mut b, 0o700);
        match b.create(&dir) {
            Ok(()) => return Ok(dir),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e.into()),
        }
    }
    Err("could not make a scratch folder in the temp directory".into())
}

fn main() -> Result<()> {
    let a = args()?;
    let (cw, ch, rate, frames) = probe(&a.input)?;
    let (num, den) = rate.split_once('/').unwrap_or((&rate, "1"));
    let fps = num.parse::<f64>()? / den.parse::<f64>()?;
    let model = a.model.as_ref().map(PathBuf::from).unwrap_or_else(|| default_model(cw, ch));
    let started = std::time::Instant::now();

    // the clip in `jobs` even pieces, each but the first warmed on the frames before it
    let jobs = a.jobs.min(frames.div_ceil(WARM * 4)).max(1);
    let tmp = scratch_dir()?;
    let pieces: Vec<Piece> = (0..jobs)
        .map(|j| {
            let (from, to) = (frames * j / jobs, frames * (j + 1) / jobs);
            let out = if jobs == 1 { PathBuf::from(&a.output) } else { tmp.join(format!("{j}.mp4")) };
            Piece { from, count: to - from, warm: from.min(WARM), out }
        })
        .collect();

    let env = ort::init().build()?;
    let threads = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4).div_ceil(jobs);
    let gpu = GPU && !a.cpu && (!cfg!(feature = "webgpu") || gpu_faster(&env, &model, cw, ch, a.work, threads)?);
    let results: Vec<Result<Vec<Option<(f64, f64)>>>> = std::thread::scope(|scope| {
        let handles: Vec<_> = pieces
            .iter()
            .map(|p| {
                let (a, env, model) = (&a, &env, &model);
                let rate = rate.as_str();
                scope.spawn(move || -> Result<Vec<Option<(f64, f64)>>> {
                    let mut s = session(env, model, gpu, threads)?;
                    let f = fit(&s, cw, ch, a.work);
                    matte(a, &mut s, f, cw, ch, rate, fps, p)
                })
            })
            .collect();
        handles.into_iter().map(|h| h.join().unwrap_or_else(|_| Err("a piece crashed".into()))).collect()
    });
    let mut centroids = Vec::with_capacity(frames);
    for r in results {
        centroids.extend(r?);
    }

    if jobs > 1 {
        // the pieces end to end, without encoding them again
        let list = tmp.join("pieces.txt");
        std::fs::write(&list, pieces.iter().map(|p| format!("file '{}'\n", p.out.display())).collect::<String>())?;
        let ok = Command::new("ffmpeg")
            .args(["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i"])
            .arg(&list)
            .args(["-c", "copy", "-movflags", "+faststart", &a.output])
            .status()?
            .success();
        if !ok {
            return Err("ffmpeg could not join the pieces".into());
        }
    }
    let _ = std::fs::remove_dir_all(&tmp);
    println!("{} frames -> {} ({:.1} s, {} at once, {})", centroids.len(), a.output, started.elapsed().as_secs_f64(), jobs, model.display());

    if let Some(path) = &a.track {
        // nobody on screen: hold the last place (or the middle); then smooth over nine frames
        let mut last = (a.size.0 as f64 / 2.0, a.size.1 as f64 / 2.0);
        let raw: Vec<(f64, f64)> = centroids.iter().map(|c| { if let Some(p) = c { last = *p; } last }).collect();
        let points: Vec<String> = (0..raw.len())
            .map(|i| {
                let win = &raw[i.saturating_sub(4)..(i + 5).min(raw.len())];
                let k = win.len() as f64;
                format!("[{},{}]", (win.iter().map(|p| p.0).sum::<f64>() / k).round(), (win.iter().map(|p| p.1).sum::<f64>() / k).round())
            })
            .collect();
        std::fs::write(path, format!("{{\"fps\":{fps},\"width\":{},\"height\":{},\"points\":[{}]}}", a.size.0, a.size.1, points.join(",")))?;
        println!("track -> {path}");
    }
    Ok(())
}
