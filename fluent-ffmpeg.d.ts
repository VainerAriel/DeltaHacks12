declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    output(path: string): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    audioFrequency(freq: number): FfmpegCommand;
    audioChannels(channels: number): FfmpegCommand;
    on(event: 'end', callback: () => void): FfmpegCommand;
    on(event: 'error', callback: (err: Error) => void): FfmpegCommand;
    run(): void;
  }

  interface Ffmpeg {
    (path?: string): FfmpegCommand;
    setFfmpegPath(path: string): void;
  }

  const ffmpeg: Ffmpeg;
  export = ffmpeg;
}
