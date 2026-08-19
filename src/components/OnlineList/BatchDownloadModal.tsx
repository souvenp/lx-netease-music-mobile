import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle } from '@/utils/tools'
import { batchDownload } from '@/core/download'
import { getLastSelectQuality, saveLastSelectQuality } from '@/utils/data'

export interface BatchDownloadModalType {
  show: (list: LX.Music.MusicInfo[]) => void
}

const qualityList: Array<{ id: LX.Quality; name: string }> = [
  { id: '128k', name: '128k' },
  { id: '320k', name: '320k' },
  { id: 'flac', name: 'FLAC' },
  { id: 'hires', name: 'Hi-Res' },
  { id: 'atmos', name: 'Atmos' },
  { id: 'atmos_plus', name: 'Atmos Plus' },
  { id: 'master', name: 'Master' },
]

export default forwardRef<BatchDownloadModalType, { onConfirm?: () => void }>(
  ({ onConfirm }, ref) => {
    const alertRef = useRef<ConfirmAlertType>(null)
    const selectedListRef = useRef<LX.Music.MusicInfo[]>([])
    const showOneDriveDownload = useSettingValue('menu.downloadOneDrive')
    const [visible, setVisible] = useState(false)
    const [selectedQuality, setSelectedQuality] = useState<LX.Quality>('128k')
    const [selectedTarget, setSelectedTarget] = useState<'local' | 'onedrive'>('local')

    useImperativeHandle(ref, () => ({
      show(list) {
        selectedListRef.current = list
        setSelectedTarget('local')
        void getLastSelectQuality().then(quality => {
          if (qualityList.some(item => item.id === quality)) setSelectedQuality(quality)
        })
        if (visible) alertRef.current?.setVisible(true)
        else setVisible(true)
      },
    }))

    useEffect(() => {
      if (visible) alertRef.current?.setVisible(true)
    }, [visible])

    const title = useMemo(() => {
      return `批量下载 ${selectedListRef.current.length} 首歌曲`
    }, [visible])

    const handleConfirm = async() => {
      const target = showOneDriveDownload && selectedTarget === 'onedrive' ? 'onedrive' : 'local'
      alertRef.current?.setVisible(false)
      void saveLastSelectQuality(selectedQuality)
      void batchDownload(
        selectedListRef.current,
        selectedQuality,
        target
      )
      onConfirm?.()
    }

    return visible ? (
      <ConfirmAlert
        ref={alertRef}
        onConfirm={handleConfirm}
        onHide={() => setVisible(false)}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {showOneDriveDownload ? (
            <View style={styles.group}>
              <CheckBox
                marginRight={8}
                check={selectedTarget === 'local'}
                label="下载到本地"
                onChange={() => setSelectedTarget('local')}
                need
              />
              <CheckBox
                marginRight={8}
                check={selectedTarget === 'onedrive'}
                label="下载到 OneDrive"
                onChange={() => setSelectedTarget('onedrive')}
                need
              />
            </View>
          ) : null}
          <View style={styles.group}>
            {qualityList.map(item => (
              <CheckBox
                key={item.id}
                marginRight={8}
                check={selectedQuality === item.id}
                label={item.name}
                onChange={() => setSelectedQuality(item.id)}
                need
              />
            ))}
          </View>
        </View>
      </ConfirmAlert>
    ) : null
  }
)

const styles = createStyle({
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
  },
  title: {
    marginBottom: 8,
  },
  group: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    marginBottom: 8,
  },
})
