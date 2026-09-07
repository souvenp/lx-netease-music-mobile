import TrackPlayer from 'react-native-track-player'
import { updateOptions, setVolume, setPlaybackRate, migratePlayerCache } from './utils'
import settingState from '@/store/setting/state'

// const listenEvent = () => {
//   TrackPlayer.addEventListener('playback-error', err => {
//     console.log('playback-error', err)
//   })
//   TrackPlayer.addEventListener('playback-state', info => {
//     console.log('playback-state', info)
//   })
//   TrackPlayer.addEventListener('playback-track-changed', info => {
//     console.log('playback-track-changed', info)
//   })
//   TrackPlayer.addEventListener('playback-queue-ended', info => {
//     console.log('playback-queue-ended', info)
//   })
// }

const initial = async ({
  volume,
  playRate,
  cacheSize,
  isHandleAudioFocus,
  isEnableAudioOffload,
}: {
  volume: number
  playRate: number
  cacheSize: number
  isHandleAudioFocus: boolean
  isEnableAudioOffload: boolean
}) => {
  if (global.lx.playerStatus.isIniting || global.lx.playerStatus.isInitialized) return
  global.lx.playerStatus.isIniting = true
  console.log('Cache Size', cacheSize * 1024)
  await migratePlayerCache()
  await TrackPlayer.setupPlayer({
    maxCacheSize: cacheSize * 1024,
    maxBuffer: 1000,
    waitForBuffer: true,
    handleAudioFocus: isHandleAudioFocus,
    audioOffload: isEnableAudioOffload,
    autoUpdateMetadata: false,
  })
  global.lx.playerStatus.isInitialized = true
  global.lx.playerStatus.isIniting = false
  await updateOptions()
  await setVolume(volume)
  await setPlaybackRate(playRate)
  // listenEvent()
}

const isInitialized = () => global.lx.playerStatus.isInitialized

/**
 * 强制重新初始化 TrackPlayer。
 * 场景：系统（One UI 模式与日常程序 / 蓝牙等）在 app 无当前曲目时触发「播放」，
 * 此时 TrackPlayer 服务可能已被系统回收（media session 已销毁），JS 层仍认为已初始化。
 * 该函数清除初始化标志并重新 setupPlayer（幂等），让后续播放调用能重建 playback。
 */
const reinitial = async () => {
  global.lx.playerStatus.isInitialized = false
  global.lx.playerStatus.isIniting = false
  const { setting } = settingState
  await initial({
    volume: setting['player.volume'],
    playRate: setting['player.playbackRate'],
    cacheSize: setting['player.cacheSize']
      ? parseInt(setting['player.cacheSize'])
      : 0,
    isHandleAudioFocus: setting['player.isHandleAudioFocus'],
    isEnableAudioOffload: setting['player.isEnableAudioOffload'],
  })
}

export { initial, isInitialized, reinitial, setVolume, setPlaybackRate }

export {
  setResource,
  setPause,
  setPlay,
  setCurrentTime,
  getDuration,
  setStop,
  resetPlay,
  getPosition,
  updateMetaData,
  onStateChange,
  isEmpty,
  useBufferProgress,
  initTrackInfo,
  updateOptions,
} from './utils'
