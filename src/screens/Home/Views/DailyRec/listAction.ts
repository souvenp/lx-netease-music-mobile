import { LIST_IDS } from '@/config/constant'
import {setTempList, setActiveList, createList, removeUserList} from '@/core/list'
import { playList } from '@/core/player/player'
import listState from '@/store/list/state'
import {clearPlayedList} from "@/core/player/playedList.ts";
import settingState from '@/store/setting/state';
import {toast} from "@/utils/tools.ts";

export const handlePlay = async (list: LX.Music.MusicInfoOnline[], index = 0) => {
  const listId = 'dailyrec_wy'
  await setTempList(listId, [...list])
  clearPlayedList()
  setActiveList(LIST_IDS.TEMP)
  void playList(LIST_IDS.TEMP, index)
}

/**
 * 获取基于早上7点为分界的逻辑日期
 * @returns {Date} 计算后的日期对象
 */
const getLogicalDateForPlaylist = (): Date => {
  const now = new Date();
  // 如果当前时间在早上7点之前，则认为是前一天的日期
  if (now.getHours() < 7) {
    now.setDate(now.getDate() - 1);
  }
  return now;
};

/**
 * 自动保存每日推荐到我的列表
 * @param songList 每日推荐的歌曲列表
 */
export const autoSaveDailyPlaylist = async (songList: LX.Music.MusicInfoOnline[]) => {
  if (!settingState.setting['list.isAutoSaveDailyRec']) return;
  if (!songList.length) return;

  const logicalDate = getLogicalDateForPlaylist();
  const month = (logicalDate.getMonth() + 1).toString().padStart(2, '0');
  const day = logicalDate.getDate().toString().padStart(2, '0');
  const playlistName = `${month}_${day}_daily`;

  // 1. 检查当天的歌单是否已经存在
  if (listState.userList.some(p => p.name === playlistName)) {
    console.log(`歌单 ${playlistName} 已存在，跳过自动保存。`);
    return;
  }

  // 2. 管理历史歌单，保持最多30个
  const dailyPlaylists = listState.userList.filter(p => /\d{2}_\d{2}_daily/.test(p.name));
  if (dailyPlaylists.length >= 30) {
    // 按名称排序找到最早的歌单（例如 "08_15_daily" < "09_12_daily"）
    dailyPlaylists.sort((a, b) => a.name.localeCompare(b.name));
    const oldestPlaylist = dailyPlaylists[0];
    if (oldestPlaylist) {
      await removeUserList([oldestPlaylist.id]);
      // toast(`已删除旧的每日推荐歌单: ${oldestPlaylist.name}`);
    }
  }

  // 3. 创建新的每日推荐歌单
  try {
    await createList({
      name: playlistName,
      list: songList,
    });
    toast(`已自动保存每日推荐: ${playlistName}`);
  } catch (error: any) {
    toast(`自动保存每日推荐失败: ${error.message}`);
    console.error('自动保存每日推荐失败:', error);
  }
};
