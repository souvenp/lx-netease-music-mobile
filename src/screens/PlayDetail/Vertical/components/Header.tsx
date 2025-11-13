import { memo, useRef, useCallback, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { pop, navigations } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import { usePlayMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import { useStatusbarHeight } from '@/store/common/hook'
import Btn from './Btn'
import TimeoutExitBtn from './TimeoutExitBtn'
import Marquee from './Marquee'
import StatusBar from '@/components/common/StatusBar'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)

const Title = () => {
  const theme = useTheme()
  const playMusicInfo = usePlayMusicInfo()
  const musicInfo = 'progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo : playMusicInfo.musicInfo

  const handleArtistPress = useCallback((artist: { id: string | number, name: string }) => {
    if (musicInfo.source !== 'wy' || !artist.id) return
    navigations.pushArtistDetailScreen(commonState.componentIds.playDetail!, { id: String(artist.id), name: artist.name })
  }, [musicInfo])

  const titleText = musicInfo ? `${musicInfo.name}${musicInfo.alias ? ` (${musicInfo.alias})` : ''}` : ''

  const singerRender = useMemo(() => {
    if (!musicInfo || !musicInfo.artists?.length || musicInfo.source == 'local') {
      return (
        <Text numberOfLines={1} style={styles.title} size={12} color={theme['c-font']}>
          {musicInfo?.singer}
        </Text>
      )
    }

    return (
        <View style={styles.singerContainer}>
          {musicInfo.artists.map((artist, index) => (
            <TouchableOpacity key={artist.id || index} onPress={() => handleArtistPress(artist)}>
              <Text style={styles.singerText} size={12} color={theme['c-font']}>
                {artist.name}
                {index < musicInfo.artists.length - 1 ? ' / ' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
    )
  }, [musicInfo, theme, handleArtistPress])

  return (
    <View style={styles.titleContent}>
      <Marquee style={styles.title} size={16}>
        {titleText}
      </Marquee>
      {singerRender}
    </View>
  )
}


export default memo(() => {
  const popupRef = useRef<SettingPopupType>(null)
  const statusBarHeight = useStatusbarHeight()
  const back = () => {
    void pop(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    popupRef.current?.show()
  }
  return (
    <View
      style={{ height: HEADER_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }}
      nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}
    >
      <StatusBar />
      <View style={styles.container}>
        <Btn icon="chevron-left" onPress={back} />
        <Title />
        <TimeoutExitBtn />
        <Btn icon="slider" onPress={showSetting} />
      </View>
      <SettingPopup ref={popupRef} direction="vertical" />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // justifyContent: 'center',
    height: '100%',
  },
  titleContent: {
    flex: 1,
    paddingHorizontal: 5,
    // alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    // flex: 1,
    // textAlign: 'center',
  },
  icon: {
    paddingLeft: 4,
    paddingRight: 4,
  },
  singerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
