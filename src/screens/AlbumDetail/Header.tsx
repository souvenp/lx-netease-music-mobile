import { memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Image from '@/components/common/Image';
import Text from '@/components/common/Text';
import { useTheme } from '@/store/theme/hook';
import { createStyle, toast } from '@/utils/tools';
import { dateFormat } from '@/utils/common';
import { useStatusbarHeight } from '@/store/common/hook';
import { Icon } from '@/components/common/Icon';
import { navigations, pop } from '@/navigation';
import commonState from '@/store/common/state';
import { useIsWyAlbumSubscribed } from '@/store/user/hook';
import wyApi from '@/utils/musicSdk/wy/user';
import { addWySubscribedAlbum, removeWySubscribedAlbum } from '@/store/user/action';
import { type SubscribedAlbumInfo } from '@/store/user/state';


export default memo(({ albumInfo, componentId }) => {
  const theme = useTheme();
  const statusBarHeight = useStatusbarHeight();
  const isSubscribed = useIsWyAlbumSubscribed(albumInfo.id);

  const handleArtistPress = (artist) => {
    navigations.pushArtistDetailScreen(componentId, { id: String(artist.id), name: artist.name });
  };

  const toggleSubscribe = () => {
    if (!albumInfo.id) {
      toast('正在加载专辑信息，请稍后...');
      return;
    }
    const newSubState = !isSubscribed;
    wyApi.subAlbum(String(albumInfo.id), newSubState).then(() => {
      toast(newSubState ? '收藏成功' : '取消收藏成功');
      if (newSubState) {
        const albumInfoForStore: SubscribedAlbumInfo = {
          id: albumInfo.id,
          name: albumInfo.name,
          picUrl: albumInfo.picUrl,
          artists: albumInfo.artists,
          publishTime: albumInfo.publishTime,
          size: albumInfo.size,
        };
        addWySubscribedAlbum(albumInfoForStore);
      } else {
        removeWySubscribedAlbum(albumInfo.id);
      }
    }).catch(err => {
      toast(`操作失败: ${err.message}`);
    });
  };


  const artists = albumInfo.artists?.map((artist, index) => (
    <TouchableOpacity key={artist.id} onPress={() => handleArtistPress(artist)}>
      <Text style={styles.artistName} size={14} color="rgba(255,255,255,0.9)">
        {artist.name}{index < albumInfo.artists.length - 1 ? ' / ' : ''}
      </Text>
    </TouchableOpacity>
  ))

  return (
    <View style={{ paddingTop: statusBarHeight, backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <View style={styles.headerContainer}>
        <Image url={albumInfo.picUrl || albumInfo.img} style={styles.albumArt} />
        <View style={styles.infoContainer}>
          <Text style={styles.albumName} size={18} color="#FFF" numberOfLines={2}>{albumInfo.name}</Text>
          <View style={styles.artistContainer}>{artists}</View>
          <Text style={styles.metaInfo} size={12} color="rgba(255,255,255,0.8)">
            {albumInfo.publishTime ? dateFormat(albumInfo.publishTime, 'Y.M.D') : ''} • {albumInfo.size || albumInfo.total} tracks
          </Text>
        </View>
        <TouchableOpacity style={styles.followButton} onPress={toggleSubscribe}>
          <Icon name={isSubscribed ? 'love-filled' : 'love'} color={isSubscribed ? theme['c-liked'] : '#fff'} size={18} />
        </TouchableOpacity>
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
  followButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 10,
  },
});
