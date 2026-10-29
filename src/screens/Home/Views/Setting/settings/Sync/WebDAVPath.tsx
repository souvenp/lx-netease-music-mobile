import { memo } from 'react'
import InputItem from '../../components/InputItem'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { normalizeWebDAVDirectory } from '@/core/webdavDownload'
import { toast } from '@/utils/tools'

export default memo(() => {
  const path = useSettingValue('download.webdavPath')
  return <InputItem label="WebDAV 下载目录" value={path} placeholder="/Music" onChanged={(text, callback) => {
    try {
      const directory = normalizeWebDAVDirectory(text)
      updateSetting({ 'download.webdavPath': directory })
      callback(directory)
    } catch (error) {
      toast(error instanceof Error ? error.message : '目录格式不正确')
      callback(path)
    }
  }} />
})
