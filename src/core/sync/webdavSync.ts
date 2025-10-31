import * as webdav from '@/utils/webdav';
import { overwriteListFull } from '@/core/list';
import { getAllDataForSync } from './syncHelpers';
import { confirmDialog, toast } from '@/utils/tools';
import { updateSetting } from '@/core/common';
import settingState from '@/store/setting/state';
import { log } from '@/utils/log';
import { debounce } from '@/utils/common';
import { getOperationQueue, clearOperationQueue, loadOperationQueue } from './opQueue';
import { applyListOperation } from '@/utils/listManage';
import {overwriteUserApis} from "@/core/userApi.ts";

let listsChanged = false;
let isSyncing = false;

// 初始化时加载操作队列
void loadOperationQueue();

const debouncedSync = debounce(() => {
  if (!settingState.setting['sync.webdav.enable'] || !settingState.setting['sync.webdav.syncLists']) return;
  // 自动同步只处理列表
  if (listsChanged) {
    void triggerWebDAVSync(false).finally(() => {
      listsChanged = false;
    });
  }
}, 3000);

export const markListsChanged = () => {
  if (!settingState.setting['sync.webdav.enable']) return;
  listsChanged = true;
  debouncedSync();
};

function getRemoteListsFilePath(): string {
  const path = settingState.setting['sync.webdav.path'] || '/LX_Music/';
  const cleanPath = '/' + path.replace(/^\/|\/$/g, '');
  return `${cleanPath}/playlists.json`;
}

function getRemoteSettingsFilePath(): string {
  const path = settingState.setting['sync.webdav.path'] || '/LX_Music/';
  const cleanPath = '/' + path.replace(/^\/|\/$/g, '');
  return `${cleanPath}/settings.json`;
}

function getRemoteUserApisFilePath(): string {
  const path = settingState.setting['sync.webdav.path'] || '/LX_Music/';
  const cleanPath = '/' + path.replace(/^\/|\/$/g, '');
  return `${cleanPath}/user_apis.json`;
}

async function uploadUserApis(path: string): Promise<number> {
  const timestamp = Date.now();
  const { userApis } = await getAllDataForSync();
  const dataObject = {
    version: '2',
    lastModified: timestamp,
    data: userApis,
  };
  await webdav.uploadFile(path, JSON.stringify(dataObject));
  return timestamp;
}

async function uploadLists(path: string, listsData: LX.List.ListDataFull): Promise<number> {
  const timestamp = Date.now();
  const dataObject = {
    version: '2',
    lastModified: timestamp,
    data: listsData,
  };
  await webdav.uploadFile(path, JSON.stringify(dataObject));
  updateSetting({ 'sync.webdav.lastSyncTimeLists': timestamp });
  return timestamp;
}

async function uploadSettings(path: string): Promise<number> {
  const timestamp = Date.now();
  const { settings } = await getAllDataForSync();
  const dataObject = {
    version: '2',
    lastModified: timestamp,
    data: settings,
  };
  await webdav.uploadFile(path, JSON.stringify(dataObject));
  return timestamp;
}

export async function manualUploadSettingsAndApis() {
  if (isSyncing) {
    toast('正在同步中，请稍后...');
    return;
  }
  if (!settingState.setting['sync.webdav.enable'] || !settingState.setting['sync.webdav.url']) {
    toast('请先启用并配置 WebDAV 同步');
    return;
  }

  const confirm = await confirmDialog({
    title: '确认上传',
    message: '这将使用本地的“设置”和“自定义音源”完全覆盖云端的数据，此操作不可逆，确定要继续吗？',
    confirmButtonText: '上传',
  });
  if (!confirm) return;

  isSyncing = true;
  toast('开始上传...');
  try {
    const remoteSettingsPath = getRemoteSettingsFilePath();
    const remoteUserApisPath = getRemoteUserApisFilePath();

    await uploadSettings(remoteSettingsPath);
    await uploadUserApis(remoteUserApisPath);

    toast('上传成功！');
  } catch (error: any) {
    log.error(`[WebDAV Manual Upload] Failed: ${error.stack ?? error.message}`);
    toast(`上传失败: ${error.message}`, 'long');
  } finally {
    isSyncing = false;
  }
}

export async function manualDownloadSettingsAndApis() {
  if (isSyncing) {
    toast('正在同步中，请稍后...');
    return;
  }
  if (!settingState.setting['sync.webdav.enable'] || !settingState.setting['sync.webdav.url']) {
    toast('请先启用并配置 WebDAV 同步');
    return;
  }

  const confirm = await confirmDialog({
    title: '确认下载',
    message: '这将使用云端的“设置”和“自定义音源”完全覆盖本地的数据，此操作不可逆，确定要继续吗？',
    confirmButtonText: '下载',
  });
  if (!confirm) return;

  isSyncing = true;
  toast('开始下载...');
  try {
    const remoteSettingsPath = getRemoteSettingsFilePath();
    const remoteUserApisPath = getRemoteUserApisFilePath();

    // 下载并应用设置
    const remoteSettingsContent = await webdav.downloadFile(remoteSettingsPath);
    if (remoteSettingsContent) {
      const remoteSettingsData = JSON.parse(remoteSettingsContent);
      updateSetting(remoteSettingsData.data, true);
    } else {
      toast('云端未找到设置文件，跳过设置同步');
    }

    // 下载并应用自定义音源
    const remoteUserApisContent = await webdav.downloadFile(remoteUserApisPath);
    if (remoteUserApisContent) {
      const remoteApisData = JSON.parse(remoteUserApisContent);
      await overwriteUserApis(remoteApisData.data);
    } else {
      toast('云端未找到自定义音源文件，跳过音源同步');
    }

    toast('下载同步完成！');
  } catch (error: any) {
    log.error(`[WebDAV Manual Download] Failed: ${error.stack ?? error.message}`);
    toast(`下载失败: ${error.message}`, 'long');
  } finally {
    isSyncing = false;
  }
}

