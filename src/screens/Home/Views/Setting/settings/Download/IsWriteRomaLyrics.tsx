// src/screens/Home/Views/Setting/settings/Download/IsWriteRomaLyrics.tsx

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
  const isWriteRomaLyrics = useSettingValue('download.writeRomaLyric')
  const handleUpdate = (isWriteRomaLyrics: boolean) => {
    updateSetting({ 'download.writeRomaLyric': isWriteRomaLyrics })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isWriteRomaLyrics}
        onChange={handleUpdate}
        label={t('setting_download_write_roma_lyric')}
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
