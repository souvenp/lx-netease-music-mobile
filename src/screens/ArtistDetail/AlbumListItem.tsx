import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle} from '@/utils/tools'
import { dateFormat } from '@/utils/common'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

export default memo(({ item, width }) => {
  const theme = useTheme()

  const handlePress = () => {
    const albumInfo = {
      id: item.id,
      name: item.name,
      author: item.artist.name,
      img: item.picUrl,
      play_count: '',
      desc: item.briefDesc,
      source: 'wy',
      artists: item.artists,
      picUrl: item.picUrl,
      size: item.size,
      publishTime: item.publishTime,
    }
    navigations.pushAlbumDetailScreen(commonState.componentIds.home, albumInfo)
  }

  return (
    <TouchableOpacity style={{ ...styles.container, width }} onPress={handlePress}>
      <Image url={item.picUrl} style={{ ...styles.artwork, width, height: width }} />
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.time} size={12} color={theme['c-font-label']}>
        {dateFormat(item.publishTime, 'Y.M.D')} • {item.size} tracks
      </Text>
    </TouchableOpacity>
  )
})

const styles = createStyle({
  container: {
    padding: 8,
  },
  artwork: {
    borderRadius: 6,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
  },
  time: {
    marginTop: 2,
  },
})
