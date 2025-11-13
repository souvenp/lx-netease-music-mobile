import playerState from '@/store/player/state'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import wyApi from '@/utils/musicSdk/wy/user'

export let scrobbleInfo: {
  songId: string | number
  sourceId: string
  totalTime: number
  playedTime: number
} | null = null

export const scrobbleLastSong = () => {
  if (!scrobbleInfo) return

  const { songId, sourceId, totalTime, playedTime } = scrobbleInfo
  scrobbleInfo = null

  if (playedTime < 1 || (totalTime > 0 && playedTime < 60 && (playedTime / totalTime) < 0.4)) {
    console.log(`Scrobble skipped for song ${songId} (played: ${playedTime.toFixed(0)}s, total: ${totalTime.toFixed(0)}s)`)
    return
  }

  console.log(`Scrobbling song: ${songId}, Source ID: '${sourceId}', Time: ${playedTime.toFixed(0)}s`)
  void wyApi.scrobble(songId, sourceId, playedTime)
}

export const updateScrobbleInfo = () => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  const listId = playerState.playMusicInfo.listId

  if (!musicInfo || !listId || musicInfo.source !== 'wy') {
    scrobbleInfo = null
    return
  }

  let sourceId = ''
  const sourceListId = listId === LIST_IDS.TEMP ? listState.tempListMeta.id : listId
  if (sourceListId) {
    if (sourceListId.startsWith('album_')) {
      sourceId = sourceListId.replace('album_', '')
    } else if (sourceListId.startsWith('wy__')) {
      sourceId = sourceListId.replace('wy__', '')
    } else if (sourceListId.startsWith('userlist_')) {
      const userListInfo = listState.userList.find(l => l.id === sourceListId)
      if (userListInfo?.source === 'wy' && userListInfo.sourceListId) {
        sourceId = userListInfo.sourceListId
      }
    }
  }

  scrobbleInfo = {
    songId: musicInfo.meta.songId,
    sourceId: sourceId,
    totalTime: 0, // 初始化为0，等待后续更新
    playedTime: 0, // 初始化为0，等待后续更新
  }
  console.log('Scrobble info updated for new song:', scrobbleInfo)
}

// 实时更新播放时间和总时长的函数
export const updateScrobblePlayTime = (time: number) => {
  if (scrobbleInfo) {
    scrobbleInfo.playedTime = time
  }
}

export const updateScrobbleTotalTime = (time: number) => {
  if (scrobbleInfo) {
    scrobbleInfo.totalTime = time
  }
}
