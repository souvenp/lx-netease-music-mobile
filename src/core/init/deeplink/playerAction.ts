import {
  collectMusic,
  dislikeMusic,
  pause,
  play,
  playNext,
  playPrev,
  stop,
  togglePlay,
  uncollectMusic,
} from '@/core/player/player'

export type PlayerAction =
  | 'play'
  | 'pause'
  | 'stop'
  | 'next'
  | 'previous'
  | 'prev'
  | 'toggle'
  | 'skipNext'
  | 'skipPrev'
  | 'togglePlay'
  | 'collect'
  | 'uncollect'
  | 'dislike'

export const handlePlayerAction = async (action: PlayerAction) => {
  switch (action) {
    case 'play':
      await play()
      break
    case 'pause':
      await pause()
      break
    case 'stop':
      await stop()
      break
    case 'next':
    case 'skipNext':
      await playNext()
      break
    case 'previous':
    case 'prev':
    case 'skipPrev':
      await playPrev()
      break
    case 'toggle':
    case 'togglePlay':
      await togglePlay()
      break
    case 'collect':
      await collectMusic()
      break
    case 'uncollect':
      await uncollectMusic()
      break
    case 'dislike':
      await dislikeMusic()
      break
    default:
      throw new Error('Unknown player action: ' + action)
  }
}
