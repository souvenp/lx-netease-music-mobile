import { setNavActiveId } from '@/core/common'
import Event from './Event'
import commonState from '@/store/common/state'
import { type Source as SonglistSource } from '@/store/songlist/state'
import { type SearchType } from '@/store/search/state'
import DownloadTask = LX.Download.DownloadTask
import playerState from '@/store/player/state'
import listState from '@/store/list/state'
import userState from '@/store/user/state'
import {COMPONENT_IDS, LIST_IDS, type NAV_ID_Type} from '@/config/constant'
import {navigations} from "@/navigation";

// {
//   // sync: {
//   //   send_action_list: 'send_action_list',
//   //   handle_action_list: 'handle_action_list',
//   //   send_sync_list: 'send_sync_list',
//   //   handle_sync_list: 'handle_sync_list',
//   // },
// }

export class AppEvent extends Event {
  // configUpdate() {
  //   this.emit('configUpdate')
  // }

  focus() {
    this.emit('focus')
  }

  /**
   * 我的列表更新
   */
  mylistUpdated(
    lists: Array<LX.List.MyDefaultListInfo | LX.List.MyLoveListInfo | LX.List.UserListInfo>,
  ) {
    this.emit('mylistUpdated', lists)
  }

  /**
   * 我的列表切换
   */
  mylistToggled(id: string) {
    this.emit('listToggled', id)
  }

  /**
   * 音乐信息切换
   */
  musicToggled() {
    this.emit('musicToggled')
  }

  /**
   * 手动改变进度
   * @param progress 进度
   */
  setProgress(progress: number, maxPlayTime?: number) {
    this.emit('setProgress', progress, maxPlayTime)
  }

  /**
   * 设置音量大小
   * @param volume 音量大小
   */
  setVolume(volume: number) {
    this.emit('setVolume', volume)
  }

  /**
   * 设置是否静音
   * @param isMute 是否静音
   */
  setVolumeIsMute(isMute: boolean) {
    this.emit('setVolumeIsMute', isMute)
  }

  // 播放器事件
  play() {
    this.emit('play')
  }

  pause() {
    this.emit('pause')
  }

  stop() {
    this.emit('stop')
  }

  error() {
    this.emit('error')
  }

  // 播放器原始事件
  playerPlaying() {
    this.emit('playerPlaying')
  }

  playerPause() {
    this.emit('playerPause')
  }

  // playerStop() {
  //   this.emit('playerStop')
  // }

  playerEnded() {
    this.emit('playerEnded')
  }

  playerError() {
    this.emit('playerError')
  }

  // playerLoadeddata() {
  //   this.emit('playerLoadeddata')
  // }

  playerLoadstart() {
    this.emit('playerLoadstart')
  }

  // playerCanplay() {
  //   this.emit('playerCanplay')
  // }

  playerEmptied() {
    this.emit('playerEmptied')
  }

  playerWaiting() {
    this.emit('playerWaiting')
  }

  // 更新图片事件
  picUpdated() {
    this.emit('picUpdated')
  }

  // 更新歌词事件
  lyricUpdated() {
    this.emit('lyricUpdated')
  }

  // 更新歌词偏移
  lyricOffsetUpdate() {
    this.emit('lyricOffsetUpdate')
  }

  // 我的列表内歌曲改变事件
  myListMusicUpdate(ids: string[]) {
    if (!ids.length) return
    this.emit('myListMusicUpdate', ids)
  }

  // 下载列表改变事件
  downloadListUpdate() {
    this.emit('downloadListUpdate')
  }

  // 列表里的音乐信息改变事件
  musicInfoUpdate(musicInfo: LX.Music.MusicInfo) {
    this.emit('musicInfoUpdate', musicInfo)
  }

  changeMenuVisible(visible: boolean) {
    this.emit('changeMenuVisible', visible)
  }

  /**
   * 搜索类型改变事件
   * @param type
   */
  searchTypeChanged(type: SearchType) {
    this.emit('searchTypeChanged', type)
  }

