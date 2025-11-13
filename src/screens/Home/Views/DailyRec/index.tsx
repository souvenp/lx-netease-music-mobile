import { memo, useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { TouchableOpacity, View, BackHandler, StyleSheet, PanResponder } from 'react-native'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import RecPlaylists from './RecPlaylists'
import RecSongs from './RecSongs'
import { BorderWidths } from '@/theme'
import SonglistDetail from '../../../SonglistDetail'
import { type ListInfoItem } from '@/store/songlist/state'
import commonState from '@/store/common/state'
import { NAV_MENUS } from '@/config/constant'
import { useSettingValue } from '@/store/setting/hook'
import { useNavActiveId } from '@/store/common/hook'
import { setNavActiveId } from '@/core/common'


const Tabs = ({ activeTab, onTabChange }: { activeTab: 'songs' | 'playlists', onTabChange: (tab: 'songs' | 'playlists') => void }) => {
  const theme = useTheme()
  return (
    <View style={styles.tabsContainer}>
      <TouchableOpacity style={styles.tab} onPress={() => onTabChange('songs')}>
        <Text
          style={[styles.tabText, { borderBottomColor: activeTab === 'songs' ? theme['c-primary-font-active'] : 'transparent' }]}
          color={activeTab === 'songs' ? theme['c-primary-font'] : theme['c-font']}
        >
          推荐歌曲
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => onTabChange('playlists')}>
        <Text
          style={[styles.tabText, { borderBottomColor: activeTab === 'playlists' ? theme['c-primary-font-active'] : 'transparent' }]}
          color={activeTab === 'playlists' ? theme['c-primary-font'] : theme['c-font']}
        >
          推荐歌单
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default memo(() => {
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs')
  const pagerViewRef = useRef<PagerView>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<ListInfoItem | null>(null)
  const selectedPlaylistRef = useRef(selectedPlaylist)
  selectedPlaylistRef.current = selectedPlaylist
  const theme = useTheme()

  const isHomePageScrollEnabled = useSettingValue('common.homePageScroll')

  const navStatus = useSettingValue('common.navStatus')
  const visibleNavs = useMemo(() => {
    return NAV_MENUS.filter(
      menu => menu.id === 'nav_search' || menu.id === 'nav_setting' || (navStatus[menu.id] ?? true)
    )
  }, [navStatus])
  const activeNavId = useNavActiveId()

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!isHomePageScrollEnabled) return false
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5 && Math.abs(gestureState.dx) > 10
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState
        const currentIndex = visibleNavs.findIndex(nav => nav.id === activeNavId)

        if (activeTab === 'songs' && dx > 50 && currentIndex > 0) {
          setNavActiveId(visibleNavs[currentIndex - 1].id)
        }

        if (activeTab === 'playlists' && dx < -50 && currentIndex < visibleNavs.length - 1) {
          setNavActiveId(visibleNavs[currentIndex + 1].id)
        }
      },
    })
  ).current

  const handleTabChange = (newTab: 'songs' | 'playlists') => {
    if (activeTab === newTab) return
    setActiveTab(newTab)
    pagerViewRef.current?.setPage(newTab === 'songs' ? 0 : 1)
  }

  const onPageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const newTab = event.nativeEvent.position === 0 ? 'songs' : 'playlists'
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [activeTab])

  const handleOpenDetail = useCallback((playlistInfo: ListInfoItem) => {
    setSelectedPlaylist(playlistInfo)
  }, [])

  useEffect(() => {
    const onBackPress = () => {
      if (selectedPlaylistRef.current) {
        if (Object.keys(commonState.componentIds).length > 1) {
          return false
        }
        setSelectedPlaylist(null)
        return true
      }
      return false
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => subscription.remove()
  }, [])

  return (
    <View style={{ flex: 1 }} {...(isHomePageScrollEnabled ? panResponder.panHandlers : {})}>
      <Tabs activeTab={activeTab} onTabChange={handleTabChange} />
      <PagerView
        ref={pagerViewRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={onPageSelected}
        scrollEnabled={!isHomePageScrollEnabled}
      >
        <View key="1">
          {(activeTab === 'songs') && <RecSongs />}
        </View>
        <View key="2">
          {activeTab === 'playlists' && <RecPlaylists onOpenDetail={handleOpenDetail} />}
        </View>
      </PagerView>
      {selectedPlaylist && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme['c-content-background'] }]}>
          <SonglistDetail info={selectedPlaylist} onBack={() => setSelectedPlaylist(null)} />
        </View>
      )}
    </View>
  )
})

const styles = createStyle({
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 15,
    borderBottomWidth: BorderWidths.normal,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tab: {
    paddingVertical: 5,
    paddingLeft: 15,
  },
  tabText: {
    paddingBottom: 5,
    borderBottomWidth: BorderWidths.normal3,
  },
})
