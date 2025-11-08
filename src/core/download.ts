import RNFetchBlob from 'rn-fetch-blob';
import {toMD5, toast, requestStoragePermission} from '@/utils/tools';
import { getMusicUrl, getLyricInfo } from '@/core/music';
import {getFileExtension, getFileExtensionFromUrl} from '@/screens/Home/Views/Mylist/MusicList/download/utils';
import { mergeLyrics } from '@/screens/Home/Views/Mylist/MusicList/download/lrcTool';
import {writeFile, downloadFile, unlink} from '@/utils/fs';
import { writeMetadata, writePic, writeLyric } from '@/utils/localMediaMetadata';
import settingState from '@/store/setting/state';
import downloadState from '@/store/download/state';
import downloadActions from '@/store/download/action';
import {filterFileName, sizeFormate} from "@/utils";
import { getPicUrl } from '@/core/music/online'
import DownloadTask = LX.Download.DownloadTask;

const taskQueue: DownloadTask[] = [];
let isProcessing = false;
let currentJobId: number | null = null;

const processQueue = async () => {
  if (isProcessing || taskQueue.length === 0) return;
  isProcessing = true;

  const task = taskQueue.shift();
  if (!task) {
    isProcessing = false;
    return;
  }

  try {
    await startDownload(task);
  } catch (error: any) {
    downloadActions.updateTask(task.id, { status: 'error', errorMsg: error.message });
  } finally {
    isProcessing = false;
    processQueue();
  }
};

const startDownload = async (task: DownloadTask) => {
  downloadActions.updateTask(task.id, { status: 'downloading' });
  const url = await getMusicUrl({ musicInfo: task.musicInfo, quality: task.quality, isRefresh: true });
  const extension = getFileExtension(task.quality);
  let fileName = settingState.setting['download.fileName']
    .replace('歌名', task.musicInfo.name)
    .replace('歌手', task.musicInfo.singer);
  fileName = filterFileName(fileName);
  const downloadDir = settingState.setting['download.path'] || (RNFetchBlob.fs.dirs.MusicDir + '/LX-N Music');
  const filePath = `${downloadDir}/${fileName}.${extension}`;

  await requestStoragePermission()
  let lastWritten = 0;
  let lastTime = Date.now();
  const downloadTask = RNFetchBlob.config({
    path: filePath,
    fileCache: true,
  }).fetch('GET', url, {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
  });

  currentJobId = downloadTask.jobId;
  downloadTask.progress({ interval: 500 }, (written, total) => {
    const now = Date.now();
    const deltaTime = now - lastTime;
    if (deltaTime === 0) return;

    const deltaBytes = written - lastWritten;
    const speed = deltaBytes / (deltaTime / 1000);

    lastWritten = written;
    lastTime = now;
    const percent = total > 0 ? written / total : 0;
    downloadActions.updateTask(task.id, {
      progress: {
        ...task.progress,
        percent,
        downloaded: written,
        total,
        speed: `${sizeFormate(speed)}/s`,
      },
    });
  });

  await downloadTask;
  console.log('下载完成:', filePath);
  currentJobId = null;
  downloadActions.updateTask(task.id, { filePath });
  await handleMetadata(task, filePath);
  try {
    await RNFetchBlob.fs.scanFile([{ path: filePath }]);
    console.log(`[Download Manager] Media scan requested for: ${filePath}`);
  } catch (scanError) {
    console.error(`[Download Manager] Failed to request media scan for ${filePath}:`, scanError);
  }
  downloadActions.updateTask(task.id, { status: 'completed', progress: { ...task.progress, percent: 1 } });

  toast(`${fileName} 下载完成!`, 'short');
};

