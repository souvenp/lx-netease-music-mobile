import { memo } from 'react'
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
import { type SubscribedAlbumInfo } from '@/store/user/state'

export default memo(({ item, width, viewMode }: { item: any, width: number, viewMode: 'grid' | 'list' }) => {
  const theme = useTheme()
  const isSubscribed = useIsWyAlbumSubscribed(item.id)

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
    navigations.pushAlbumDetailScreen(commonState.componentIds.home!, albumInfo)
  }

  const toggleSubscribe = (event: any) => {
    event.stopPropagation()
    if (!item.id) return
    const newSubState = !isSubscribed
    wyApi.subAlbum(String(item.id), newSubState).then(() => {
      toast(newSubState ? '收藏成功' : '取消收藏成功')
      if (newSubState) {
        const albumInfoForStore: SubscribedAlbumInfo = {
          id: item.id,
          name: item.name,
          picUrl: item.picUrl,
          artists: item.artists,
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
  }

  // 列表视图模式
  if (viewMode === 'list') {
    return (
      <TouchableOpacity style={listStyles.container} onPress={handlePress}>
        <Image url={item.picUrl} style={listStyles.artwork} />
        <View style={listStyles.info}>
          <Text style={listStyles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={listStyles.time} size={12} color={theme['c-font-label']}>
            {dateFormat(item.publishTime, 'Y.M.D')} • {item.size} tracks
          </Text>
        </View>
        <TouchableOpacity style={listStyles.likeButton} onPress={toggleSubscribe}>
          <Icon name={isSubscribed ? 'love-filled' : 'love'} color={isSubscribed ? theme['c-liked'] : theme['c-font-label']} size={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  // 默认（网格）视图模式
  return (
    <TouchableOpacity style={{ ...gridStyles.container, width }} onPress={handlePress}>
      <Image url={item.picUrl} style={{ ...gridStyles.artwork, width, height: width }} />
      <Text style={gridStyles.name} numberOfLines={1}>{item.name}</Text>
      <View style={gridStyles.metaContainer}>
        <View style={gridStyles.metaTextContainer}>
          <Text style={gridStyles.time} size={10} color={theme['c-font-label']}>
            {dateFormat(item.publishTime, 'Y.M.D')}
          </Text>
          <Text style={gridStyles.trackCount} size={10} color={theme['c-font-label']}>
            • {item.size} tracks
          </Text>
        </View>
        <TouchableOpacity style={gridStyles.likeButton} onPress={toggleSubscribe}>
          <Icon name={isSubscribed ? 'love-filled' : 'love'} color={isSubscribed ? theme['c-liked'] : theme['c-font-label']} size={18} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
})

const gridStyles = createStyle({
  container: {
    marginBottom: 16,
  },
  artwork: {
    borderRadius: 6,
    marginBottom: 8,
  },
  name: {
    fontSize: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaTextContainer: {
    flexDirection: 'column',
  },
  time: {},
  trackCount: {
    marginTop: 2,
  },
  likeButton: {
    padding: 5,
  },
})

const listStyles = createStyle({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  artwork: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    marginBottom: 5,
  },
  time: {},
  likeButton: {
    paddingHorizontal: 15,
  },
})