export async function triggerWebDAVSync(isManual = false) {
  if (isSyncing) {
    if (isManual) toast('正在同步中，请稍后...');
    return;
  }
  if (!settingState.setting['sync.webdav.enable'] || !settingState.setting['sync.webdav.url']) {
    if (isManual) toast('请先启用并配置 WebDAV 同步');
    return;
  }

  isSyncing = true;
  if (isManual) toast('开始同步歌单...');

  const remoteListsPath = getRemoteListsFilePath();

  try {
    const remoteListsContent = await webdav.downloadFile(remoteListsPath);
    const localOpQueue = getOperationQueue();

    if (remoteListsContent === null) {
      log.info('[WebDAV Sync] Remote lists not found. Uploading local state.');
      const { lists } = await getAllDataForSync();
      await uploadLists(remoteListsPath, lists);
      await clearOperationQueue();
      if (isManual) toast('歌单上传成功！');
    } else {
      const remoteData = JSON.parse(remoteListsContent);
      const remoteTimestamp = remoteData.lastModified;
      const localTimestamp = settingState.setting['sync.webdav.lastSyncTimeLists'] ?? 0;
      const hasRemoteUpdate = remoteTimestamp > localTimestamp;
      const hasLocalChanges = localOpQueue.length > 0;

      if (hasRemoteUpdate) {
        log.info('[WebDAV Sync] Remote is newer. Starting merge process.');
        let mergedData = remoteData.data;
        let conflictOccurred = false;

        if (hasLocalChanges) {
          log.info(`[WebDAV Sync] Applying ${localOpQueue.length} local operations onto remote data.`);
          try {
            for (const op of localOpQueue) {
              mergedData = await applyListOperation(mergedData, op);
            }
          } catch (error: any) {
            conflictOccurred = true;
            log.error('[WebDAV Sync] A true conflict occurred during operation merge:', error.message);
          }
        }

        if (conflictOccurred) {
          const userChoice = await confirmDialog({
            title: '同步冲突',
            message: '云端和本地的歌单修改无法自动合并。请选择要保留的版本：\n\n为防止意外，建议在操作前先备份当前歌单。',
            cancelButtonText: '云端覆盖本地',
            confirmButtonText: '本地覆盖云端',
          });
          if (userChoice === true) { // 用户选择 "本地覆盖云端"
            log.info('[WebDAV Sync] Conflict resolved by user: Force pushing local state.');
            const { lists: currentLocalLists } = await getAllDataForSync();
            await uploadLists(remoteListsPath, currentLocalLists);
            await clearOperationQueue();
            toast('已强制使用本地歌单覆盖云端！');
          } else if (userChoice === false) { // 用户选择 "云端覆盖本地"
            log.info('[WebDAV Sync] Conflict resolved by user: Force pulling remote state.');
            await overwriteListFull(remoteData.data);
            await clearOperationQueue();
            updateSetting({ 'sync.webdav.lastSyncTimeLists': remoteTimestamp }, true);
            toast('已从云端同步歌单，本地更改已放弃！');
          } else { // 用户关闭了对话框 (userChoice === null)
            log.info('[WebDAV Sync] Conflict resolution cancelled by user.');
            toast('操作已取消');
          }
        } else {
          log.info('[WebDAV Sync] Merge successful or only remote changes detected.');
          await overwriteListFull(mergedData); // 应用合并后的数据到本地
          if (hasLocalChanges) {
            await uploadLists(remoteListsPath, mergedData); // 将合并后的结果上传
            if (isManual) toast('歌单合并同步成功！');
          } else {
            updateSetting({ 'sync.webdav.lastSyncTimeLists': remoteTimestamp }, true);
            if (isManual) toast('歌单已从云端同步！');
          }
          await clearOperationQueue(); // 成功后清空队列
        }
      } else if (hasLocalChanges) {
        log.info('[WebDAV Sync] Local has unsynced changes. Uploading.');
        const { lists: currentLocalLists } = await getAllDataForSync();
        await uploadLists(remoteListsPath, currentLocalLists);
        await clearOperationQueue();
        if (isManual) toast('本地歌单已上传！');
      } else if (isManual) {
        log.info('[WebDAV Sync] Lists are up to date.');
        toast('歌单已是最新，无需同步');
      }
    }
  } catch (error: any) {
    log.error(`[WebDAV Sync] Sync failed: ${error.stack ?? error.message}`);
    toast(`同步失败: ${error.message}`, 'long');
  } finally {
    isSyncing = false;
  }
}
