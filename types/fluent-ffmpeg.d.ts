declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    setFfmpegPath(path: string): FfmpegCommand;
    setFfprobePath(path: string): FfmpegCommand;
    output(path: string): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    audioFrequency(freq: number): FfmpegCommand;
    audioChannels(channels: number): FfmpegCommand;
    on(event: 'end', callback: () => void): FfmpegCommand;
    on(event: 'error', callback: (err: Error) => void): FfmpegCommand;
    run(): void;
  }

  interface FfmpegMetadata {
    format: {
      duration?: number;
      [key: string]: any;
    };
    [key: string]: any;
  }

  function ffmpeg(input?: string): FfmpegCommand;
  
  namespace ffmpeg {
    function setFfmpegPath(path: string): void;
    function setFfprobePath(path: string): void;
    function ffprobe(path: string, callback: (err: Error | null, metadata: FfmpegMetadata) => void): void;
  }

  export = ffmpeg;
}
