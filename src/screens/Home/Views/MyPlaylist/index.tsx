import { memo, useEffect, useState, useCallback, useRef } from 'react'
import {View, FlatList, RefreshControl, BackHandler, StyleSheet, Keyboard} from 'react-native'
import ListItem from './ListItem'
import wyApi from '@/utils/musicSdk/wy/user'
import { useWySubscribedPlaylists, useWyUid } from '@/store/user/hook.ts'
import { useSettingValue } from '@/store/setting/hook'
import { toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import SonglistDetail from '../../../SonglistDetail'
import { type ListInfoItem } from '@/store/songlist/state'
import commonState from '@/store/common/state'
import {setWySubscribedPlaylists} from "@/store/user/action.ts"

export default memo(() => {
  const playlists = useWySubscribedPlaylists()
  const uid = useWyUid()
  const [loading, setLoading] = useState(true)
  const cookie = useSettingValue('common.wy_cookie')
  const theme = useTheme()
  const [selectedPlaylist, setSelectedPlaylist] = useState<ListInfoItem | null>(null)
  const selectedPlaylistRef = useRef(selectedPlaylist)
  selectedPlaylistRef.current = selectedPlaylist

  useEffect(() => {
    if (!cookie || !uid) {
      setLoading(false)
      setWySubscribedPlaylists([])
      return
    }
    if (playlists.length > 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    wyApi.getUserPlaylists(uid, cookie)
      .then(playlists => {
        setWySubscribedPlaylists(playlists)
      })
      .catch(err => {
        toast(`获取歌单失败: ${err.message}`)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [cookie, uid])

  const onRefresh = useCallback(() => {
    if (!cookie || !uid) {
      setLoading(false)
      setWySubscribedPlaylists([])
      return
    }
    setLoading(true)
    wyApi.getUserPlaylists(uid, cookie)
      .then(playlists => {
        setWySubscribedPlaylists(playlists)
      })
      .catch(err => {
        toast(`刷新歌单失败: ${err.message}`)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [cookie, uid])

  // 处理物理返回键，仅在显示详情时触发
  useEffect(() => {
    const onBackPress = () => {
      // 检查当前是否正在显示歌单详情页B
      if (selectedPlaylistRef.current) {
        // 检查是否有其他原生屏幕（如歌手/专辑详情页C）在Home屏幕之上
        // 当只有Home屏幕时，componentIds的长度为1。
        // 当有其他屏幕被push时，长度会大于1。
        if (Object.keys(commonState.componentIds).length > 1) {
          // 有其他原生屏幕在顶部，让原生导航处理返回事件
          return false;
        }

        // 如果没有其他原生屏幕，说明这个返回操作是针对歌单详情页B的
        setSelectedPlaylist(null);
        return true; // 消费事件，防止退出应用
      }

      // 如果不在歌单详情页，则不处理返回事件
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []); // 依然使用空依赖数组

  // 定义点击列表项的事件
  const handleItemPress = useCallback((playlistInfo: ListInfoItem) => {
    setSelectedPlaylist(playlistInfo)
  }, [])

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
        data={playlists}
        renderItem={({ item }) => <ListItem item={item} onPress={handleItemPress} />}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            colors={[theme['c-primary']]}
            refreshing={loading}
            onRefresh={onRefresh}
          />
        }
      />
      {selectedPlaylist && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme['c-content-background'] }]}>
          <SonglistDetail info={selectedPlaylist} onBack={() => setSelectedPlaylist(null)} />
        </View>
      )}
    </View>
  )
})
