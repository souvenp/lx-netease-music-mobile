import { connectServer } from '@/plugins/sync'
import { updateSetting } from '@/core/common'
import { getSyncHost } from '@/plugins/sync/data'
import {triggerWebDAVSync} from "@/core/sync/webdavSync.ts";

export default async (setting: LX.AppSetting) => {
  if (setting['sync.webdav.url']) {
    void triggerWebDAVSync();
  }
  if (!setting['sync.enable']) return

  const host = await getSyncHost()
  // console.log(host)
  if (!host) {
    updateSetting({ 'sync.enable': false })
    return
  }
  void connectServer(host)
}
