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
import DownloadTask = LX.Download.DownloadTask
import wySdk from '@/utils/musicSdk/wy'

const taskQueue: DownloadTask[] = [];
let isProcessing = false;
let currentDownloadTask: any | null = null;

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

  let url: string;
  if (task.isForceCookie && task.musicInfo.source === 'wy') {
    const highQualityLevels: LX.Quality[] = ['flac', 'hires', 'master', 'atmos', 'atmos_plus'];
    console.log(`[Batch Download] Forcing cookie for ${task.musicInfo.name}`);
    try {
      const result = await wySdk.cookie.getMusicUrl(task.musicInfo, task.quality).promise;
      if (!result.url) throw new Error('Cookie 未能获取到URL');
      if (result.level === 'exhigh' && highQualityLevels.includes(task.quality)) {
        throw new Error(`请求的音质 ${task.quality} 不可用`);
      }
      url = result.url;
    } catch (error: any) {
      toast(`${task.musicInfo.name} 下载失败: ${error.message}`, 'short');
      removeTask(task.id);
      return;
    }
  } else {
    url = await getMusicUrl({ musicInfo: task.musicInfo, quality: task.quality, isRefresh: true });
  }

  await requestStoragePermission()

  if (!task.isForceCookie) {
    toast(`${task.fileName} 正在下载...`, 'short');
  }
  let lastWritten = 0;
  let lastTime = Date.now();
  try {
      const downloadTask = RNFetchBlob.config({
        path: task.filePath,
        fileCache: true,
      }).fetch('GET', url, {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
      });

      currentDownloadTask = downloadTask;
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
      console.log('下载完成:', task.fileName);
      await handleMetadata(task, task.filePath);
      try {
        await RNFetchBlob.fs.scanFile([{ path: task.filePath }]);
        console.log(`[Download Manager] Media scan requested for: ${task.filePath}`);
      } catch (scanError) {
        console.error(`[Download Manager] Failed to request media scan for ${task.filePath}:`, scanError);
      }
      downloadActions.updateTask(task.id, { status: 'completed', progress: { ...task.progress, percent: 1 } });

      if (!task.isForceCookie) {
        toast(`${task.fileName} 下载完成!`, 'short');
      }
  } finally {
    currentDownloadTask = null;
  }
};

const handleMetadata = async (task: DownloadTask, filePath: string) => {
  console.log('开始处理元数据:', filePath);
  // 写入标签
  if (settingState.setting['download.writeMetadata']) {
    try {
      const title = settingState.setting['download.writeAlias'] && task.musicInfo.alias
        ? `${task.musicInfo.name} (${task.musicInfo.alias})`
        : task.musicInfo.name;

      await writeMetadata(filePath, {
        name: title,
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
      const title = settingState.setting['download.writeAlias'] && task.musicInfo.alias
      ? `${task.musicInfo.name} (${task.musicInfo.alias})`
      : task.musicInfo.name;

      await writeMetadata(filePath, {
        name: title,
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

export const addTask = (musicInfo: LX.Music.MusicInfo, quality: LX.Quality, isForceCookie: boolean = false) => {
  const extension = getFileExtension(quality);

  let finalSingerString = musicInfo.singer;
  // 文件名过长的情况下，只取前6个歌手名
  if (musicInfo.artists && musicInfo.artists.length > 6) {
    finalSingerString = musicInfo.artists.slice(0, 6).map(artist => artist.name).join('、') + '...';
  }
  let fileName = settingState.setting['download.fileName']
    .replace('歌名', musicInfo.name)
    .replace('歌手', finalSingerString);
  fileName = filterFileName(fileName);
  const downloadDir = settingState.setting['download.path'] || (RNFetchBlob.fs.dirs.MusicDir + '/LX-N Music');
  const filePath = `${downloadDir}/${fileName}.${extension}`;

  const task: DownloadTask = {
    id: toMD5(`${musicInfo.id}-${quality}`),
    musicInfo,
    quality,
    status: 'waiting',
    filePath,
    fileName,
    progress: { percent: 0, speed: '', downloaded: 0, total: 0 },
    metadataStatus: { cover: 'pending', lyric: 'pending', tags: 'pending' },
    createdAt: Date.now(),
    isForceCookie,
  };

  if (downloadState.tasks.some(t => t.id === task.id)) {
    toast('任务已存在');
    return;
  }

  downloadActions.addTask(task);
  taskQueue.push(task);
  processQueue();
};

export const removeTask = (id: string) => {
  const taskToRemove = downloadState.tasks.find(t => t.id === id);
  if (currentDownloadTask && taskToRemove && taskToRemove.status === 'downloading') {
    currentDownloadTask.cancel(async () => {
      try {
        console.log(taskToRemove)
        if (taskToRemove.filePath) {
          await unlink(taskToRemove.filePath);
          console.log(`[Download Manager] Canceled and deleted partial file: ${taskToRemove.filePath}`);
        }
      } catch (error) {
        console.error(`[Download Manager] Failed to delete partial file on remove:`, error);
      }
      currentDownloadTask = null;
    })
  }
  // 从队列中移除
  const taskIndex = taskQueue.findIndex(t => t.id === id);
  if (taskIndex > -1) taskQueue.splice(taskIndex, 1);
  // 从store中移除
  downloadActions.removeTask(id);
  isProcessing = false;
  processQueue();
};


/**
 * 批量下载任务 - 使用网易云源和Cookie，并间隔添加
 * @param musicInfos 选中的歌曲列表
 */
export const batchDownload = async (musicInfos: LX.Music.MusicInfo[]) => {
  const cookie = settingState.setting['common.wy_cookie'];
  if (!cookie) {
    toast('请先在设置中配置网易云 Cookie');
    return;
  }

  const wyMusicInfos = musicInfos.filter(m => m.source === 'wy');
  if (musicInfos.length > wyMusicInfos.length) {
    toast('已自动过滤非网易云音源的歌曲');
  }
  if (!wyMusicInfos.length) {
    toast('未选择任何网易云音源的歌曲');
    return;
  }

  const quality = settingState.setting['player.playQuality'];
  toast(`准备添加 ${wyMusicInfos.length} 首歌曲到下载队列...`);
  for (const musicInfo of wyMusicInfos) {
    addTask(musicInfo, quality, true);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};
