import { getListMusics } from '@/core/list';
import listState from '@/store/list/state';
import settingState from '@/store/setting/state';
import { LIST_IDS } from '@/config/constant';
import {getPlayHistory, getUserApiList, getUserApiScript} from "@/utils/data.ts";
import { normalizeDownloadTasksForSync } from '@/utils/data/download';
import downloadState from '@/store/download/state';

const SENSITIVE_SETTING_KEYS: Array<keyof LX.AppSetting> = [
  'common.wy_cookie',
  'common.wy_serpapi_key',
  'common.yt_cookie',
  'sync.webdav.password',
];

export const filterSensitiveSettingsForSync = (settings: Partial<LX.AppSetting>) => {
  const nextSettings = { ...settings };
  for (const key of SENSITIVE_SETTING_KEYS) {
    delete nextSettings[key];
  }
  return nextSettings;
};

const sanitizeOneDriveMusicInfoForSync = (musicInfo: LX.Music.MusicInfo): LX.Music.MusicInfo => {
  // 兼容旧记录缺少歌曲或元数据的情况，保留原始数据。
  const meta = musicInfo?.meta as Partial<LX.OneDrive.MusicInfo['meta']> | undefined;
  if (!meta?.oneDrive) return musicInfo;

  const nextMeta = { ...musicInfo.meta } as Partial<LX.OneDrive.MusicInfo['meta']>;
  delete nextMeta.webUrl;
  delete nextMeta.downloadUrl;
  delete nextMeta.picUrl;
  return {
    ...musicInfo,
    meta: nextMeta as LX.Music.MusicInfo['meta'],
  } as LX.Music.MusicInfo;
};

const sanitizeMusicListForSync = (list: LX.Music.MusicInfo[]) =>
  list.map(sanitizeOneDriveMusicInfoForSync);

const sanitizeListsForSync = (lists: LX.List.ListDataFull): LX.List.ListDataFull => ({
  defaultList: sanitizeMusicListForSync(lists.defaultList),
  loveList: sanitizeMusicListForSync(lists.loveList),
  tempList: sanitizeMusicListForSync(lists.tempList),
  userList: lists.userList.map(list => ({
    ...list,
    list: sanitizeMusicListForSync(list.list),
  })),
});

const sanitizePlayHistoryForSync = (history: LX.Player.PlayHistoryItem[]) =>
  history.map(item => ({
    ...item,
    musicInfo: sanitizeOneDriveMusicInfoForSync(item.musicInfo),
  }));

const sanitizeDownloadTasksForSync = (tasks: LX.Download.DownloadTask[]) =>
  tasks.map(task => ({
    ...task,
    musicInfo: sanitizeOneDriveMusicInfoForSync(task.musicInfo),
  }));

// 设置和音源独立读取，避免上传时被无关的歌曲数据阻断。
export const getSettingsForSync = () => filterSensitiveSettingsForSync(settingState.setting);

export const getUserApisForSync = async () => {
  const userApiList = await getUserApiList();
  const userApiScripts: Record<string, string> = {};
  for (const api of userApiList) {
    userApiScripts[api.id] = await getUserApiScript(api.id);
  }
  return { list: userApiList, scripts: userApiScripts };
};

export const getAllDataForSync = async () => {
  const defaultList = await getListMusics(listState.defaultList.id);
  const loveList = await getListMusics(listState.loveList.id);
  const tempList = await getListMusics(LIST_IDS.TEMP);
  const userList = [];
  for await (const list of listState.userList) {
    userList.push({ ...list, list: await getListMusics(list.id) });
  }
  const lists = sanitizeListsForSync({ defaultList, loveList, userList, tempList });
  const playHistory = sanitizePlayHistoryForSync(await getPlayHistory());
  const downloadTasks = sanitizeDownloadTasksForSync(normalizeDownloadTasksForSync(downloadState.tasks));
  const settings = getSettingsForSync();
  const userApis = await getUserApisForSync();

  return { lists, playHistory, downloadTasks, settings, userApis };
};
