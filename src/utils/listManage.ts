import {
  getUserLists as getUserListsFromStore,
  getListMusics as getListMusicsFromStore,
  overwriteListPosition,
  overwriteListUpdateInfo,
  removeListPosition,
  removeListUpdateInfo,
} from '@/utils/data'
import { arrPush, arrPushByPosition, arrUnshift } from '@/utils/common'
import { LIST_IDS } from '@/config/constant'
import { type ListOperation } from '@/core/sync/opQueue'

export const userLists: LX.List.UserListInfo[] = []
export const allMusicList = new Map<string, LX.Music.MusicInfo[]>()

export const setUserLists = (lists: LX.List.UserListInfo[]) => {
  userLists.splice(0, userLists.length, ...lists)
  return userLists
}

export const setMusicList = (
  listId: string,
  musicList: LX.Music.MusicInfo[]
): LX.Music.MusicInfo[] => {
  allMusicList.set(listId, musicList)
  return musicList
}

export const removeMusicList = (id: string) => {
  allMusicList.delete(id)
}

const createUserList = (
  { name, id, source, sourceListId, locationUpdateTime }: LX.List.UserListInfo,
  position: number
) => {
  if (position < 0 || position >= userLists.length) {
    userLists.push({
      name,
      id,
      source,
      sourceListId,
      locationUpdateTime,
    })
  } else {
    userLists.splice(position, 0, {
      name,
      id,
      source,
      sourceListId,
      locationUpdateTime,
    })
  }
}

const updateList = ({
                      name,
                      id,
                      source,
                      sourceListId,
                      locationUpdateTime,
                    }: LX.List.UserListInfo & { meta?: { id?: string } }) => {
  let index
  switch (id) {
    case LIST_IDS.DEFAULT:
    case LIST_IDS.LOVE:
      break
    case LIST_IDS.TEMP:
    default:
      index = userLists.findIndex((l) => l.id == id);
      if (index < 0) return
      userLists.splice(index, 1, {
        ...userLists[index],
        name,
        source,
        sourceListId,
        locationUpdateTime,
      })
      break
  }
}

const removeUserList = (id: string) => {
  const index = userLists.findIndex((l) => l.id == id)
  if (index < 0) return
  userLists.splice(index, 1)
}

const overwriteUserList = (lists: LX.List.UserListInfo[]) => {
  userLists.splice(0, userLists.length, ...lists);
};

export const getUserLists = async () => {
  const lists = await getUserListsFromStore();
  return setUserLists(lists);
};

export const listDataOverwrite = ({
                                    defaultList,
                                    loveList,
                                    userList,
                                    tempList,
                                  }: MakeOptional<LX.List.ListDataFull, 'tempList'>): string[] => {
  const updatedListIds: string[] = [];
  const newUserIds: string[] = [];
  const newUserListInfos = userList.map(({ list, ...listInfo }) => {
    if (allMusicList.has(listInfo.id)) updatedListIds.push(listInfo.id);
    newUserIds.push(listInfo.id);
    setMusicList(listInfo.id, list);
    return listInfo;
  });
  for (const list of userLists) {
    if (!allMusicList.has(list.id) || newUserIds.includes(list.id)) continue;
    removeMusicList(list.id);
    updatedListIds.push(list.id);
  }
  overwriteUserList(newUserListInfos);

  if (allMusicList.has(LIST_IDS.DEFAULT)) updatedListIds.push(LIST_IDS.DEFAULT);
  setMusicList(LIST_IDS.DEFAULT, defaultList);
  setMusicList(LIST_IDS.LOVE, loveList);
  updatedListIds.push(LIST_IDS.LOVE);
  if (tempList && allMusicList.has(LIST_IDS.TEMP)) {
    setMusicList(LIST_IDS.TEMP, tempList);
    updatedListIds.push(LIST_IDS.TEMP);
  }

  const newIds = [LIST_IDS.DEFAULT, LIST_IDS.LOVE, ...userList.map((l) => l.id)];
  if (tempList) newIds.push(LIST_IDS.TEMP);
  void overwriteListPosition(newIds);
  void overwriteListUpdateInfo(newIds);
  return updatedListIds;
};

export const userListCreate = ({
                                 name,
                                 id,
                                 source,
                                 sourceListId,
                                 position,
                                 locationUpdateTime,
                               }: {
  name: string;
  id: string;
  source?: LX.OnlineSource;
  sourceListId?: string;
  position: number;
  locationUpdateTime: number | null;
}) => {
  if (userLists.some((item) => item.id == id)) return;
  const newList: LX.List.UserListInfo = {
    name,
    id,
    source,
    sourceListId,
    locationUpdateTime,
  };
  createUserList(newList, position);
};

export const userListsRemove = (ids: string[]) => {
  const changedIds = [];
  for (const id of ids) {
    removeUserList(id);
    if (!allMusicList.has(id)) continue;
    removeMusicList(id);
    void removeListPosition(id);
    void removeListUpdateInfo(id);
    changedIds.push(id);
  }
  return changedIds;
};

