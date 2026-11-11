import { NativeModules, Platform } from 'react-native'

// 路径对应系统媒体记录的指纹；null 表示接口或权限不可用，必须回退检查。
export const getLocalAudioIndex = async (paths: string[]): Promise<Record<string, string> | null> => {
  if (Platform.OS !== 'android' || !NativeModules.UtilsModule?.getLocalAudioIndex) return null
  try {
    return await NativeModules.UtilsModule.getLocalAudioIndex(paths)
  } catch {
    return null
  }
}
