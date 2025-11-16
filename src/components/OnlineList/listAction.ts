import { LIST_IDS } from '@/config/constant'
import { addListMusics } from '@/core/list'
import { playList, playNext } from '@/core/player/player'
import { addTempPlayList } from '@/core/player/tempPlayList'
import settingState from '@/store/setting/state'
import { getListMusicSync } from '@/utils/listManage'
import { confirmDialog, openUrl, shareMusic, toast } from '@/utils/tools'
import { addDislikeInfo, hasDislike } from '@/core/dislikeList'
import playerState from '@/store/player/state'
import musicSdk from '@/utils/musicSdk'
import { toOldMusicInfo } from '@/utils'
import { httpFetch } from '@/utils/request'
import musicDetailApi from '@/utils/musicSdk/wy/musicDetail'
import userState from '@/store/user/state'
import {weapi} from "@/utils/musicSdk/wy/utils/crypto.js";
import {addWyLikedSong, removeWyLikedSong} from "@/store/user/action.ts";
import {navigations} from "@/navigation";
import commonState from '@/store/common/state'
import wyApi from '@/utils/musicSdk/wy/user'

export const handleShowAlbumDetail = (componentId: string, musicInfo: LX.Music.MusicInfoOnline) => {
  const albumId = musicInfo.meta.albumId
  if (!albumId) {
    toast('专辑信息不存在')
    return
  }
  const albumInfo = {
    id: albumId,
    name: musicInfo.meta.albumName,
    author: musicInfo.singer,
    img: musicInfo.meta.picUrl,
    source: 'wy', // 默认源为wy
  }
  navigations.pushAlbumDetailScreen(componentId, albumInfo)
}

export const handleShowArtistDetail = async (componentId: string, musicInfo: LX.Music.MusicInfoOnline) => {
  if (musicInfo.source !== 'wy') {
    toast('非网易云音源无法查看歌手详情')
    return
  }

  const artists = musicInfo.artists
  if (!artists?.length) {
    toast('未找到该歌曲的歌手信息')
    return
  }

  const onSelect = (artist: { id: string | number, name: string }) => {
    navigations.pushArtistDetailScreen(componentId, { id: String(artist.id), name: artist.name })
  }

  if (artists.length > 1) {
    global.app_event.showArtistSelector(artists, onSelect)
  } else if (artists.length === 1) {
    onSelect(artists[0])
  }
}

export const handleLikeMusic = async (musicInfo: LX.Music.MusicInfoOnline) => {
  const cookie = settingState.setting['common.wy_cookie']
  if (!cookie) {
    toast('请先设置网易云 Cookie')
    return
  }
  if (musicInfo.source !== 'wy') {
    toast('非网易云音源无法执行此操作')
    return
  }

  const songId = musicInfo.meta.songId
  const isLiked = userState.wy_liked_song_ids.has(String(songId))
  const like = !isLiked

  try {
    await wyApi.likeSong(songId, like);
    if (like) {
      toast('喜欢成功');
      addWyLikedSong(songId);
    } else {
      toast('取消喜欢成功');
      removeWyLikedSong(songId);
    }
  } catch (error: any) {
    toast(`操作失败: ${error.message}`);
  }
}

export const handlePlay = (musicInfo: LX.Music.MusicInfoOnline) => {
  void addListMusics(
    LIST_IDS.DEFAULT,
    [musicInfo],
    settingState.setting['list.addMusicLocationType']
  ).then(() => {
    const index = getListMusicSync(LIST_IDS.DEFAULT).findIndex((m) => m.id == musicInfo.id)
    if (index < 0) return
    void playList(LIST_IDS.DEFAULT, index)
  })
}
export const handlePlayLater = (
  musicInfo: LX.Music.MusicInfoOnline,
  selectedList: LX.Music.MusicInfoOnline[],
  onCancelSelect: () => void
) => {
  if (selectedList.length) {
    addTempPlayList(selectedList.map((s) => ({ listId: '', musicInfo: s })))
    onCancelSelect()
  } else {
    addTempPlayList([{ listId: '', musicInfo }])
  }
}

export const handleShare = (musicInfo: LX.Music.MusicInfoOnline) => {
  shareMusic(
    settingState.setting['common.shareType'],
    settingState.setting['download.fileName'],
    musicInfo
  )
}

export const handleShowMusicSourceDetail = async (minfo: LX.Music.MusicInfoOnline) => {
  const url = musicSdk[minfo.source as LX.OnlineSource]?.getMusicDetailPageUrl(
    toOldMusicInfo(minfo)
  )
  if (!url) return
  void openUrl(url)
}

export const handleDislikeMusic = async(musicInfo: LX.Music.MusicInfoOnline, listId?: string) => {
  // 如果是每日推荐列表，则执行新的API逻辑
  if (listId === 'dailyrec_wy') {
    const cookie = settingState.setting['common.wy_cookie']
    if (!cookie) {
      toast('请先设置网-易-云 Cookie')
      return
    }

    // 网易云API需要的是纯数字ID
    const songId = musicInfo.id.replace('wy_', '')

    try {
      const { body, statusCode } = await httpFetch('https://music.163.com/weapi/v2/discovery/recommend/dislike', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          resId: songId,
          resType: 4,
          sceneType: 1,
        }),
      }).promise;

      if (statusCode == 200 && body.code === 200) {
        // 将返回的新歌曲数据转换为应用内部格式
        const newMusicResult = await musicDetailApi.filterList({ songs: [body.data], privileges: [] })
        if (newMusicResult.length) {
          const newMusicInfo = newMusicResult[0]
          // 发送事件，通知UI更新
          global.list_event.daily_rec_music_replace(musicInfo.id, newMusicInfo as LX.Music.MusicInfoOnline)
          toast('操作成功！')
        } else {
          global.list_event.daily_rec_music_replace(musicInfo.id, null)
          toast('操作成功！')
        }
      } else {
        toast('操作失败')
      }
    } catch (error: any) {
      toast(`操作失败: ${error.message}`)
    }
    return
  }

  // --- 对于其他列表，保留原有的本地“不喜欢”逻辑 ---
  const confirm = await confirmDialog({
    message: musicInfo.singer
      ? global.i18n.t('lists_dislike_music_singer_tip', {
        name: musicInfo.name,
        singer: musicInfo.singer,
      })
      : global.i18n.t('lists_dislike_music_tip', { name: musicInfo.name }),
    cancelButtonText: global.i18n.t('cancel_button_text_2'),
    confirmButtonText: global.i18n.t('confirm_button_text'),
    bgClose: false,
  })
  if (!confirm) return
  await addDislikeInfo([{ name: musicInfo.name, singer: musicInfo.singer }])
  toast(global.i18n.t('lists_dislike_music_add_tip'))
  if (hasDislike(playerState.playMusicInfo.musicInfo)) {
    void playNext(true)
  }
}
