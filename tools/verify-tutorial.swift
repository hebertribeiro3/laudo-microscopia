import Foundation
import AVFoundation
import AppKit

let root = URL(fileURLWithPath: "/Users/hebertribeiro/laudo")
let shortVoiceMode = CommandLine.arguments.contains("--short-voice")
let shortMode = CommandLine.arguments.contains("--short")
let videoName = CommandLine.arguments.contains("--clean-voice") ? "Tutorial-Narracao-Revisada.mp4" : (shortVoiceMode
    ? "Tutorial-Sistema-de-Laudos-Curto-com-Voz.mp4"
    : (shortMode ? "Tutorial-Sistema-de-Laudos-Curto.mp4" : "Tutorial-Sistema-de-Laudos-Consultor.mp4"))
let verifyName = shortVoiceMode ? "verification-short-voice" : (shortMode ? "verification-short" : "verification")
let videoURL = root.appendingPathComponent("tutorial-output/\(videoName)")
let verifyDir = root.appendingPathComponent("tutorial-assets/\(verifyName)")
try FileManager.default.createDirectory(at: verifyDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: videoURL)
let duration = CMTimeGetSeconds(asset.duration)
let videoTracks = asset.tracks(withMediaType: .video)
let audioTracks = asset.tracks(withMediaType: .audio)
guard let videoTrack = videoTracks.first else { fatalError("Video sem faixa de imagem") }

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero

let sampleTimes = [1.0, duration / 2.0, max(1.0, duration - 1.5)]
for (index, seconds) in sampleTimes.enumerated() {
    let cgImage = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
    let bitmap = NSBitmapImageRep(cgImage: cgImage)
    guard let data = bitmap.representation(using: .png, properties: [:]) else { continue }
    try data.write(to: verifyDir.appendingPathComponent("amostra-\(index + 1).png"))
}

print("Duracao: \(String(format: "%.2f", duration))")
print("Video: \(videoTracks.count) faixa, \(Int(videoTrack.naturalSize.width))x\(Int(videoTrack.naturalSize.height))")
print("Audio: \(audioTracks.count) faixa")
print(verifyDir.path)
