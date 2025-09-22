import { memo, useMemo } from 'react'

import { StyleSheet, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { isEnabled } from 'react-native/Libraries/Performance/Systrace'

const setdownloadFileNameFormat = (type: LX.DownloadFileNameFormat) => {
  updateSetting({ 'download.fileName': type })
}

const useActive = (id: LX.DownloadFileNameFormat) => {
  const downloadFileNameFormat = useSettingValue('download.fileName')
  const isActive = useMemo(() => downloadFileNameFormat == id, [downloadFileNameFormat, id])
  return isActive
}

const Item = ({ id, name }: { id: LX.DownloadFileNameFormat; name: string }) => {
  const isActive = useActive(id)
  const isEnable = useSettingValue('download.enable')
  return (
    <CheckBox
      marginRight={8}
      check={isActive}
      label={name}
      onChange={() => {
        setdownloadFileNameFormat(id)
      }}
      disabled={!isEnable}
      need
    />
  )
}

export default memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_download_filename_label')}>
      <View style={styles.list}>
        <Item id="歌名 - 歌手" name={t('setting_download_filename_format_1')} />
        <Item id="歌手 - 歌名" name={t('setting_download_filename_format_2')} />
        <Item id="歌名" name={t('setting_download_filename_format_3')} />
      </View>
    </SubTitle>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})
