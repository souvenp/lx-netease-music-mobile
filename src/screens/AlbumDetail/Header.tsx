import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { dateFormat } from '@/utils/common'
import { useStatusbarHeight } from '@/store/common/hook'
import { Icon } from '@/components/common/Icon'
import { navigations, pop } from '@/navigation'
import commonState from '@/store/common/state'

export default memo(({ albumInfo, componentId }) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()

  const handleArtistPress = (artist) => {
    // 避免重复进入同一个页面
    if (commonState.componentIds.ARTIST_DETAIL) {
      pop(componentId)
    } else {
      navigations.pushArtistDetailScreen(commonState.componentIds.home, { id: String(artist.id), name: artist.name })
    }
  }


  const artists = albumInfo.artists?.map((artist, index) => (
    <TouchableOpacity key={artist.id} onPress={() => handleArtistPress(artist)}>
      <Text style={styles.artistName} size={14} color="rgba(255,255,255,0.9)">
        {artist.name}{index < albumInfo.artists.length - 1 ? ' / ' : ''}
      </Text>
    </TouchableOpacity>
  ))

  const back = () => {
    void pop(componentId)
  }

  return (
    <View style={{ paddingTop: statusBarHeight, backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <TouchableOpacity onPress={back} style={styles.backBtn}>
        <Icon name="chevron-left" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerContainer}>
        <Image url={albumInfo.picUrl || albumInfo.img} style={styles.albumArt} />
        <View style={styles.infoContainer}>
          <Text style={styles.albumName} size={18} color="#FFF" numberOfLines={2}>{albumInfo.name}</Text>
          <View style={styles.artistContainer}>{artists}</View>
          <Text style={styles.metaInfo} size={12} color="rgba(255,255,255,0.8)">
            {albumInfo.publishTime ? dateFormat(albumInfo.publishTime, 'Y.M.D') : ''} • {albumInfo.size || albumInfo.total} tracks
          </Text>
        </View>
      </View>
    </View>
  )
})

const styles = createStyle({
  backBtn: {
    position: 'absolute',
    top: 35,
    left: 10,
    zIndex: 10,
    padding: 5,
  },
  headerContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArt: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  albumName: {
    fontWeight: 'bold',
  },
  artistContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  artistName: {
    textDecorationLine: 'underline',
  },
  metaInfo: {
    marginTop: 8,
  },
})
