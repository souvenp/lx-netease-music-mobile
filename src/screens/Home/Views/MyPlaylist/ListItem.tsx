import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { type ListInfoItem } from '@/store/songlist/state'

export default memo(({ item, onPress }: { item: any, onPress: (info: ListInfoItem) => void }) => {
  const theme = useTheme()

  const handlePress = () => {
    const playlistInfo: ListInfoItem = {
      id: String(item.id),
      name: item.name,
      author: item.creator?.nickname,
      img: item.coverImgUrl,
      play_count: item.playCount,
      desc: item.description,
      source: 'wy',
      userId: item.userId,
      total: item.trackCount,
    }
    onPress(playlistInfo)
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image url={item.coverImgUrl} style={styles.artwork} />
      <View style={styles.info}>
        <Text size={16} numberOfLines={1}>{item.name}</Text>
        <Text size={12} color={theme['c-font-label']}>{item.trackCount} tracks</Text>
      </View>
    </TouchableOpacity>
  )
})

const styles = createStyle({
  container: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  artwork: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
})
