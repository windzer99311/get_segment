import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { tmpdir } from "os"
import archiver from "archiver"
import ffmpeg from "fluent-ffmpeg"

export const config = {
  maxDuration: 60,
}

export async function POST(request: NextRequest) {
  console.log("[v0] Starting HLS conversion request")

  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!file.name.endsWith(".mp3")) {
    return NextResponse.json({ error: "File must be MP3 format" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 })
  }

  console.log("[v0] File validation passed, size:", file.size)

  const buffer = await file.arrayBuffer()
  const workDir = fs.mkdtempSync(path.join(tmpdir(), "hls-"))

  console.log("[v0] Work directory:", workDir)

  try {
    const inputPath = path.join(workDir, "input.mp3")
    const outputPlaylist = path.join(workDir, "playlist.m3u8")

    // Write the uploaded MP3 file
    fs.writeFileSync(inputPath, Buffer.from(buffer))
    console.log("[v0] MP3 file written to:", inputPath)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("aac")
        .audioBitrate("128k")
        .format("hls")
        .outputOptions(["-hls_time 2", "-hls_list_size 0"])
        .output(outputPlaylist)
        .on("end", () => {
          console.log("[v0] FFmpeg conversion completed")
          resolve()
        })
        .on("error", (err) => {
          console.error("[v0] FFmpeg error:", err)
          reject(new Error(`FFmpeg conversion failed: ${err.message}`))
        })
        .run()
    })

    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []

      const archive = archiver("zip", { zlib: { level: 9 } })

      archive.on("data", (chunk) => {
        chunks.push(chunk)
      })

      archive.on("end", () => {
        console.log("[v0] ZIP archive completed")
        resolve(Buffer.concat(chunks))
      })

      archive.on("error", (err) => {
        console.error("[v0] Archive error:", err)
        reject(err)
      })

      // Add all HLS files to archive
      const files = fs.readdirSync(workDir)
      console.log("[v0] Files in work directory:", files)
      for (const hlsFile of files) {
        if (hlsFile.endsWith(".m3u8") || hlsFile.endsWith(".ts")) {
          archive.file(path.join(workDir, hlsFile), { name: hlsFile })
        }
      }

      archive.finalize()
    })

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${path.basename(file.name, ".mp3")}_hls.zip"`,
      },
    })
  } catch (error) {
    console.error("[v0] Conversion error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Conversion failed" }, { status: 500 })
  } finally {
    // Cleanup temporary directory
    if (fs.existsSync(workDir)) {
      try {
        fs.rmSync(workDir, { recursive: true })
      } catch (cleanupError) {
        console.error("[v0] Cleanup error:", cleanupError)
      }
    }
  }
}
