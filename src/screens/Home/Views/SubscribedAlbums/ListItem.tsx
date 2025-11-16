import { memo, useCallback } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import { dateFormat } from '@/utils/common'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { Icon } from '@/components/common/Icon'
import { useIsWyAlbumSubscribed } from '@/store/user/hook'
import wyApi from '@/utils/musicSdk/wy/user'
import { addWySubscribedAlbum, removeWySubscribedAlbum } from '@/store/user/action'
import { formatSingerName } from '@/utils/musicSdk/utils'
import { type SubscribedAlbumInfo } from '@/store/user/state'


export default memo(({ item, showSubscribeButton = false }: { item: any, showSubscribeButton?: boolean }) => {
  const theme = useTheme()
  const isSubscribed = useIsWyAlbumSubscribed(item.id)

  const handlePress = () => {
    const albumInfo = {
      id: String(item.id),
      name: item.name,
      author: formatSingerName(item.artists ?? [{ name: item.artistName }]),
      img: item.picUrl,
      desc: item.desc,
      source: 'wy',
      artists: item.artists,
      picUrl: item.picUrl,
      size: item.size,
      publishTime: item.publishTime,
    }
    navigations.pushAlbumDetailScreen(commonState.componentIds[commonState.componentIds.length - 1]?.id!, albumInfo)
  }

  const toggleSubscribe = useCallback((event) => {
    event.stopPropagation()
    const newSubState = !isSubscribed
    wyApi.subAlbum(String(item.id), newSubState).then(() => {
      toast(newSubState ? '收藏成功' : '取消收藏成功')
      if (newSubState) {
        const albumInfoForStore: SubscribedAlbumInfo = {
          id: item.id,
          name: item.name,
          picUrl: item.picUrl,
          artists: item.artists ?? [{ name: item.artistName, id: item.artistId }],
          publishTime: item.publishTime,
          size: item.size,
        }
        addWySubscribedAlbum(albumInfoForStore)
      } else {
        removeWySubscribedAlbum(item.id)
      }
    }).catch(err => {
      toast(`操作失败: ${err.message}`)
    })
  }, [isSubscribed, item])

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image url={item.picUrl} style={styles.artwork} />
      <View style={styles.info}>
        <Text size={16} numberOfLines={1}>{item.name}</Text>
        <Text size={12} color={theme['c-font-label']}>{formatSingerName(item.artists ?? [{ name: item.artistName }])}</Text>
        <Text size={12} color={theme['c-font-label']}>
          {/*{dateFormat(item.publishTime, 'Y-M-D')}*/}
          • {item.size} tracks</Text>
      </View>
      {showSubscribeButton && (
        <TouchableOpacity style={styles.subscribeButton} onPress={toggleSubscribe}>
          <Icon name={isSubscribed ? 'love-filled' : 'love'} color={isSubscribed ? theme['c-liked'] : theme['c-font-label']} size={20} />
        </TouchableOpacity>
      )}
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
    justifyContent: 'center',
  },
  subscribeButton: {
    padding: 10,
  },
})
