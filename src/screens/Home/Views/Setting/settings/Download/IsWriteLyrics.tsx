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
  const isWriteLyrics = useSettingValue('download.writeLyric')
  const handleUpdate = (isWriteLyrics: boolean) => {
    updateSetting({ 'download.writeLyric': isWriteLyrics })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isWriteLyrics}
        onChange={handleUpdate}
        label={t('setting_download_write_lyric')}
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
