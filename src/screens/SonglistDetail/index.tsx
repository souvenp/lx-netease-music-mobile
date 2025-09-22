import { useEffect, useRef, useState, useMemo } from 'react'
import { View, BackHandler } from 'react-native'

import MusicList, { type MusicListType } from './MusicList'
import { type ListInfoItem } from '@/store/songlist/state'
import { ListInfoContext } from './state'
import ActionBar from './ActionBar'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { createStyle } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { pop } from '@/navigation' // **重新导入 pop**
import commonState from '@/store/common/state' // **重新导入 commonState**

export interface DetailInfo {
  name: string
  desc: string
  playCount: string
  imgUrl?: string
}

const IMAGE_WIDTH = scaleSizeW(70)

// 头部内容现在是一个普通的组件
const ListHeader = ({ detailInfo, info, onBack }: { detailInfo: DetailInfo, info: ListInfoItem, onBack: () => void }) => {
  const theme = useTheme()
  return (
    <View style={{ ...styles.listHeaderContainer, borderBottomColor: theme['c-border-background'] }}>
      <View style={{ flexDirection: 'row', flexGrow: 0, flexShrink: 0, padding: 10 }}>
        <View style={{ ...styles.listItemImg, width: IMAGE_WIDTH, height: IMAGE_WIDTH }}>
          <Image
            nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${info.id}`}
            url={detailInfo.imgUrl}
            style={{ flex: 1, borderRadius: 4 }}
          />
          {/*{detailInfo.playCount ? (*/}
          {/*  <Text style={styles.playCount} numberOfLines={1}>*/}
          {/*    {detailInfo.playCount}*/}
          {/*  </Text>*/}
          {/*) : null}*/}
        </View>
        <View
          style={{ flexDirection: 'column', flexGrow: 1, flexShrink: 1, paddingLeft: 5 }}
          nativeID={NAV_SHEAR_NATIVE_IDS.songlistDetail_title}
        >
          <Text size={14} numberOfLines={1}>
            {detailInfo.name}
          </Text>
          <View style={{ flexGrow: 0, flexShrink: 1 }}>
            <Text size={13} color={theme['c-font-label']} numberOfLines={4}>
              {detailInfo.desc}
            </Text>
          </View>
        </View>
      </View>
      <ActionBar onBack={onBack} />
    </View>
  )
}

// **核心修改: 让 onBack 变为可选，并提供默认的 pop 行为**
export default ({ info, onBack }: { info: ListInfoItem, onBack?: () => void }) => {
  const musicListRef = useRef<MusicListType>(null)
  const [detailInfo, setDetailInfo] = useState<DetailInfo>({
    name: info.name,
    desc: info.desc || '',
    playCount: info.play_count || '',
    imgUrl: info.img,
  })

  // 如果没有提供 onBack 函数，则默认使用 pop 导航返回
  const handleBack = onBack ?? (() => {
    void pop(commonState.componentIds.songlistDetail!)
  })

  // 为物理返回键设置返回逻辑
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack()
      return true
    })
    return () => subscription.remove()
  }, [handleBack])


  useEffect(() => {
    musicListRef.current?.loadList(info.source, info.id).then(setDetailInfo)
  }, [info.source, info.id])

  const ListHeaderComponent = useMemo(() => <ListHeader detailInfo={detailInfo} info={info} onBack={handleBack} />, [detailInfo, info, handleBack])

  return (
    <View style={{ flex: 1 }}>
      <ListInfoContext.Provider value={info}>
        {ListHeaderComponent}
        <MusicList ref={musicListRef} />
      </ListInfoContext.Provider>
    </View>
  )
}

const styles = createStyle({
  listHeaderContainer: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    borderBottomWidth: BorderWidths.normal,
  },
  listItemImg: {
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  playCount: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    fontSize: 12,
    paddingLeft: 3,
    paddingRight: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
})