const handleMetadata = async (task: DownloadTask, filePath: string) => {
  console.log('开始处理元数据:', filePath);
  // 写入标签
  if (settingState.setting['download.writeMetadata']) {
    try {
      await writeMetadata(filePath, {
        name: task.musicInfo.name,
        singer: task.musicInfo.singer,
        albumName: task.musicInfo.meta.albumName,
      }, true);
      downloadActions.updateTask(task.id, { metadataStatus: { ...task.metadataStatus, tags: 'success' } });
    } catch (e) {
      toast('标签信息写入失败', 'short');
      downloadActions.updateTask(task.id, { metadataStatus: { ...task.metadataStatus, tags: 'fail' } });
    }
  }

  const downloadDir = settingState.setting['download.path'] || (RNFetchBlob.fs.dirs.MusicDir + '/LX-N Music')
  // 写入封面
  if (settingState.setting['download.writePicture']) {
    try {
      const picUrl = await getPicUrl({ musicInfo: task.musicInfo });
      const extension = getFileExtensionFromUrl(picUrl)
      const picPath = `${downloadDir}/temp.${extension}`
      await RNFetchBlob.config({ path: picPath }).fetch('GET', picUrl);
      await writePic(filePath, picPath);
      await unlink(picPath)
      downloadActions.updateTask(task.id, { metadataStatus: { ...task.metadataStatus, cover: 'success' } });
    } catch (e) {
      console.log(e)
      toast('封面写入失败', 'short');
      downloadActions.updateTask(task.id, { metadataStatus: { ...task.metadataStatus, cover: 'fail' } });
    }
  }

  // 写入歌词
  if (settingState.setting['download.writeLyric'] || settingState.setting['download.writeEmbedLyric']) {
    try {
      const lyrics = await getLyricInfo({ musicInfo: task.musicInfo as LX.Music.MusicInfoOnline });
      const baseFilePath = filePath.substring(0, filePath.lastIndexOf('.'));
      const romaLyric = settingState.setting['download.writeRomaLyric'] ? lyrics.rlyric : null;

      if (settingState.setting['download.writeEmbedLyric']) {
        const embedLyricContent = mergeLyrics(lyrics.lyric, lyrics.tlyric, romaLyric);
        if (embedLyricContent) await writeLyric(filePath, embedLyricContent);
      }
      if (settingState.setting['download.writeLyric']) {
        const finalLyricContent = mergeLyrics(lyrics.lyric, lyrics.tlyric, romaLyric);
        if (finalLyricContent) await writeFile(`${baseFilePath}.lrc`, finalLyricContent);
      }
      downloadActions.updateTask(task.id, { metadataStatus: { ...task.metadataStatus, lyric: 'success' } });
    } catch (e) {
      toast('歌词写入失败', 'short');
      downloadActions.updateTask(task.id, { metadataStatus: { ...task.metadataStatus, lyric: 'fail' } });
    }
  }
};

