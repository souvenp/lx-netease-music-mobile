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
import { pop } from '@/navigation'
import commonState from '@/store/common/state'
import ImageBackground from '@/components/common/ImageBackground'
import { useWindowSize } from '@/utils/hooks'
import { useBgPic } from '@/store/common/hook'
import { useSettingValue } from '@/store/setting/hook'
import { defaultHeaders } from '@/components/common/Image'

export interface DetailInfo {
  name: string
  desc: string
  playCount: string
  imgUrl?: string
}

const IMAGE_WIDTH = scaleSizeW(70)

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

export default ({ info, onBack }: { info: ListInfoItem, onBack?: () => void }) => {
  const musicListRef = useRef<MusicListType>(null)
  const [detailInfo, setDetailInfo] = useState<DetailInfo>({
    name: info.name,
    desc: info.desc || '',
    playCount: info.play_count || '',
    imgUrl: info.img,
  })

  const theme = useTheme()
  const windowSize = useWindowSize()
  const dynamicPic = useBgPic()
  const customBgPicPath = useSettingValue('theme.customBgPicPath')
  const pic = customBgPicPath || dynamicPic
  const picOpacity = useSettingValue('theme.picOpacity')
  const blur = useSettingValue('theme.blur')
  const BLUR_RADIUS = blur

  // 如果没有提供 onBack 函数，则默认使用 pop 导航返回
  const handleBack = onBack ?? (() => {
    void pop(commonState.componentIds.songlistDetail!)
  })

  // 为物理返回键设置返回逻辑
  useEffect(() => {
    const onBackPress = () => {
      // 检查是否有 ArtistDetail 或 AlbumDetail 屏幕存在
      if (commonState.componentIds.ARTIST_DETAIL || commonState.componentIds.ALBUM_DETAIL_SCREEN) {
        // 如果有，则不处理该事件，让原生导航库来 pop
        return false
      }

      // 否则，执行当前的返回逻辑
      handleBack()
      return true
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => subscription.remove()
  }, [handleBack])

  useEffect(() => {
    musicListRef.current?.loadList(info.source, info.id).then(setDetailInfo)
  }, [info.source, info.id])

  const ListHeaderComponent = useMemo(() => <ListHeader detailInfo={detailInfo} info={info} onBack={handleBack} />, [detailInfo, info, handleBack])

  const pageContent = (
    <ListInfoContext.Provider value={info}>
      {ListHeaderComponent}
      <MusicList ref={musicListRef} />
    </ListInfoContext.Provider>
  )

  const themeComponent = useMemo(
    () => (
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ImageBackground
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: windowSize.height,
            width: windowSize.width,
            backgroundColor: theme['c-content-background'],
          }}
          source={theme['bg-image']}
          resizeMode="cover"
        ></ImageBackground>
        <View
          style={{ flex: 1, flexDirection: 'column', backgroundColor: theme['c-main-background'] }}
        >
          {pageContent}
        </View>
      </View>
    ),
    [pageContent, theme, windowSize.height, windowSize.width]
  )

  const picComponent = useMemo(() => {
    return (
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ImageBackground
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: windowSize.height,
            width: windowSize.width,
            backgroundColor: theme['c-content-background'],
          }}
          source={{ uri: pic!, headers: defaultHeaders }}
          resizeMode="cover"
          blurRadius={BLUR_RADIUS}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
              backgroundColor: theme['c-content-background'],
              opacity: picOpacity / 100,
            }}
          ></View>
        </ImageBackground>
        <View style={{ flex: 1, flexDirection: 'column' }}>{pageContent}</View>
      </View>
    )
  }, [pageContent, pic, theme, windowSize.height, windowSize.width, BLUR_RADIUS, picOpacity])

  return (
    <View style={{ flex: 1 }}>
      {pic ? picComponent : themeComponent}
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
