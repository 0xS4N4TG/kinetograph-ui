// Person matte for every PNG in a folder, with macOS Vision's person
// segmentation (accurate quality). Writes a same-sized greyscale PNG per frame
// (white = person) into the output folder. Preprocessing only: the render reads
// the finished matte video, never this tool.
//
//   swift plugins/vj/tools/matte.swift <frames-dir> <out-dir>   (tools/matte.mjs runs it for a whole clip)

import AppKit
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: matte.swift <frames-dir> <out-dir>\n".data(using: .utf8)!)
  exit(2)
}
let inDir = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let ci = CIContext()
let files = try FileManager.default.contentsOfDirectory(atPath: inDir.path)
  .filter { $0.hasSuffix(".png") }.sorted()

for name in files {
  let url = inDir.appendingPathComponent(name)
  guard let src = CIImage(contentsOf: url) else { fatalError("cannot read \(name)") }
  let request = VNGeneratePersonSegmentationRequest()
  request.qualityLevel = .accurate
  request.outputPixelFormat = kCVPixelFormatType_OneComponent8
  try VNImageRequestHandler(ciImage: src).perform([request])
  guard let mask = request.results?.first?.pixelBuffer else { fatalError("no mask for \(name)") }
  // The mask comes back smaller than the frame; scale it up to the frame's size.
  var m = CIImage(cvPixelBuffer: mask)
  m = m.transformed(by: CGAffineTransform(scaleX: src.extent.width / m.extent.width,
                                          y: src.extent.height / m.extent.height))
  let cs = CGColorSpaceCreateDeviceGray()
  guard let cg = ci.createCGImage(m, from: src.extent, format: .L8, colorSpace: cs) else {
    fatalError("cannot render \(name)")
  }
  let rep = NSBitmapImageRep(cgImage: cg)
  try rep.representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent(name))
}
print("\(files.count) mattes")
