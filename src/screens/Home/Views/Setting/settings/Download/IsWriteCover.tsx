import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'

import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  // const isEnable = useSettingValue('download.enable')
  const isWriteCover = useSettingValue('download.writePicture')
  const handleUpdate = (isWriteCover: boolean) => {
    updateSetting({ 'download.writePicture': isWriteCover })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isWriteCover}
        onChange={handleUpdate}
        label={t('setting_download_write_picture')}
        // disabled={!isEnable}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
