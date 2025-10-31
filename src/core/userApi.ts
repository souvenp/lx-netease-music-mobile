import { action, state } from '@/store/userApi'
import {
  addUserApi,
  getUserApiScript,
  removeUserApi as removeUserApiFromStore,
  setUserApiAllowShowUpdateAlert as setUserApiAllowShowUpdateAlertFromStore,
} from '@/utils/data'
import { destroy, loadScript } from '@/utils/nativeModules/userApi'
import { log as writeLog } from '@/utils/log'
import {getAllKeys, removeDataMultiple, saveDataMultiple} from "@/plugins/storage.ts";
import {storageDataPrefix} from "@/config/constant.ts";

export const setUserApi = async (apiId: string) => {
  global.lx.qualityList = {}
  setUserApiStatus(false, 'initing')

  const target = state.list.find((api) => api.id === apiId)
  if (!target) throw new Error('api not found')
  const script = await getUserApiScript(target.id)
  loadScript({ ...target, script })
}

export const destroyUserApi = () => {
  destroy()
}

export const setUserApiStatus: (typeof action)['setStatus'] = (status, message) => {
  action.setStatus(status, message)
}

export const setUserApiList: (typeof action)['setUserApiList'] = (list) => {
  action.setUserApiList(list)
}

export const importUserApi = async (script: string) => {
  const info = await addUserApi(script)
  action.addUserApi(info)
}

export const removeUserApi = async (ids: string[]) => {
  const list = await removeUserApiFromStore(ids)
  action.setUserApiList(list)
}

export const setUserApiAllowShowUpdateAlert = async (id: string, enable: boolean) => {
  await setUserApiAllowShowUpdateAlertFromStore(id, enable)
  action.setUserApiAllowShowUpdateAlert(id, enable)
}

export const overwriteUserApis = async (data: { list: LX.UserApi.UserApiInfo[], scripts: Record<string, string> }) => {
  try {
    // 1. 清理不再存在的旧脚本
    const allKeys = await getAllKeys();
    const oldScriptKeys = allKeys.filter(key => key.startsWith(storageDataPrefix.userApi) && key !== storageDataPrefix.userApi);
    const newScriptIds = new Set(Object.keys(data.scripts));
    const keysToRemove = oldScriptKeys.filter(key => {
      const scriptId = key.substring(storageDataPrefix.userApi.length);
      return !newScriptIds.has(scriptId);
    });
    if (keysToRemove.length) await removeDataMultiple(keysToRemove);

    // 2. 批量保存新的元数据和所有脚本内容
    const saveTasks: Array<[string, any]> = [];
    saveTasks.push([storageDataPrefix.userApi, data.list]);
    for (const [id, script] of Object.entries(data.scripts)) {
      saveTasks.push([`${storageDataPrefix.userApi}${id}`, script]);
    }
    await saveDataMultiple(saveTasks);

    // 3. 更新内存中的状态
    action.setUserApiList(data.list);
  } catch (error: any) {
    log.error('Overwrite user apis failed:', error.message);
    throw error;
  }
};

export const log = {
  r_info(...params: any[]) {
    writeLog.info(...params)
  },
  r_warn(...params: any[]) {
    writeLog.warn(...params)
  },
  r_error(...params: any[]) {
    writeLog.error(...params)
  },
  log(...params: any[]) {
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  info(...params: any[]) {
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  warn(...params: any[]) {
    if (global.lx.isEnableUserApiLog) writeLog.warn(...params)
  },
  error(...params: any[]) {
    if (global.lx.isEnableUserApiLog) writeLog.error(...params)
  },
}
