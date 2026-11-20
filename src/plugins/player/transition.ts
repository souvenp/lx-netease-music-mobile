import { NativeModules, Platform } from 'react-native'

const call = async (method: 'beginPlaybackTransition' | 'endPlaybackTransition') => {
  if (Platform.OS !== 'android') return
  // Old debug APKs can load JS updates; the native fix requires a new APK.
  const player = NativeModules.TrackPlayerModule
  if (!player?.[method]) return
  try {
    await player[method]()
  } catch {
    console.warn('播放切换唤醒锁操作失败')
  }
}

export const beginPlaybackTransition = () => call('beginPlaybackTransition')
export const endPlaybackTransition = () => call('endPlaybackTransition')
