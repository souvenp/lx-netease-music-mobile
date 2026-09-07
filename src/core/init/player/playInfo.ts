import { getPlayInfo } from '@/utils/data'
import { getListMusics } from '@/core/list'
import { playList, play } from '@/core/player/player'
import { LIST_IDS } from "@/config/constant.ts"
import listAction from '@/store/list/action'

/**
 * 恢复「上次播放」的列表与歌曲，并在需要时自动播放。
 * - 供 app 启动初始化调用（沿用原有行为）。
 * - 也供系统 / 蓝牙 / One UI 等外部「播放」指令在无当前曲目时调用，
 *   让 app 能像网易云一样「没选歌也自动播一首」，而不再静默 return。
 *
 * @param autoPlay 是否恢复后立即播放（外部播放指令应传 true）
 */
export const restoreAndPlay = async (autoPlay: boolean = false): Promise<boolean> => {
  const info = await getPlayInfo()
  global.lx.restorePlayInfo = null
  if (!info?.listId || info.index < 0) return false

  // 如果恢复的是临时列表，并且有元数据，则恢复元数据
  if (info.listId === LIST_IDS.TEMP && info.tempMeta) {
    listAction.setTempListMeta(info.tempMeta)
  }
  const list = await getListMusics(info.listId)
  if (!list[info.index]) return false
  global.lx.restorePlayInfo = info

  await playList(info.listId, info.index)

  if (autoPlay) setTimeout(play)
  return true
}

export default async (setting: LX.AppSetting) => {
  // 启动初始化时，是否自动播放取决于用户的「启动后自动播放」设置
  await restoreAndPlay(setting['player.startupAutoPlay'])
}
