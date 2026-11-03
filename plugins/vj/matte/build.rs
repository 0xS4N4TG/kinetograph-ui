// ONNX Runtime's GPU libraries on Linux (Dawn for WebGPU, the CUDA provider) are copied next to the binary: look for
// them there.
//
// ONNX Runtime's CoreML code asks which macOS it runs on with `__isPlatformVersionAtLeast`, which lives in clang's
// runtime library; Rust links without it, so point the linker at it.
fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        let out = std::process::Command::new("clang").arg("--print-runtime-dir").output().expect("clang is needed on macOS");
        let dir = String::from_utf8(out.stdout).unwrap();
        println!("cargo:rustc-link-search=native={}", dir.trim());
        println!("cargo:rustc-link-lib=static=clang_rt.osx");
    }
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("linux") {
        println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN");
    }
}
