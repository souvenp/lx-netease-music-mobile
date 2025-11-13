import { saveLyric, saveMusicUrl, getMusicUrl as getStoreMusicUrl } from '@/utils/data'
import { updateListMusics } from '@/core/list'
import settingState from '@/store/setting/state'

import wySdk from '@/utils/musicSdk/wy'
import {
  buildLyricInfo,
  getPlayQuality,
  handleGetOnlineLyricInfo,
  handleGetOnlineMusicUrl,
  handleGetOnlinePicUrl,
  getCachedLyricInfo, QUALITY_RANK,
} from './utils'
import {toast} from "@/utils/tools.ts";
import {fetchAndApplyDetailedQuality} from "@/utils/musicSdk/wy/musicDetail.js";

/* export const setMusicUrl = ({ musicInfo, type, url }: {
  musicInfo: LX.Music.MusicInfo
  type: LX.Quality
  url: string
}) => {
  saveMusicUrl(musicInfo, type, url)
}

export const setPic = (datas: {
  listId: string
  musicInfo: LX.Music.MusicInfo
  url: string
}) => {
  datas.musicInfo.img = datas.url
  updateMusicInfo({
    listId: datas.listId,
    id: datas.musicInfo.songmid,
    data: { img: datas.url },
    musicInfo: datas.musicInfo,
  })
}
 */

export const getMusicUrl = async ({
  musicInfo,
  quality,
  isRefresh,
  allowToggleSource = true,
  onToggleSource = () => {},
  prefer = 'cookie',
}: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  prefer?: 'cookie' | 'api'
}): Promise<string> => {
  // if (!musicInfo._types[type]) {
  //   // 兼容旧版酷我源搜索列表过滤128k音质的bug
  //   if (!(musicInfo.source == 'kw' && type == '128k')) throw new Error('该歌曲没有可播放的音频')

  //   // return Promise.reject(new Error('该歌曲没有可播放的音频'))
  // }

  let currentMusicInfo = musicInfo;
  const preferredQuality = settingState.setting['player.playQuality'];

  // 检查是否需要获取详细音质
  const isWySource = currentMusicInfo.source === 'wy';
  const hasFullDetails = currentMusicInfo.meta._full;
  console.log("播放：currentMusicInfo:", currentMusicInfo);

  if (isWySource && !hasFullDetails) {
    const availableQualities = Object.keys(currentMusicInfo.meta._qualitys);
    const preferredQualityIndex = QUALITY_RANK.indexOf(preferredQuality);
    const maxAvailableQualityIndex = Math.min(...availableQualities.map(q => QUALITY_RANK.indexOf(q)));

    // 特殊情况：用户想要的音质比当前已知的最好音质还要高，此时需要等待获取
    if (preferredQualityIndex < maxAvailableQualityIndex) {
      console.log('用户想要的音质比当前已知的最好音质还要高，获取音质详情');
      // 阻塞式获取
      currentMusicInfo = await fetchAndApplyDetailedQuality(currentMusicInfo);
    } else {
      console.log('用户想要的音质比当前已知的最好音质还要低，无需获取音质详情');
      // 默认情况：不阻塞播放，在后台异步获取
      void fetchAndApplyDetailedQuality(currentMusicInfo);
    }
  }

  const targetQuality = quality ?? getPlayQuality(preferredQuality, currentMusicInfo);

  const cachedUrl = await getStoreMusicUrl(musicInfo, targetQuality)
  if (cachedUrl && !isRefresh) return cachedUrl

  // 定义高音质列表
  const highQualityLevels: LX.Quality[] = ['flac', 'hires', 'master', 'atmos', 'atmos_plus'];

  // 检查是否优先使用 API (下载场景或高音质播放场景)
  const preferApi = prefer === 'api' || (musicInfo.source == 'wy' && highQualityLevels.includes(targetQuality));

  if (preferApi) {
    try {
      console.log('Attempting to get music URL via custom API');
      // 优先尝试自定义音源 (API)
      const result = await handleGetOnlineMusicUrl({
        musicInfo,
        quality: targetQuality,
        onToggleSource,
        isRefresh,
        allowToggleSource,
      });
      console.log('Custom API request succeeded', result);
      void saveMusicUrl(musicInfo, result.quality, result.url);
      return result.url;
    } catch (apiError) {
      console.log('API request failed, falling back to Cookie request', apiError);
      // 如果 API 失败且有 Cookie，则尝试 Cookie 作为备用方案
      if (musicInfo.source == 'wy' && settingState.setting['common.wy_cookie']) {
        try {
          const { url, level } = await wySdk.cookie.getMusicUrl(musicInfo, targetQuality).promise;
          if (level === 'exhigh' && highQualityLevels.includes(targetQuality)) {
            toast('非网易云会员，无法获取该音质', 'long')
            throw new Error('自定义源获取失败，且非网易云会员，无法获取该音质')
          }

          if (url) {
            void saveMusicUrl(musicInfo, targetQuality, url);
            return url;
          }
        } catch (cookieError) {
          console.log('Cookie request also failed', cookieError);
          if (cookieError.message === '自定义源获取失败，且非网易云会员，无法获取该音质') throw cookieError;
        }
      }
      throw apiError; // 如果备用方案也失败，则抛出原始错误
    }
  }

  // 默认流程 (低音质播放或非网易云源)
  if (musicInfo.source == 'wy' && settingState.setting['common.wy_cookie']) {
    try {
      const { url } = await wySdk.cookie.getMusicUrl(musicInfo, targetQuality).promise;
      if (url) {
        void saveMusicUrl(musicInfo, targetQuality, url);
        return url;
      }
    } catch (error) {
      console.log('Get music url with cookie failed, fallback to custom api', error);
    }
  }

  return handleGetOnlineMusicUrl({
    musicInfo,
    quality: targetQuality,
    onToggleSource,
    isRefresh,
    allowToggleSource,
  }).then(({ url, quality: targetQuality, musicInfo: targetMusicInfo, isFromCache }) => {
    if (targetMusicInfo.id != musicInfo.id && !isFromCache)
      void saveMusicUrl(targetMusicInfo, targetQuality, url)
    void saveMusicUrl(musicInfo, targetQuality, url)
    return url
  })
}

export const getPicUrl = async ({
  musicInfo,
  listId,
  isRefresh,
  allowToggleSource = true,
  onToggleSource = () => {},
}: {
  musicInfo: LX.Music.MusicInfoOnline
  listId?: string | null
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (musicInfo.meta.picUrl && !isRefresh) return musicInfo.meta.picUrl
  return handleGetOnlinePicUrl({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(
    ({ url, musicInfo: targetMusicInfo, isFromCache }) => {
      // picRequest = null
      if (listId) {
        musicInfo.meta.picUrl = url
        void updateListMusics([{ id: listId, musicInfo }])
      }
      // savePic({ musicInfo, url, listId })
      return url
    }
  )
}
export const getLyricInfo = async ({
  musicInfo,
  isRefresh,
  allowToggleSource = true,
  onToggleSource = () => {},
}: {
  musicInfo: LX.Music.MusicInfoOnline
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  // lrcRequest = music[musicInfo.source].getLyric(musicInfo)
  return handleGetOnlineLyricInfo({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(
    async ({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
      // lrcRequest = null
      if (isFromCache) return buildLyricInfo(lyricInfo)
      if (targetMusicInfo.id == musicInfo.id) void saveLyric(musicInfo, lyricInfo)
      else void saveLyric(targetMusicInfo, lyricInfo)

      return buildLyricInfo(lyricInfo)
    }
  )
}
