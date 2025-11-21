import { StyleSheet, TouchableOpacity } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { useCallback, useRef } from 'react'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'

const PIC_HEIGHT = scaleSizeH(46)

const styles = StyleSheet.create({
  image: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: 2,
  },
})

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const longPressedRef = useRef(false)

  const handlePress = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false
      return
    }
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds[commonState.componentIds.length - 1]?.id!)
  }

  const handleLongPress = () => {
    longPressedRef.current = true
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableOpacity onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7}>
      <Image
        url={musicInfo.pic}
        nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
        style={styles.image}
        onError={handleError}
      />
    </TouchableOpacity>
  )
}

// const styles = StyleSheet.create({
//   playInfoImg: {

//   },
// })
