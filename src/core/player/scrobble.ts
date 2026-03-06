import playerState from '@/store/player/state'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import wyApi from '@/utils/musicSdk/wy/user'

export let scrobbleInfo: {
  songId: string | number
  sourceId: string
  totalTime: number
  accumulatedPlayedTime: number
  lastReportedTime: number
  isScrobbled?: boolean
} | null = null



export const updateScrobbleInfo = () => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  const listId = playerState.playMusicInfo.listId
  if (!musicInfo || !('source' in musicInfo) || musicInfo.source !== 'wy') {
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
    songId: ('meta' in musicInfo) ? musicInfo.meta.songId : '',
    sourceId: sourceId,
    totalTime: 0,
    accumulatedPlayedTime: 0,
    lastReportedTime: 0,
    isScrobbled: false,
  }
  console.log('Scrobble info updated for new song:', scrobbleInfo)
}

export const updateScrobblePlayTime = (currentTime: number) => {
  if (!scrobbleInfo || !playerState.isPlay) return

  // 计算自上次更新以来的时间差
  const deltaTime = currentTime - scrobbleInfo.lastReportedTime

  // 只在连续播放时（时间差较小）累加时间
  // 允许2秒的误差，以应对可能的计时器延迟
  if (deltaTime > 0 && deltaTime < 2) {
    scrobbleInfo.accumulatedPlayedTime += deltaTime
  }

  scrobbleInfo.lastReportedTime = currentTime
  
  // 实时判断是否满足打卡条件，如果满足而且未打过卡，直接上报
  if (!scrobbleInfo.isScrobbled) {
    const playedTime = Math.floor(scrobbleInfo.accumulatedPlayedTime)
    const { totalTime } = scrobbleInfo
    if (playedTime >= 120 || (totalTime > 0 && playedTime >= totalTime * 0.5)) {
        scrobbleInfo.isScrobbled = true
        console.log(`Scrobbling song realtime: ${scrobbleInfo.songId}, Source ID: '${scrobbleInfo.sourceId}', Time: ${playedTime}s`)
        void wyApi.scrobble(scrobbleInfo.songId, scrobbleInfo.sourceId, playedTime)
    }
  }
}

export const updateScrobbleTotalTime = (time: number) => {
  if (scrobbleInfo) {
    scrobbleInfo.totalTime = time
  }
}
