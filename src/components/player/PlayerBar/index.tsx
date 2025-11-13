import { memo, useMemo, useRef } from 'react'
import { PanResponder, View, TouchableOpacity } from 'react-native'
import { useKeyboard } from '@/utils/hooks'
import Pic from './components/Pic'
import Title from './components/Title'
import PlayInfo from './components/PlayInfo'
import ControlBtn from './components/ControlBtn'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { Icon } from '@/components/common/Icon'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { usePlayerMusicInfo } from '@/store/player/hook'
import PlayerPlaylist, { PlayerPlaylistType } from '@/components/player/PlayerPlaylist.tsx'
import MiniProgressBar from "@/components/player/PlayerBar/components/MiniProgressBar.tsx";


export default memo(({ isHome = false }: { isHome?: boolean }) => {
  const { keyboardShown } = useKeyboard()
  const theme = useTheme()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const musicInfo = usePlayerMusicInfo()
  const playlistRef = useRef<PlayerPlaylistType>(null)
  const drawerLayoutPosition = useSettingValue('common.drawerLayoutPosition')

  const handleNavigate = () => {
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
  }

  const handleShowPlaylist = () => {
    playlistRef.current?.show()
  }

  const gestureAction = useRef<'drawer' | 'playlist' | null>(null)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState
        // 优先判断手势的主方向
        if (Math.abs(dx) > Math.abs(dy) * 1.5) { // 水平滑动为主
          if (drawerLayoutPosition === 'left' && dx > 10) {
            gestureAction.current = 'drawer'
            return true
          }
          if (drawerLayoutPosition === 'right' && dx < -10) {
            gestureAction.current = 'drawer'
            return true
          }
        } else if (Math.abs(dy) > Math.abs(dx) * 1.5) { // 垂直滑动为主
          if (dy < -10) {
            gestureAction.current = 'playlist'
            return true
          }
        }
        return false
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState
        // 根据已确定的手势类型执行操作
        if (gestureAction.current === 'drawer') {
          if (drawerLayoutPosition === 'left' && dx > 50) {
            global.app_event.changeMenuVisible(true)
          } else if (drawerLayoutPosition === 'right' && dx < -50) {
            global.app_event.changeMenuVisible(true)
          }
        } else if (gestureAction.current === 'playlist' && dy < -50) {
          handleShowPlaylist()
        }
        // 重置手势状态
        gestureAction.current = null
      },
      onPanResponderTerminate: (evt, gestureState) => {
        gestureAction.current = null
      },
    }),
  ).current

  const playerComponent = useMemo(
    () => (
      <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}
            {...panResponder.panHandlers}>
        <MiniProgressBar />

        <TouchableOpacity style={styles.left} onPress={handleNavigate} activeOpacity={0.8}>
          <Pic isHome={isHome} />
          <View style={styles.center}>
            <Title isHome={isHome} />
            <PlayInfo isHome={isHome} />
          </View>
        </TouchableOpacity>
        <View style={styles.right}>
          <ControlBtn />
          <TouchableOpacity style={styles.menuBtn} onPress={handleShowPlaylist}>
            <Icon name="menu" color={theme['c-button-font']} size={22} />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [theme, isHome, handleShowPlaylist, panResponder.panHandlers, drawerLayoutPosition],
  )

  return (
    <>
      {autoHidePlayBar && keyboardShown ? null : playerComponent}
      <PlayerPlaylist ref={playlistRef} />
    </>
  )
})

const styles = createStyle({
  container: {
    width: '100%',
    // height: 100,
    // paddingTop: progressContentPadding,
    // marginTop: -progressContentPadding,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
    // borderTopWidth: BorderWidths.normal2,
    paddingVertical: 5,
    paddingLeft: 5,
    // backgroundColor: AppColors.primary,
    // backgroundColor: 'red',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
  },
  left: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 5,
    height: '100%',
    // justifyContent: 'space-evenly',
    // height: 48,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 5,
    paddingRight: 5,
  },
  menuBtn: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // row: {
  //   flexDirection: 'row',
  //   flexGrow: 0,
  //   flexShrink: 0,
  // },
})