export const userListsUpdate = (listInfos: LX.List.UserListInfo[]) => {
  for (const info of listInfos) {
    updateList(info);
  }
};

export const userListsUpdatePosition = (position: number, ids: string[]) => {
  const newUserLists = [...userLists];
  const updateLists: LX.List.UserListInfo[] = [];
  const map = new Map<string, LX.List.UserListInfo>();
  for (const item of newUserLists) map.set(item.id, item);
  for (const id of ids) {
    const listInfo = map.get(id)!;
    listInfo.locationUpdateTime = Date.now();
    updateLists.push(listInfo);
    map.delete(id);
  }

  newUserLists.splice(0, newUserLists.length, ...newUserLists.filter((mInfo) => map.has(mInfo.id)));
  newUserLists.splice(Math.min(position, newUserLists.length), 0, ...updateLists);
  setUserLists(newUserLists);
};

export const getListMusicSync = (id: string | null) => {
  return id ? (allMusicList.get(id) ?? []) : [];
};

/**
 * 获取列表内的歌曲
 * @param listId
 */
export const getListMusics = async (listId: string): Promise<LX.Music.MusicInfo[]> => {
  if (!listId) return [];
  if (allMusicList.has(listId)) return allMusicList.get(listId)!;

  const list = await getListMusicsFromStore(listId);
  return setMusicList(listId, list);
};

export const listMusicOverwrite = async (
  listId: string,
  musicInfos: LX.Music.MusicInfo[],
): Promise<string[]> => {
  setMusicList(listId, musicInfos);
  return [listId];
};

export const listMusicAdd = async (
  id: string,
  musicInfos: LX.Music.MusicInfo[],
  addMusicLocationType: LX.AddMusicLocationType,
): Promise<string[]> => {
  const targetList = await getListMusics(id);
  const listSet = new Set<string>();
  for (const item of targetList) listSet.add(item.id);
  musicInfos = musicInfos.filter((item) => {
    if (listSet.has(item.id)) return false;
    listSet.add(item.id);
    return true;
  });

  switch (addMusicLocationType) {
    case 'top':
      arrUnshift(targetList, musicInfos);
      break;
    case 'bottom':
    default:
      arrPush(targetList, musicInfos);
      break;
  }
  setMusicList(id, targetList);
  return [id];
};

export const listMusicRemove = async (listId: string, ids: string[]): Promise<string[]> => {
  let targetList = await getListMusics(listId);
  const idsToRemove = new Set(ids);
  const newList = targetList.filter((mInfo) => !idsToRemove.has(mInfo.id));
  targetList.splice(0, targetList.length, ...newList);
  return [listId];
};

export const listMusicMove = async (
  fromId: string,
  toId: string,
  musicInfos: LX.Music.MusicInfo[],
  addMusicLocationType: LX.AddMusicLocationType,
): Promise<string[]> => {
  return [
    ...(await listMusicRemove(fromId, musicInfos.map((musicInfo) => musicInfo.id))),
    ...(await listMusicAdd(toId, musicInfos, addMusicLocationType)),
  ];
};

export const listMusicUpdateInfo = async (
  musicInfos: LX.List.ListActionMusicUpdate,
): Promise<string[]> => {
  const updateListIds = new Set<string>();
  for (const { id, musicInfo } of musicInfos) {
    const targetList = await getListMusics(id);
    if (!targetList.length) continue;
    const index = targetList.findIndex((l) => l.id == musicInfo.id);
    if (index < 0) continue;

    const existingInfo = targetList[index];
    const newInfo = { ...existingInfo, ...musicInfo, meta: { ...existingInfo.meta, ...musicInfo.meta } };
    targetList.splice(index, 1, newInfo);
    updateListIds.add(id);
  }
  return Array.from(updateListIds);
};

export const listMusicUpdatePosition = async (
  listId: string,
  position: number,
  ids: string[],
): Promise<string[]> => {
  let targetList = await getListMusics(listId);
  const infos: LX.Music.MusicInfo[] = [];
  const map = new Map<string, LX.Music.MusicInfo>();
  for (const item of targetList) map.set(item.id, item);
  for (const id of ids) {
    const info = map.get(id);
    if (info) {
      infos.push(info);
      map.delete(id);
    }
  }

  const list = targetList.filter((mInfo) => map.has(mInfo.id));
  arrPushByPosition(list, infos, Math.min(position, list.length));
  targetList.splice(0, targetList.length, ...list);
  return [listId];
};

export const listMusicClear = async (ids: string[]): Promise<string[]> => {
  const changedIds: string[] = [];
  for (const id of ids) {
    const list = await getListMusics(id);
    if (!list.length) continue;
    setMusicList(id, []);
    changedIds.push(id);
  }
  return changedIds;
};

