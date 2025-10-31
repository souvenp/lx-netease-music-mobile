import { getListMusics } from '@/core/list';
import listState from '@/store/list/state';
import settingState from '@/store/setting/state';
import { LIST_IDS } from '@/config/constant';
import {getUserApiList, getUserApiScript} from "@/utils/data.ts";

export const getAllDataForSync = async () => {
  const defaultList = await getListMusics(listState.defaultList.id);
  const loveList = await getListMusics(listState.loveList.id);
  const tempList = await getListMusics(LIST_IDS.TEMP);
  const userList = [];
  for await (const list of listState.userList) {
    userList.push({ ...list, list: await getListMusics(list.id) });
  }
  const lists = { defaultList, loveList, userList, tempList };
  const settings = settingState.setting;

  const userApiList = await getUserApiList();
  const userApiScripts: Record<string, string> = {};
  for (const api of userApiList) {
    userApiScripts[api.id] = await getUserApiScript(api.id);
  }
  const userApis = {
    list: userApiList,
    scripts: userApiScripts,
  };

  return { lists, settings, userApis };
};
