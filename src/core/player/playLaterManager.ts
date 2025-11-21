import { addListMusicsAtPosition } from '@/core/list';
import playerState from '@/store/player/state';
import { LIST_IDS } from '@/config/constant';

// 这个变量用于追踪最后一首“稍后播放”歌曲在列表中的位置
let lastInsertedIndex = -1;

/**
 * 重置插入位置的函数，当当前播放的歌曲改变时调用
 */
const resetInsertPosition = () => {
  lastInsertedIndex = -1;
};

/**
 * 初始化管理器，监听歌曲切换事件
 */
export const init = () => {
  global.app_event.on('musicToggled', resetInsertPosition);
};

/**
 * 将歌曲添加到“稍后播放”的位置
 * @param musicInfos 要添加的歌曲信息数组
 */
export const addSongsToPlayLater = (musicInfos: Array<LX.Music.MusicInfo | LX.Download.ListItem>) => {
  // 如果没有歌曲在播放，则无法确定“下一首”的位置
  if (!playerState.playMusicInfo.musicInfo) return;

  // 目标列表就是当前播放器正在使用的列表
  const listId = playerState.playInfo.playerListId;
  if (!listId || listId === LIST_IDS.DOWNLOAD) return; // 不处理下载列表

  const currentPlayIndex = playerState.playInfo.playIndex;

  // 如果 lastInsertedIndex 还未设置（即这是本次播放中的第一次“稍后播放”），
  // 则插入位置在当前播放歌曲的后面。否则，在上一首“稍后播放”歌曲的后面。
  const insertionIndex = lastInsertedIndex > -1 ? lastInsertedIndex + 1 : currentPlayIndex + 1;

  // 调用新的列表操作方法来插入歌曲
  void addListMusicsAtPosition(listId, [...musicInfos], insertionIndex);

  // 更新最后插入的位置索引，以便下一次调用时能正确排序
  lastInsertedIndex = insertionIndex + musicInfos.length - 1;
};
