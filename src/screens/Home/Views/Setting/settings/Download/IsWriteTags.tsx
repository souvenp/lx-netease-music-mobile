import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'

import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const isEnable = useSettingValue('download.enable')
  const isWriteTags = useSettingValue('download.writeMetadata')
  const handleUpdate = (isWriteTags: boolean) => {
    updateSetting({ 'download.writeMetadata': isWriteTags })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isWriteTags}
        onChange={handleUpdate}
        label={t('setting_download_write_metadata')}
        disabled={!isEnable}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
