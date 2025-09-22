import {memo, useMemo, useRef} from 'react'
import { View } from 'react-native'
import { useKeyboard } from '@/utils/hooks'

import Pic from './components/Pic'
import Title from './components/Title'
import PlayInfo from './components/PlayInfo'
import ControlBtn from './components/ControlBtn'
import { createStyle } from '@/utils/tools'
// import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { Icon } from '@/components/common/Icon';
import { TouchableOpacity } from 'react-native';
import commonState from '@/store/common/state';
import {navigations} from "@/navigation";
import {usePlayerMusicInfo} from "@/store/player/hook.ts";
import PlayerPlaylist, {PlayerPlaylistType} from "@/components/player/PlayerPlaylist.tsx";

export default memo(({ isHome = false }: { isHome?: boolean }) => {
  // const { onLayout, ...layout } = useLayout()
  const { keyboardShown } = useKeyboard()
  const theme = useTheme()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const musicInfo = usePlayerMusicInfo();
  const playlistRef = useRef<PlayerPlaylistType>(null)

  const handleNavigate = () => {
    if (!musicInfo.id) return;
    navigations.pushPlayDetailScreen(commonState.componentIds.home!);
  };
  const handleShowPlaylist = () => { // 新增处理函数
    playlistRef.current?.show()
  }

  const playerComponent = useMemo(
    () => (
      <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
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
    [theme, isHome, handleShowPlaylist],
  );

  // console.log('render pb')

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
