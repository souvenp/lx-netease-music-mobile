import { memo, useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { TouchableOpacity, View, BackHandler, StyleSheet, PanResponder } from 'react-native'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import RecPlaylists from './RecPlaylists'
import RecSongs from './RecSongs'
import StylizedModal, { type StylizedSelection, loadStylizedSelection } from './StylizedModal'
import { BorderWidths } from '@/theme'
import SonglistDetail from '../../../SonglistDetail'
import { type ListInfoItem } from '@/store/songlist/state'
import commonState from '@/store/common/state'
import { COMPONENT_IDS, NAV_MENUS } from '@/config/constant'
import { useSettingValue } from '@/store/setting/hook'
import { useNavActiveId } from '@/store/common/hook'
import { setNavActiveId } from '@/core/common'

const Tabs = ({
  activeTab,
  onTabChange,
  isStylized,
  setIsStylized,
  onOpenModal
}: {
  activeTab: 'songs' | 'playlists'
  onTabChange: (tab: 'songs' | 'playlists') => void
  isStylized: boolean
  setIsStylized: (v: boolean) => void
  onOpenModal: () => void
}) => {
  const theme = useTheme()
  return (
    <View style={[styles.tabsContainer, { justifyContent: 'space-between', alignItems: 'center' }]}>
      {activeTab === 'songs' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setIsStylized(false)}
            style={[
              { marginRight: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 0, borderWidth: BorderWidths.normal },
              !isStylized ? { borderColor: theme['c-primary-font'] } : { borderColor: 'transparent' }
            ]}
          >
            <Text color={!isStylized ? theme['c-primary-font'] : theme['c-font']} size={13}>默认推荐</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!isStylized) setIsStylized(true)
              else onOpenModal()
            }}
            style={[
              { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 0, borderWidth: BorderWidths.normal },
              isStylized ? { borderColor: theme['c-primary-font'] } : { borderColor: 'transparent' }
            ]}
          >
            <Text color={isStylized ? theme['c-primary-font'] : theme['c-font']} size={13}>
              {isStylized ? '风格化推荐 ▾' : '风格化推荐'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : <View style={{ flex: 1 }} />}
      <View style={{ flexDirection: 'row' }}>
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
    </View>
  )
}

export default memo(() => {
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs')
  const [isStylized, setIsStylized] = useState(false)
  const [showStylizedModal, setShowStylizedModal] = useState(false)
  const [stylizedSelection, setStylizedSelection] = useState<StylizedSelection>(null)

  useEffect(() => {
    loadStylizedSelection().then(data => {
      if (data) setStylizedSelection(data)
    })
  }, [])

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

  const handleCloseDetail = useCallback(() => {
    setSelectedPlaylist(null)
  }, [])

  useEffect(() => {
    const onBackPress = () => {
      if (selectedPlaylistRef.current) {
        if (commonState.componentIds.length > 1) {
          return false
        }
        setSelectedPlaylist(null)
        return true // 消费事件，防止退出应用
      }
      return false
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => subscription.remove()
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <View style={[{ flex: 1 }, selectedPlaylist ? { opacity: 0 } : null]} pointerEvents={selectedPlaylist ? 'none' : 'auto'} {...(isHomePageScrollEnabled ? panResponder.panHandlers : {})}>
        <Tabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isStylized={isStylized}
          setIsStylized={setIsStylized}
          onOpenModal={() => setShowStylizedModal(true)}
        />
        <PagerView
          ref={pagerViewRef}
          style={{ flex: 1 }}
          initialPage={activeTab === 'songs' ? 0 : 1} // <-- 核心修改在这里
          onPageSelected={onPageSelected}
          scrollEnabled={!isHomePageScrollEnabled}
        >
          <View key="1">
            {(activeTab === 'songs') && <RecSongs isStylized={isStylized} stylizedSelection={stylizedSelection} />}
          </View>
          <View key="2">
            <RecPlaylists onOpenDetail={handleOpenDetail} />
          </View>
        </PagerView>
        <StylizedModal
          visible={showStylizedModal}
          onClose={() => setShowStylizedModal(false)}
          onConfirm={(selection) => {
            setStylizedSelection(selection)
            setShowStylizedModal(false)
            setIsStylized(true)
          }}
        />
      </View>
      {selectedPlaylist && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme['c-content-background'] }]}>
          <SonglistDetail info={selectedPlaylist} onBack={handleCloseDetail} initialScrollToInfo={null} />
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
