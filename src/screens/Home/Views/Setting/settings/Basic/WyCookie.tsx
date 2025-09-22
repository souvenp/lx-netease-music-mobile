import { memo } from 'react'
import { View } from 'react-native'
import InputItem, { type InputItemProps } from '../../components/InputItem'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { createStyle } from '@/utils/tools'

export default memo(() => {
  const t = useI18n()
  const cookie = useSettingValue('common.wy_cookie')
  const setCookie = (val: string) => {
    updateSetting({ 'common.wy_cookie': val })
  }

  const handleChanged: InputItemProps['onChanged'] = (text, callback) => {
    callback(text)
    setCookie(text)
  }

  return (
    <View style={styles.content}>
      <InputItem
        value={cookie}
        label={t('setting_basic_wy_cookie')}
        onChanged={handleChanged}
        placeholder={t('setting_basic_wy_cookie_placeholder')}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 10,
  },
})
