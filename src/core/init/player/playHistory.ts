import playerState from '@/store/player/state'
import { addPlayHistory } from '@/core/player/playHistory'
import { LIST_IDS } from '@/config/constant'
import listState from '@/store/list/state'
import { isOneDriveMusicInfo } from '@/core/oneDrive/utils'

const MIN_PLAY_TIME = 2 * 60
const MIN_PLAY_RATIO = 0.5

export default () => {
  let currentMusicInfo: LX.Music.MusicInfo | null = null
  let currentListId: string | null = null
  let isRecorded = false

  const handleMusicToggled = () => {
    const playMusicInfo = playerState.playMusicInfo
    const musicInfoRaw = playMusicInfo.musicInfo
    isRecorded = false
    currentMusicInfo = null
    currentListId = null
    if (!musicInfoRaw) return

    currentMusicInfo = 'progress' in musicInfoRaw ? musicInfoRaw.metadata.musicInfo : musicInfoRaw
    if (isOneDriveMusicInfo(currentMusicInfo)) {
      currentMusicInfo = null
      return
    }
    currentListId = playMusicInfo.listId === LIST_IDS.TEMP
      ? listState.tempListMeta.id ?? playMusicInfo.listId
      : playMusicInfo.listId
  }

  const handlePlayProgressChanged: typeof global.state_event.playProgressChanged = (progress) => {
    if (isRecorded || !currentMusicInfo) return
    if (progress.nowPlayTime < MIN_PLAY_TIME && (!progress.maxPlayTime || progress.nowPlayTime / progress.maxPlayTime < MIN_PLAY_RATIO)) return

    isRecorded = true
    void addPlayHistory({
      musicInfo: currentMusicInfo,
      playTime: progress.nowPlayTime,
      maxTime: progress.maxPlayTime,
      listId: currentListId,
    })
  }

  global.app_event.on('musicToggled', handleMusicToggled)
  global.state_event.on('playProgressChanged', handlePlayProgressChanged)
  // The last played song is restored before these listeners are registered.
  // Seed the tracker so the first song after startup can still enter history.
  handleMusicToggled()
}