// 应用单个操作的完整函数
export async function applyListOperation(
  currentData: LX.List.ListDataFull,
  operation: ListOperation
): Promise<LX.List.ListDataFull> {
  const data = JSON.parse(JSON.stringify(currentData));

  const userListMap = new Map(data.userList.map(l => [l.id, l]));
  const getTargetList = (listId: string): LX.Music.MusicInfo[] | undefined => {
    return listId === LIST_IDS.DEFAULT ? data.defaultList :
      listId === LIST_IDS.LOVE ? data.loveList :
        userListMap.get(listId)?.list;
  };

  switch (operation.action) {
    case 'list_data_overwrite':
      return operation.data as LX.List.ListDataFull;

    case 'list_create': {
      let position = operation.data.position;
      operation.data.listInfos.forEach(info => {
        if (userListMap.has(info.id)) return;
        const newList: LX.List.UserListInfoFull = { ...info, list: [] };
        userListMap.set(info.id, newList);
        data.userList.splice(position++, 0, newList);
      });
      break;
    }

    case 'list_remove': {
      operation.data.forEach(id => userListMap.delete(id));
      break;
    }

    case 'list_update': {
      operation.data.forEach(info => {
        const target = userListMap.get(info.id);
        if (target) Object.assign(target, { ...info, list: target.list });
      });
      break;
    }

    case 'list_update_position': {
      const allUserLists = Array.from(userListMap.values());
      const listsToMove: LX.List.UserListInfoFull[] = [];
      const remainingMap = new Map(userListMap);
      const idsToMove = new Set(operation.data.ids);

      idsToMove.forEach(id => {
        const list = remainingMap.get(id);
        if (list) {
          listsToMove.push(list);
          remainingMap.delete(id);
        }
      });

      const remainingLists = Array.from(remainingMap.values());
      remainingLists.splice(Math.min(operation.data.position, remainingLists.length), 0, ...listsToMove);
      data.userList = remainingLists;
      break;
    }

    case 'list_music_overwrite': {
      const targetList = getTargetList(operation.data.listId);
      if (targetList) {
        targetList.length = 0;
        targetList.push(...operation.data.musicInfos);
      }
      break;
    }

    case 'list_music_add': {
      const targetList = getTargetList(operation.data.id);
      if (!targetList) break;

      const existingIds = new Set(targetList.map(s => s.id));
      const songsToAdd = operation.data.musicInfos.filter(s => !existingIds.has(s.id));

      if (operation.data.addMusicLocationType === 'top') {
        targetList.unshift(...songsToAdd);
      } else {
        targetList.push(...songsToAdd);
      }
      break;
    }

    case 'list_music_move': {
      const { fromId, toId, musicInfos, addMusicLocationType } = operation.data;
      const fromList = getTargetList(fromId);
      const toList = getTargetList(toId);

      if (!fromList || !toList) break;

      const idsToMove = new Set(musicInfos.map(m => m.id));
      const remainingFromSongs = fromList.filter(song => !idsToMove.has(song.id));
      fromList.length = 0;
      fromList.push(...remainingFromSongs);

      const existingToIds = new Set(toList.map(s => s.id));
      const songsToAdd = musicInfos.filter(s => !existingToIds.has(s.id));

      if (addMusicLocationType === 'top') {
        toList.unshift(...songsToAdd);
      } else {
        toList.push(...songsToAdd);
      }
      break;
    }

    case 'list_music_remove': {
      const targetList = getTargetList(operation.data.listId);
      if (!targetList) break;
      const idsToRemove = new Set(operation.data.ids);
      const newList = targetList.filter(song => !idsToRemove.has(song.id));
      targetList.length = 0;
      targetList.push(...newList);
      break;
    }

    case 'list_music_update': {
      operation.data.forEach(({ id: listId, musicInfo }) => {
        const targetList = getTargetList(listId);
        if (!targetList) return;
        const index = targetList.findIndex(m => m.id === musicInfo.id);
        if (index > -1) {
          const existingInfo = targetList[index];
          targetList[index] = { ...existingInfo, ...musicInfo, meta: { ...existingInfo.meta, ...musicInfo.meta } };
        }
      });
      break;
    }

    case 'list_music_update_position': {
      const { listId, position, ids } = operation.data;
      const targetList = getTargetList(listId);
      if (!targetList) break;

      const songsToMove: LX.Music.MusicInfo[] = [];
      const map = new Map<string, LX.Music.MusicInfo>();
      targetList.forEach(song => map.set(song.id, song));

      ids.forEach(id => {
        const song = map.get(id);
        if (song) {
          songsToMove.push(song);
          map.delete(id);
        }
      });

      const remainingSongs = Array.from(map.values());
      remainingSongs.splice(Math.min(position, remainingSongs.length), 0, ...songsToMove);
      targetList.length = 0;
      targetList.push(...remainingSongs);
      break;
    }

    case 'list_music_clear': {
      operation.data.forEach(listId => {
        const targetList = getTargetList(listId);
        if (targetList) targetList.length = 0;
      });
      break;
    }
  }

  data.userList = Array.from(userListMap.values());
  return data;
}
