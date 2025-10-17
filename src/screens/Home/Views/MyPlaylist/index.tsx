import { memo, useEffect, useState, useCallback, useRef } from 'react'
import { View, FlatList, RefreshControl, BackHandler, StyleSheet } from 'react-native' // 导入 BackHandler
import ListItem from './ListItem'
import wyApi from '@/utils/musicSdk/wy/user'
import { useSettingValue } from '@/store/setting/hook'
import { toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import SonglistDetail from '../../../SonglistDetail' // 导入详情页组件
import { type ListInfoItem } from '@/store/songlist/state'
import commonState from '@/store/common/state'

export default memo(() => {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const cookie = useSettingValue('common.wy_cookie')
  const theme = useTheme()
  // 使用局部 state 来控制详情页显示
  const [selectedPlaylist, setSelectedPlaylist] = useState<ListInfoItem | null>(null)
  const selectedPlaylistRef = useRef(selectedPlaylist)
  selectedPlaylistRef.current = selectedPlaylist

  const loadPlaylists = useCallback(() => {
    if (!cookie) {
      setLoading(false)
      setPlaylists([])
      return
    }
    setLoading(true)
    wyApi.getUid(cookie)
      .then(uid => wyApi.getUserPlaylists(uid, cookie))
      .then(list => {
        setPlaylists(list)
      })
      .catch(err => {
        toast(`获取歌单失败: ${err.message}`)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [cookie])

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

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


  // 条件渲染逻辑
  // if (selectedPlaylist) {
  //   // 传入 onBack 回调，用于关闭详情视图
  //   return <SonglistDetail info={selectedPlaylist} onBack={() => setSelectedPlaylist(null)} />
  // }

  if (!cookie) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>请先设置网易云 Cookie</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {/* 歌单列表页 - 始终渲染 */}
      <FlatList
        data={playlists}
        renderItem={({ item }) => <ListItem item={item} onPress={handleItemPress} />}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            colors={[theme['c-primary']]}
            refreshing={loading}
            onRefresh={loadPlaylists}
          />
        }
      />

      {/* 歌单详情页 - 条件渲染为覆盖层 */}
      {selectedPlaylist && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme['c-content-background'] }]}>
          <SonglistDetail info={selectedPlaylist} onBack={() => setSelectedPlaylist(null)} />
        </View>
      )}
    </View>
  );
})
