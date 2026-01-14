"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Music, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [hlsUrl, setHlsUrl] = useState<string>("")
  const [downloadUrl, setDownloadUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add("border-primary", "bg-primary/5")
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-primary", "bg-primary/5")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove("border-primary", "bg-primary/5")

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === "audio/mpeg" || droppedFile?.name.endsWith(".mp3")) {
      setFile(droppedFile)
      setError("")
    } else {
      setError("Please upload an MP3 file")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === "audio/mpeg" || selectedFile.name.endsWith(".mp3")) {
        setFile(selectedFile)
        setError("")
      } else {
        setError("Please select an MP3 file")
      }
    }
  }

  const handleConvert = async () => {
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/hls", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)

      setSuccess(true)
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed")
    } finally {
      setIsLoading(false)
    }
  }

  const downloadFile = () => {
    if (!downloadUrl) return
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = `hls-output-${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary/10 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              MP3 to HLS
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">Convert your MP3 files to HTTP Live Streaming format</p>
        </div>

        {/* Upload Card */}
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Step 1: Upload MP3 File
            </CardTitle>
            <CardDescription>Select or drag and drop an MP3 file (max 10 MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,.mp3"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="space-y-2">
                  <Music className="w-12 h-12 mx-auto text-primary" />
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="font-semibold text-foreground">Drag and drop your MP3 here</p>
                  <p className="text-sm text-muted-foreground">or click to select a file</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex gap-2 p-3 rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">Conversion successful! Download your HLS files.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Convert Button */}
        <Button
          onClick={handleConvert}
          disabled={!file || isLoading}
          size="lg"
          className="w-full h-12 text-base font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            "Convert to HLS"
          )}
        </Button>

        {/* Download Card */}
        {success && downloadUrl && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                Step 2: Download Results
              </CardTitle>
              <CardDescription>Your HLS files are ready for download</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadFile} size="lg" className="w-full h-12 text-base font-semibold">
                <Download className="w-4 h-4 mr-2" />
                Download ZIP Archive
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                The ZIP contains your .m3u8 playlist and .ts segments ready for HLS playback.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card className="bg-secondary/5 border-secondary/20">
          <CardHeader>
            <CardTitle className="text-base">About This Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>This tool converts MP3 audio files to HLS (HTTP Live Streaming) format using FFmpeg. Perfect for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Testing HLS streaming infrastructure</li>
              <li>Audio streaming demonstrations</li>
              <li>Educational projects</li>
              <li>Proof-of-concept applications</li>
            </ul>
            <p className="pt-2">
              The output includes a .m3u8 playlist file and .ts audio segments with AAC codec at 128 kbps, segmented
              every 2 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
