import Foundation
import AVFoundation
import AppKit
import CoreVideo
import CoreGraphics

let root = URL(fileURLWithPath: "/Users/hebertribeiro/laudo")
let scenesDir = root.appendingPathComponent("tutorial-assets/scenes")
let outputDir = root.appendingPathComponent("tutorial-output")
try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

let cleanVoiceMode = CommandLine.arguments.contains("--clean-voice")
let shortVoiceMode = CommandLine.arguments.contains("--short-voice") || cleanVoiceMode
let shortMode = CommandLine.arguments.contains("--short") || shortVoiceMode
let audioDir = root.appendingPathComponent(cleanVoiceMode ? "tutorial-assets/audio-clean" : (shortVoiceMode ? "tutorial-assets/audio-short" : "tutorial-assets/audio"))
let sceneNames = shortMode
    ? ["00-abertura", "01-login", "02-exemplo", "03-preenchimento", "04-fotos", "05-gerar", "06-repositorio", "08-encerramento"]
    : ["00-abertura", "01-login", "02-exemplo", "03-preenchimento", "04-fotos", "05-gerar", "06-repositorio", "07-resultado", "08-encerramento"]

let audioAssets = sceneNames.map { AVURLAsset(url: audioDir.appendingPathComponent("\($0).aiff")) }
let audioDurations = audioAssets.map { asset -> Double in
    let seconds = CMTimeGetSeconds(asset.duration)
    return seconds.isFinite ? seconds : 6.0
}
let shortMinimums = [4.0, 5.0, 6.0, 6.0, 6.0, 6.0, 6.0, 4.0]
let sceneDurations = shortVoiceMode
    ? zip(audioDurations, shortMinimums).map { ceil(max($0.0 + 0.8, $0.1) * 30) / 30 }
    : (shortMode ? shortMinimums : audioDurations.map { max($0 + 0.45, 4.0) })
let totalDuration = sceneDurations.reduce(0, +)

let width = 1920
let height = 1080
let fps: Int32 = 30
let tempVideo = outputDir.appendingPathComponent(shortMode ? "tutorial-curto-sem-audio.mp4" : "tutorial-sem-audio.mp4")
try? FileManager.default.removeItem(at: tempVideo)

let writer = try AVAssetWriter(outputURL: tempVideo, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 5_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let attrs: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func makeBuffer(image: CGImage, opacity: CGFloat) -> CVPixelBuffer? {
    var buffer: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, attrs as CFDictionary, &buffer)
    guard let pixelBuffer = buffer else { return nil }
    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else { return nil }
    context.setFillColor(NSColor(calibratedRed: 0.025, green: 0.306, blue: 0.165, alpha: 1).cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.setAlpha(opacity)
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return pixelBuffer
}

var frameIndex: Int64 = 0
for (sceneIndex, name) in sceneNames.enumerated() {
    let imageURL = scenesDir.appendingPathComponent("\(name).png")
    guard let nsImage = NSImage(contentsOf: imageURL),
          let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        fatalError("Nao foi possivel abrir \(imageURL.path)")
    }
    let frameCount = Int(sceneDurations[sceneIndex] * Double(fps))
    for localFrame in 0..<frameCount {
        while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
        let t = Double(localFrame) / Double(fps)
        let end = sceneDurations[sceneIndex] - t
        let fadeIn = min(1.0, t / 0.22)
        let fadeOut = min(1.0, end / 0.22)
        let opacity = CGFloat(min(fadeIn, fadeOut))
        if let buffer = makeBuffer(image: cgImage, opacity: opacity) {
            let time = CMTime(value: frameIndex, timescale: fps)
            adaptor.append(buffer, withPresentationTime: time)
        }
        frameIndex += 1
    }
}
input.markAsFinished()
let finishSemaphore = DispatchSemaphore(value: 0)
writer.finishWriting { finishSemaphore.signal() }
finishSemaphore.wait()
if writer.status != .completed { fatalError(writer.error?.localizedDescription ?? "Falha ao criar video") }

if shortMode && !shortVoiceMode {
    let shortURL = outputDir.appendingPathComponent("Tutorial-Sistema-de-Laudos-Curto.mp4")
    try? FileManager.default.removeItem(at: shortURL)
    try FileManager.default.moveItem(at: tempVideo, to: shortURL)
    print("\(shortURL.path)\nDuracao: \(String(format: "%.1f", totalDuration)) segundos\nSem narracao")
    exit(EXIT_SUCCESS)
}

let composition = AVMutableComposition()
let videoAsset = AVURLAsset(url: tempVideo)
guard let sourceVideo = videoAsset.tracks(withMediaType: .video).first,
      let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Faixa de video indisponivel")
}
try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoAsset.duration), of: sourceVideo, at: .zero)

guard let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Faixa de audio indisponivel")
}
var cursor = CMTime.zero
for (index, asset) in audioAssets.enumerated() {
    if let track = asset.tracks(withMediaType: .audio).first {
        try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: track, at: cursor)
    }
    cursor = CMTimeAdd(cursor, CMTime(seconds: sceneDurations[index], preferredTimescale: 600))
}

let finalURL = outputDir.appendingPathComponent(cleanVoiceMode ? "Tutorial-Narracao-Revisada.mp4" : (shortVoiceMode
    ? "Tutorial-Sistema-de-Laudos-Curto-com-Voz.mp4"
    : "Tutorial-Sistema-de-Laudos-Consultor.mp4"))
try? FileManager.default.removeItem(at: finalURL)
guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPreset1920x1080) else {
    fatalError("Exportador indisponivel")
}
exporter.outputURL = finalURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
let exportSemaphore = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { exportSemaphore.signal() }
exportSemaphore.wait()
if exporter.status != .completed { fatalError(exporter.error?.localizedDescription ?? "Falha ao combinar narracao") }

print("\(finalURL.path)\nDuracao: \(String(format: "%.1f", totalDuration)) segundos")
