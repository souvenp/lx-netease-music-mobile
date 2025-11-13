import { memo, useState } from 'react'
import {View, TouchableOpacity, Animated} from 'react-native'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { useTheme } from '@/store/theme/hook'
import {createStyle, toast} from '@/utils/tools'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { Icon } from '@/components/common/Icon'
import event = Animated.event;
import wyApi from '@/utils/musicSdk/wy/user'
import { useIsWyArtistFollowed } from '@/store/user/hook'
import { addWyFollowedArtist, removeWyFollowedArtist } from '@/store/user/action'
import {FollowedArtistInfo} from "@/store/user/state.ts";

export default memo(({ artist, showFollowButton = false }: { artist: any, showFollowButton?: boolean }) => {
  const theme = useTheme()
  const isFollowed = useIsWyArtistFollowed(artist.id)

  const handleFollow = (event) => {
    event.stopPropagation()
    const newFollowState = !isFollowed
    wyApi.followSinger(String(artist.id), newFollowState).then(() => {
      toast(newFollowState ? '关注成功' : '取消关注成功')
      if (newFollowState) {
        const artistInfoForStore: FollowedArtistInfo = {
          id: artist.id,
          name: artist.name,
          alias: artist.alias ? artist.alias[0] : null,
          albumSize: artist.albumSize,
          picUrl: artist.picUrl,
          img1v1Url: artist.picUrl,
        }
        addWyFollowedArtist(artistInfoForStore)
      } else {
        removeWyFollowedArtist(artist.id)
      }
    }).catch(err => {
      toast(`操作失败: ${err.message}`)
    })
  }

  const handlePress = () => {
    navigations.pushArtistDetailScreen(commonState.componentIds.home, { id: String(artist.id), name: artist.name });
  }
  const alias = artist.alias && artist.alias.length ? ` ${artist.alias[0]}` : ''

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image url={artist.picUrl || artist.img1v1Url} style={styles.avatar} />
      <View style={styles.info}>
        <Text size={16} numberOfLines={1}>
          {artist.name}
          {alias ? <Text size={12} color={theme['c-font-label']}>{alias}</Text> : null}
        </Text>
        <Text size={12} color={theme['c-font-label']}>专辑: {artist.albumSize}</Text>
      </View>
      {showFollowButton && (
        <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
          <Icon name={isFollowed ? 'love-filled' : 'love'} color={isFollowed ? theme['c-liked'] : theme['c-font-label']} size={20} />
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
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  followButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
})