  jumpListPosition() {
    const playMusicInfo = playerState.playMusicInfo
    let listId = playMusicInfo.listId
    const musicInfo = 'progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo : playMusicInfo.musicInfo

    if (!listId || !musicInfo) {
      if (commonState.navActiveId === 'nav_love') {
        this.emit('jumpListPosition')
      } else {
        setNavActiveId('nav_love')
        setTimeout(() => this.emit('jumpListPosition'), 200)
      }
      return
    }

    if (listId === LIST_IDS.TEMP) {
      listId = listState.tempListMeta.id
    }

    const currentComponentId = commonState.componentIds[commonState.componentIds.length - 1]?.id
    if (!currentComponentId) return

    let navigatedToDetail = false
    const currentComponent = commonState.componentIds[commonState.componentIds.length - 1];

    if (listId.startsWith('artist_detail_')) {
      const artistId = listId.replace('artist_detail_', '')
      console.log(currentComponent?.name)
      if (currentComponent?.name !== COMPONENT_IDS.ARTIST_DETAIL) {
        navigations.pushArtistDetailScreen(currentComponentId, { id: artistId, name: musicInfo.singer })
        navigatedToDetail = true
      }
    } else if (listId.startsWith('album_')) {
      const albumId = listId.replace('album_', '')
      if (currentComponent?.name !== COMPONENT_IDS.ALBUM_DETAIL_SCREEN) {
        navigations.pushAlbumDetailScreen(currentComponentId, { id: albumId, name: musicInfo.meta.albumName, source: musicInfo.source as LX.OnlineSource })
        navigatedToDetail = true
      }
    } else if (listId.includes('__')) { // 处理歌单和排行榜
      const [source, sourceId] = listId.split('__')
      const isSubscribed = userState.wy_subscribed_playlists.some(p => String(p.id) === sourceId)
      const targetNavId: NAV_ID_Type = isSubscribed ? 'nav_my_playlist' : 'nav_songlist'

      if (commonState.navActiveId !== targetNavId) {
        global.lx.jumpMyListPosition = true
        setNavActiveId(targetNavId)
      }
    } else if (listId.startsWith('dailyrec_wy')) {
      // 每日推荐，切换到对应 tab
      setNavActiveId('nav_daily_rec')
    } else {
      // 默认处理“我的列表”
      const targetNavId: NAV_ID_Type = 'nav_love'
      if (commonState.navActiveId !== targetNavId) {
        global.lx.jumpMyListPosition = true
        setNavActiveId(targetNavId)
      }
    }

    setTimeout(() => {
      this.emit('jumpListPosition')
    }, navigatedToDetail ? 500 : 200) // PUSH 页面需要更长延时等待动画
  }

  changeLoveListVisible(visible: boolean) {
    this.emit('changeLoveListVisible', visible)
  }

  showSonglistTagList(source: SonglistSource, activeId: string) {
    this.emit('showSonglistTagList', source, activeId)
  }

  hideSonglistTagList() {
    this.emit('hideSonglistTagList')
  }

  songlistTagInfoChange(name: string, id: string) {
    this.emit('songlistTagInfoChange', name, id)
  }

  selectSyncMode(mode: LX.Sync.ModeType) {
    this.emit('selectSyncMode', mode)
  }

  showArtistSelector(artists: any[], onSelect: (artist: any) => void) {
    this.emit('showArtistSelector', artists, onSelect)
  }

  triggerSearch(text: string) {
    this.emit('triggerSearch', text)
  }

  download_list_changed() {
    this.emit('download_list_changed')
  }
  download_task_add(task: DownloadTask) {
    this.emit('download_task_add', task)
  }
  download_progress_update(payload: { id: string, progress: DownloadTask['progress'] }) {
    this.emit('download_progress_update', payload)
  }
  download_status_update(payload: { id: string, status: DownloadTask['status'] }) {
    this.emit('download_status_update', payload)
  }
  download_metadata_update(payload: { id: string, metadataStatus: DownloadTask['metadataStatus'] }) {
    this.emit('download_metadata_update', payload)
  }
  show_download_ball() {
    this.emit('show_download_ball')
  }
  showVideoPlayer(url: string) {
    this.emit('showVideoPlayer', url)
  }
  playlist_updated(data: { source: string, listId: string }) {
    this.emit('playlist_updated', data)
  }
}

type EventMethods = Omit<EventType, keyof Event>

declare class EventType extends AppEvent {
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
}

export type AppEventTypes = Omit<EventType, keyof Omit<Event, 'on' | 'off'>>
export const createAppEventHub = (): AppEventTypes => {
  return new AppEvent()
}
