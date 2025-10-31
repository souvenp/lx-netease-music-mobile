import { View } from 'react-native'
import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import CheckBox from '@/components/common/CheckBox'
import { handleDownload } from './listAction'
import { getLastSelectQuality, saveLastSelectQuality } from '@/utils/data'
import { addTask as addDownloadTask } from '@/core/download';

interface TitleType {
  updateTitle: (musicInfo: LX.Music.MusicInfo) => void
}
const Title = forwardRef<TitleType, {}>((props, ref) => {
  const [title, setTitle] = useState('')
  useImperativeHandle(ref, () => ({
    updateTitle(musicInfo) {
      setTitle(
        global.i18n.t('download_music_title', { name: musicInfo.name, artist: musicInfo.singer })
      )
    },
  }))

  return <Text style={{ marginBottom: 5 }}>{title}</Text>
})

interface PositionInputType {
  getText: () => string
  setText: (text: string) => void
  focus: () => void
}

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo
  selectedList: LX.Music.MusicInfo[]
  index: number
  listId: string
  single: boolean
}
const initSelectInfo = {}

interface MusicDownloadModalProps {
  onDownloadInfo: (info: LX.Music.MusicInfo) => void
}

export interface MusicDownloadModalType {
  show: (info: LX.Music.MusicInfo) => void
}


export default forwardRef<MusicDownloadModalType, MusicDownloadModalProps>(
  ({ onDownloadInfo }, ref) => {
    const alertRef = useRef<ConfirmAlertType>(null)
    const titleRef = useRef<TitleType>(null)
    const selectedInfo = useRef<LX.Music.MusicInfo>(initSelectInfo as LX.Music.MusicInfo)
    const [selectedQuality, setSelectedQuality] = useState<LX.Quality>('128k')
    const [playQualityList, setPlayQualityList] = useState<MusicOption[]>([])
    const [visible, setVisible] = useState(false)

    interface QualityMap {
      [key: string]: MusicOption
    }

    // 新增 useEffect 来处理音质选择逻辑
    useEffect(() => {
      if (!visible || !playQualityList.length) return

      const applyLastQuality = async() => {
        const lastQuality = await getLastSelectQuality()
        const qualityExists = playQualityList.some(q => q.id === lastQuality)
        if (qualityExists) {
          setSelectedQuality(lastQuality)
        } else {
          setSelectedQuality(playQualityList[0].id) // 降级到第一个可用音质
        }
      }

      void applyLastQuality()
    }, [visible, playQualityList]) // 依赖于弹窗可见性和音质列表

    const calcQualitys = (musicInfo: LX.Music.MusicInfo) => {
      const map = new Map()

      map.set('128k', global.i18n.t('128k'))
      map.set('320k', global.i18n.t('320k'))
      map.set('flac', global.i18n.t('flac'))
      map.set('hires', global.i18n.t('hires'))
      map.set('atmos', global.i18n.t('atmos'))
      map.set('atmos_plus', global.i18n.t('atmos_plus'))
      map.set('master', global.i18n.t('master'))

      // @ts-ignore
      const qualitys = musicInfo.meta.qualitys

      const qualityMap: QualityMap = {}
      for (const element of qualitys) {
        const temp: MusicOption = {
          id: element.type,
          name: map.has(element.type) ? map.get(element.type) : '未知',
          size: element.size,
          key: element.type,
        }
        qualityMap[element.type] = temp
      }
      setPlayQualityList(Object.values(qualityMap))
    }

    useImperativeHandle(ref, () => ({
      show(info) {
        selectedInfo.current = info
        titleRef.current?.updateTitle(info)
        // 先计算并触发音质列表状态更新
        calcQualitys(info)

        // 然后显示弹窗
        if (visible) {
          alertRef.current?.setVisible(true)
        } else {
          setVisible(true)
        }
      },
    }))

    // 当弹窗组件首次挂载或重新变为可见时，显示内部Dialog
    useEffect(() => {
      if (visible) {
        alertRef.current?.setVisible(true)
      }
    }, [visible])

    const handleDownloadMusic = () => {
      void saveLastSelectQuality(selectedQuality)
      alertRef.current?.setVisible(false)
      // handleDownload(selectedInfo.current, selectedQuality)
      addDownloadTask(selectedInfo.current, selectedQuality);
      // 下载后重置回默认值，以便下次打开时重新加载
      setTimeout(() => {
        setSelectedQuality('128k')
      }, 300)
    }

    interface MusicOption {
      id: LX.Quality
      name: string
      size?: string | null
      key?: string
    }

    const useActive = (id: LX.Quality) => {
      return useMemo(() => selectedQuality === id, [selectedQuality, id])
    }

    const Item = ({ id, name }: { id: LX.Quality; name: string }) => {
      const isActive = useActive(id)
      return (
        <CheckBox
          marginRight={8}
          check={isActive}
          label={name}
          onChange={() => {
            setSelectedQuality(id)
          }}
          need
        />
      )
    }

    return visible ? (
      <ConfirmAlert
        ref={alertRef}
        onConfirm={handleDownloadMusic}
        onHide={() => setVisible(false) } // 隐藏时卸载组件
      >
        <View style={styles.content}>
          <Title ref={titleRef} />
          <View style={styles.list}>
            {playQualityList.map((item) => (
              <Item name={item.name + (item.size ? ` (${item.size})` : '')} id={item.id} key={item.key} />
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
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 260,
    borderRadius: 4,
  },
  list: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
})