export const retryMetadata = async (taskId: string) => {
  const task = downloadState.tasks.find(t => t.id === taskId);
  if (!task || !task.filePath) {
    toast('任务或文件不存在，无法重试');
    return;
  }

  toast('正在尝试重新获取元信息...');
  const filePath = task.filePath;
  const metadataStatus = { ...task.metadataStatus };

  // 重试写入标签
  if (metadataStatus.tags === 'fail' && settingState.setting['download.writeMetadata']) {
    try {
      await writeMetadata(filePath, {
        name: task.musicInfo.name,
        singer: task.musicInfo.singer,
        albumName: task.musicInfo.meta.albumName,
      }, true);
      metadataStatus.tags = 'success';
    } catch (e: any) {
      console.error(`[Retry Metadata] Write Tags Error for ${task.musicInfo.name}:`, e.message);
      metadataStatus.tags = 'fail';
    }
  }

  // 重试写入封面
  if (metadataStatus.cover === 'fail' && settingState.setting['download.writePicture']) {
    try {
      const picUrl = await getPicUrl({ musicInfo: task.musicInfo as LX.Music.MusicInfoOnline });
      const extension = getFileExtensionFromUrl(picUrl);
      const picPath = `${RNFetchBlob.fs.dirs.CacheDir}/lx_temp_pic_${task.id}.${extension}`;

      await RNFetchBlob.config({ path: picPath }).fetch('GET', picUrl);
      await writePic(filePath, picPath);
      await unlink(picPath);
      metadataStatus.cover = 'success';
    } catch (e: any) {
      console.error(`[Retry Metadata] Write Cover Error for ${task.musicInfo.name}:`, e.message);
      metadataStatus.cover = 'fail';
    }
  }

  // 重试写入歌词
  if (metadataStatus.lyric === 'fail' && (settingState.setting['download.writeLyric'] || settingState.setting['download.writeEmbedLyric'])) {
    try {
      const lyrics = await getLyricInfo({ musicInfo: task.musicInfo as LX.Music.MusicInfoOnline });
      const baseFilePath = filePath.substring(0, filePath.lastIndexOf('.'));
      const romaLyric = settingState.setting['download.writeRomaLyric'] ? lyrics.rlyric : null;

      if (settingState.setting['download.writeEmbedLyric']) {
        const embedLyricContent = mergeLyrics(lyrics.lyric, lyrics.tlyric, romaLyric);
        if (embedLyricContent) await writeLyric(filePath, embedLyricContent);
      }
      if (settingState.setting['download.writeLyric']) {
        const finalLyricContent = mergeLyrics(lyrics.lyric, lyrics.tlyric, romaLyric);
        if (finalLyricContent) await writeFile(`${baseFilePath}.lrc`, finalLyricContent);
      }
      metadataStatus.lyric = 'success';
    } catch (e: any) {
      console.error(`[Retry Metadata] Write Lyric Error for ${task.musicInfo.name}:`, e.message);
      metadataStatus.lyric = 'fail';
    }
  }

  downloadActions.updateTask(task.id, { metadataStatus });

  if (Object.values(metadataStatus).every(s => s !== 'fail')) {
    toast('元信息已全部修复成功！');
  } else {
    toast('部分元信息修复失败，请检查日志', 'long');
  }
};

export const retryTask = (taskId: string) => {
  const task = downloadState.tasks.find(t => t.id === taskId);
  if (!task) return;

  // 如果歌曲文件下载失败，或者文件路径不存在，则重新下载整个文件
  if (task.status === 'error' || !task.filePath) {
    toast('正在重新下载...');
    // 通过先移除再添加的方式实现重新下载
    removeTask(task.id);
    // 延迟一下，确保状态更新
    setTimeout(() => {
      addTask(task.musicInfo, task.quality);
    }, 200);
  }
  // 如果文件已存在，但元信息失败，则只重试元信息
  else if (Object.values(task.metadataStatus).includes('fail')) {
    void retryMetadata(task.id);
  }
};

export const addTask = (musicInfo: LX.Music.MusicInfo, quality: LX.Quality) => {
  const task: DownloadTask = {
    id: toMD5(`${musicInfo.id}-${quality}`),
    musicInfo,
    quality,
    status: 'waiting',
    progress: { percent: 0, speed: '', downloaded: 0, total: 0 },
    metadataStatus: { cover: 'pending', lyric: 'pending', tags: 'pending' },
    createdAt: Date.now(),
  };

  if (downloadState.tasks.some(t => t.id === task.id)) {
    toast('任务已存在');
    return;
  }

  downloadActions.addTask(task);
  taskQueue.push(task);
  processQueue();
};

export const pauseTask = (id: string) => {
  if (currentJobId) {
    RNFetchBlob.fs.cancelRequest(currentJobId);
    currentJobId = null;
  }
  const taskIndex = taskQueue.findIndex(t => t.id === id);
  if (taskIndex > -1) taskQueue.splice(taskIndex, 1);

  downloadActions.updateTask(id, { status: 'paused' });
  isProcessing = false;
  processQueue();
};

export const removeTask = (id: string) => {
  const taskToRemove = downloadState.tasks.find(t => t.id === id);
  if (currentJobId && taskToRemove && taskToRemove.status === 'downloading') {
    RNFetchBlob.fs.cancelRequest(currentJobId);
    currentJobId = null;
  }
  // 从队列中移除
  const taskIndex = taskQueue.findIndex(t => t.id === id);
  if (taskIndex > -1) taskQueue.splice(taskIndex, 1);
  // 从store中移除
  downloadActions.removeTask(id);
  isProcessing = false;
  processQueue();
};
