import { memo, useState, useCallback, useEffect } from 'react';
import {View, FlatList, RefreshControl, TouchableOpacity, Keyboard} from 'react-native';
import { useWySubscribedAlbums } from '@/store/user/hook';
import wyApi from '@/utils/musicSdk/wy/user';
import { setWySubscribedAlbums } from '@/store/user/action';
import { toast } from '@/utils/tools';
import { useTheme } from '@/store/theme/hook';
import { useSettingValue } from '@/store/setting/hook';
import Text from '@/components/common/Text';
import Image from '@/components/common/Image';
import { createStyle } from '@/utils/tools';
import { dateFormat } from '@/utils/common';
import { navigations } from '@/navigation';
import commonState from '@/store/common/state';
import { formatSingerName } from '@/utils/musicSdk/utils';

const ListItem = memo(({ item }) => {
  const theme = useTheme();
  const handlePress = () => {
    const albumInfo = {
      id: String(item.id),
      name: item.name,
      author: formatSingerName(item.artists),
      img: item.picUrl,
      play_count: '',
      desc: item.desc,
      source: 'wy',
      artists: item.artists,
      picUrl: item.picUrl,
      size: item.size,
      publishTime: item.publishTime,
    };
    navigations.pushAlbumDetailScreen(commonState.componentIds.home, albumInfo);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image url={item.picUrl} style={styles.artwork} />
      <View style={styles.info}>
        <Text size={16} numberOfLines={1}>{item.name}</Text>
        <Text size={12} color={theme['c-font-label']}>{formatSingerName(item.artists)}</Text>
        <Text size={12} color={theme['c-font-label']}>{dateFormat(item.publishTime, 'Y-M-D')} • {item.size} tracks</Text>
      </View>
    </TouchableOpacity>
  );
});

export default memo(() => {
  const subscribedAlbums = useWySubscribedAlbums();
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const cookie = useSettingValue('common.wy_cookie');

  const onRefresh = useCallback(() => {
    if (!cookie) {
      setLoading(false);
      setWySubscribedAlbums([]); // 清空列表
      return;
    }
    setLoading(true);
    wyApi.getSubAlbumList()
      .then(albums => {
        setWySubscribedAlbums(albums);
      })
      .catch(err => {
        toast(`刷新失败: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [cookie]);

  useEffect(() => {
    if (!subscribedAlbums.length && cookie) {
      onRefresh()
    }
  }, [onRefresh, subscribedAlbums.length, cookie])

  if (!cookie) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>请先设置网易云 Cookie</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        onScrollBeginDrag={Keyboard.dismiss}
        data={subscribedAlbums}
        renderItem={({ item }) => <ListItem item={item} />}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            colors={[theme['c-primary']]}
            refreshing={loading}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  );
});

const styles = createStyle({
  container: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  artwork: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
});
