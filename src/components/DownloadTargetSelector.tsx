import { useEffect, useState } from 'react'
import { View } from 'react-native'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { getOneDriveAuth } from '@/core/oneDrive/auth'
import { getOneDriveConfig, getOneDriveDownloadFolder } from '@/core/oneDrive/drive'
import { getWebDAVDownloadDestination } from '@/core/webdavDownload'

export default ({ value, onChange }: {
  value: NonNullable<LX.Download.DownloadTask['target']>
  onChange: (target: NonNullable<LX.Download.DownloadTask['target']>) => void
}) => {
  const url = useSettingValue('sync.webdav.url')
  const username = useSettingValue('sync.webdav.username')
  const password = useSettingValue('sync.webdav.password')
  const directory = useSettingValue('download.webdavPath')
  const [oneDriveReady, setOneDriveReady] = useState(false)
  let webdavReady = false
  if (url.trim() && username.trim() && password && directory.trim()) {
    try { getWebDAVDownloadDestination(); webdavReady = true } catch {}
  }

  // 打开下载窗口时读取账号及目录，显式选择根目录也有效。
  useEffect(() => {
    let active = true
    void Promise.all([getOneDriveAuth(), getOneDriveConfig()]).then(([auth, config]) => {
      if (active) setOneDriveReady(Boolean(auth?.clientId && (auth.refreshToken || (auth.accessToken && auth.expiresAt > Date.now())) &&
        (config.downloadFolderSelected || getOneDriveDownloadFolder(config) || config.scannedAt)))
    }).catch(() => { if (active) setOneDriveReady(false) })
    return () => { active = false }
  }, [])

  // 配置失效后恢复本地选项。
  useEffect(() => {
    if ((value === 'webdav' && !webdavReady) || (value === 'onedrive' && !oneDriveReady)) onChange('local')
  }, [value, webdavReady, oneDriveReady, onChange])

  return <View style={{ marginBottom: 8 }}>
    <CheckBox check={value === 'local'} label="下载到本地" onChange={() => onChange('local')} need />
    <CheckBox check={value === 'onedrive'} label="下载到 OneDrive" disabled={!oneDriveReady}
      helpDesc={oneDriveReady ? undefined : '请先登录 OneDrive 并设置下载目录。'} onChange={() => { if (oneDriveReady) onChange('onedrive') }} need />
    <CheckBox check={value === 'webdav'} label="下载到 WebDAV" disabled={!webdavReady}
      helpDesc={webdavReady ? undefined : '请先填写 WebDAV 地址、用户名、密码及音乐目录。'} onChange={() => { if (webdavReady) onChange('webdav') }} need />
  </View>
}
