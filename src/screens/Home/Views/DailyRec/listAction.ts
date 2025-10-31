import { LIST_IDS } from '@/config/constant'
import {
  setTempList,
  setActiveList,
  createList,
  removeUserList,
  getListMusics,
  overwriteListMusics,
  updateUserList
} from '@/core/list'
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
export const autoSaveDailyPlaylist = async(songList: LX.Music.MusicInfoOnline[]) => {
  if (!settingState.setting['list.isAutoSaveDailyRec']) return;
  if (!songList.length) return;

  const logicalDate = getLogicalDateForPlaylist();
  const month = (logicalDate.getMonth() + 1).toString().padStart(2, '0');
  const day = logicalDate.getDate().toString().padStart(2, '0');
  const playlistName = `${month}_${day}_daily`;

  const existingPlaylist = listState.userList.find(p => p.name === playlistName);

  if (existingPlaylist) {
    const existingSongs = await getListMusics(existingPlaylist.id);
    if (existingSongs.length && existingSongs[0].id === songList[0].id) {
      console.log(`歌单 ${playlistName} 无需更新，跳过保存。`);
      return;
    }
    console.log(`歌单 ${playlistName} 内容已更新，执行覆盖操作。`);
    await overwriteListMusics(existingPlaylist.id, songList);
    await updateUserList([{ ...existingPlaylist, locationUpdateTime: Date.now() }]);
    toast(`已自动更新每日推荐: ${playlistName}`);
  } else {
    const dailyPlaylists = listState.userList.filter(p => /\d{2}_\d{2}_daily/.test(p.name));
    if (dailyPlaylists.length >= 30) {
      dailyPlaylists.sort((a, b) => a.name.localeCompare(b.name));
      const oldestPlaylist = dailyPlaylists[0];
      if (oldestPlaylist) {
        await removeUserList([oldestPlaylist.id]);
      }
    }
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
  }
};
