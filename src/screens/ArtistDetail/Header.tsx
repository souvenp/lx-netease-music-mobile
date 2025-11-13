import { memo, useState, useMemo, useEffect } from 'react'
import { View, TouchableOpacity } from 'react-native'
import ImageBackground from '@/components/common/ImageBackground'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { useTheme } from '@/store/theme/hook'
import {createStyle, toast} from '@/utils/tools'
import { useStatusbarHeight } from '@/store/common/hook'
import { Icon } from '@/components/common/Icon'
import wyApi from '@/utils/musicSdk/wy/user'
import { useIsWyArtistFollowed } from '@/store/user/hook'
import { addWyFollowedArtist, removeWyFollowedArtist } from '@/store/user/action'
import { type FollowedArtistInfo } from '@/store/user/state'

export default memo(({ artist, onFollow, componentId }) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const [isDescExpanded, setDescExpanded] = useState(false)
  const isFollowed = useIsWyArtistFollowed(artist.id) // 现在 artist.id 在首次渲染时就可用

  const artistName = artist?.name || ''
  const artistAlias = artist?.alias?.length ? ` ${artist.alias[0]}` : ''
  const description = artist?.briefDesc || ''

  const toggleFollow = () => {
    if (!artist.albumSize) { // 使用一个详细信息才有的字段判断数据是否加载完毕
      toast('正在加载歌手信息，请稍后...')
      return
    }
    const newFollowState = !isFollowed

    wyApi.followSinger(String(artist.id), newFollowState).then(() => {
      toast(newFollowState ? '关注成功' : '取消关注成功')
      if (newFollowState) {
        const artistInfoForStore: FollowedArtistInfo = {
          id: artist.id,
          name: artist.name,
          alias: artist.alias || null,
          albumSize: artist.albumSize,
          picUrl: artist.avatar,
          img1v1Url: artist.avatar,
        }
        addWyFollowedArtist(artistInfoForStore)
      } else {
        removeWyFollowedArtist(artist.id)
      }
    }).catch(err => {
      toast(`操作失败: ${err.message}`)
    })
  }

  const truncatedDesc = useMemo(() => {
    if (description.length > 75) {
      return description.substring(0, 75) + '...'
    }
    return description
  }, [description])

  return (
    <View style={{ paddingTop: statusBarHeight }}>
      <ImageBackground source={artist?.cover ? { uri: artist.cover } : null} style={styles.headerContainer} blurRadius={10}>
        <View style={styles.overlay}>
          <Image url={artist?.avatar || artist?.cover} style={styles.avatar} />
          <View style={styles.infoContainer}>
            <Text style={styles.name} size={18} color="#FFF" numberOfLines={2}>
              {artistName}
              {artistAlias ? <Text size={12} color="rgba(255,255,255,0.8)">{artistAlias}</Text> : null}
            </Text>
            <TouchableOpacity onPress={() => setDescExpanded(!isDescExpanded)}>
              <Text style={styles.desc} size={12} color="rgba(255,255,255,0.8)">
                {isDescExpanded ? description : truncatedDesc}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.followButton} onPress={toggleFollow}>
            <Icon name={isFollowed ? 'love-filled' : 'love'}
                  color={isFollowed ? theme['c-liked'] : '#fff'} size={18} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  )
})

const styles = createStyle({
  headerContainer: {
    height: 200,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  name: {
    fontWeight: 'bold',
  },
  desc: {
    marginTop: 8,
  },
  followButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
})
