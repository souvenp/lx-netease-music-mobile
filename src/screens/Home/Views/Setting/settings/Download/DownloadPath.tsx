// 文件路径: src/screens/Home/Views/Setting/settings/Download/DownloadPath.tsx
import { memo, useRef } from 'react'
import { View } from 'react-native'
import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import FileSelect, { type FileSelectType } from '@/components/common/FileSelect'
import { createStyle, toast } from '@/utils/tools'
import Text from '@/components/common/Text'
import RNFetchBlob from 'rn-fetch-blob'

export default memo(() => {
  const t = useI18n()
  const downloadPath = useSettingValue('download.path')
  const fileSelectRef = useRef<FileSelectType>(null)

  const defaultDownloadPath = RNFetchBlob.fs.dirs.MusicDir + '/LX-N Music'

  const handleSelectPath = () => {
    fileSelectRef.current?.show(
      {
        title: t('setting_download_path_select'),
        dirOnly: true,
      },
      (path) => {
        if (!path) return
        updateSetting({ 'download.path': path })
        toast(t('setting_download_path_set_success'))
      },
    )
  }

  const handleResetPath = () => {
    updateSetting({ 'download.path': '' })
    toast(t('setting_download_path_reset_success'))
  }

  return (
    <>
      <SubTitle title={t('setting_download_path')}>
        <Text style={styles.path} numberOfLines={2}>
          {/* 修改此处，显示具体路径 */}
          {t('setting_download_path_label', { path: downloadPath || defaultDownloadPath })}
        </Text>
        <View style={styles.btns}>
          <Button onPress={handleSelectPath}>{t('setting_download_path_select')}</Button>
          <Button onPress={handleResetPath}>{t('setting_download_path_default')}</Button>
        </View>
      </SubTitle>
      <FileSelect ref={fileSelectRef} />
    </>
  )
})

const styles = createStyle({
  path: {
    marginBottom: 10,
  },
  btns: {
    flexDirection: 'row',
  },
})
