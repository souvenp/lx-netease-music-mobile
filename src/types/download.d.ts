declare namespace LX {
  namespace Download {
    interface DownloadTask {
      id: string;
      musicInfo: LX.Music.MusicInfo;
      quality: LX.Quality;
      status: 'waiting' | 'downloading' | 'paused' | 'completed' | 'error';
      progress: {
        percent: number;
        speed: string;
        downloaded: number;
        total: number;
      };
      metadataStatus: {
        cover: 'pending' | 'success' | 'fail';
        lyric: 'pending' | 'success' | 'fail';
        tags: 'pending' | 'success' | 'fail';
      };
      errorMsg?: string;
      createdAt: number;
      filePath?: string;
      isForceCookie?: boolean;
    }
  }
}
