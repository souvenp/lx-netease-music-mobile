import { memo, useRef, useMemo, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { pop, navigations } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import { usePlayMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import CommentBtn from './CommentBtn'
import Btn from './Btn'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import DesktopLyricBtn from './DesktopLyricBtn'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)

const Title = () => {
  const theme = useTheme()
  const playMusicInfo = usePlayMusicInfo()
  const musicInfo = 'progress' in playMusicInfo.musicInfo ? playMusicInfo.musicInfo.metadata.musicInfo : playMusicInfo.musicInfo

  const handleArtistPress = useCallback((artist: { id: string | number, name: string }) => {
    if (musicInfo.source !== 'wy' || !artist.id) return
    navigations.pushArtistDetailScreen(commonState.componentIds.playDetail!, { id: String(artist.id), name: artist.name })
  }, [musicInfo])


  const singerRender = useMemo(() => {
    if (!musicInfo || !musicInfo.artists?.length || musicInfo.source == 'local') {
      return (
        <Text numberOfLines={1} style={styles.title} size={12} color={theme['c-font-label']}>
          {musicInfo?.singer}
        </Text>
      )
    }

    return (
      // <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.singerContainer}>
          {musicInfo.artists.map((artist, index) => (
            <TouchableOpacity key={artist.id || index} onPress={() => handleArtistPress(artist)}>
              <Text style={styles.singerText} size={12} color={theme['c-font-label']}>
                {artist.name}
                {index < musicInfo.artists.length - 1 ? ' / ' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      // </ScrollView>
    )
  }, [musicInfo, theme, handleArtistPress])

  return (
    <View style={styles.titleContent}>
      <Text numberOfLines={1} style={styles.title} size={14}>
        {musicInfo.name}
        {musicInfo.alias ? <Text color={theme['c-font-label']}> ({musicInfo.alias})</Text> : null}
      </Text>
      {singerRender}
    </View>
  )
}

export default memo(() => {
  const popupRef = useRef<SettingPopupType>(null)
  const back = () => {
    void pop(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    popupRef.current?.show()
  }
  return (
    <View style={{ height: HEADER_HEIGHT }} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}>
      <View style={styles.container}>
        <TouchableOpacity onPress={back} style={{ ...styles.button, width: HEADER_HEIGHT }}>
          <Icon name="chevron-left" size={18} />
        </TouchableOpacity>
        <Title />
        <DesktopLyricBtn />
        <CommentBtn />
        <Btn icon="slider" onPress={showSetting} />
      </View>
      <SettingPopup ref={popupRef} position="left" direction="horizontal" />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 0,
    // backgroundColor: '#ccc',
    flexDirection: 'row',
    // justifyContent: 'center',
    height: '100%',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    flex: 0,
  },
  titleContent: {
    flex: 1,
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
  singerText: {
    paddingTop: 2,
  },
})
