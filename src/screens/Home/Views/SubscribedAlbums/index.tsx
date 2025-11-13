import { memo, useState, useCallback, useEffect } from 'react'
import { View, FlatList, RefreshControl, Keyboard } from 'react-native'
import { useWySubscribedAlbums } from '@/store/user/hook'
import wyApi from '@/utils/musicSdk/wy/user'
import { setWySubscribedAlbums} from '@/store/user/action'
import { toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import Text from '@/components/common/Text'
import ListItem from './ListItem'

export default memo(() => {
  const subscribedAlbums = useWySubscribedAlbums()
  const [loading, setLoading] = useState(false)
  const theme = useTheme()
  const cookie = useSettingValue('common.wy_cookie')

  const onRefresh = useCallback(() => {
    if (!cookie) {
      setLoading(false)
      setWySubscribedAlbums([])
      return
    }
    setLoading(true)
    wyApi.getSubAlbumList()
      .then(albums => {
        setWySubscribedAlbums(albums);
      })
      .catch(err => {
        toast(`刷新失败: ${err.message}`);
      })
      .finally(() => {
        setLoading(false)
      });
  }, [cookie])

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
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        onScrollBeginDrag={Keyboard.dismiss}
        data={subscribedAlbums}
        renderItem={({ item }) => <ListItem item={item} showSubscribeButton={false} />}
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
  )
})
