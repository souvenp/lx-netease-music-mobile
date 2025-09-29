import { getSongListSetting, saveSongListSetting } from '@/utils/data'
import { useEffect, useRef, useState, useCallback } from 'react'
import { StyleSheet, View, BackHandler } from 'react-native'

import HeaderBar, { type HeaderBarProps, type HeaderBarType } from './HeaderBar'
import songlistState, { type InitState, type SortInfo, type ListInfoItem } from '@/store/songlist/state'
import List, { type ListType } from './List'
import SonglistDetail from '../../../SonglistDetail'
import commonState from '@/store/common/state';

interface SonglistInfo {
  source: InitState['sources'][number]
  sortId: SortInfo['id']
  tagId: string
}

export default () => {
  const headerBarRef = useRef<HeaderBarType>(null)
  const listRef = useRef<ListType>(null)
  const [selectedList, setSelectedList] = useState<ListInfoItem | null>(null)
  const selectedListRef = useRef(selectedList)
  selectedListRef.current = selectedList
  const songlistInfo = useRef<SonglistInfo>({ source: 'kw', sortId: '5', tagId: '' })
  const [headerKey, setHeaderKey] = useState(Date.now())

  // 使用 useCallback 包裹 loadList
  const loadList = useCallback(() => {
    listRef.current?.loadList(songlistInfo.current.source, songlistInfo.current.sortId, songlistInfo.current.tagId)
  }, [])

  useEffect(() => {
    const onBackPress = () => {
      // 检查当前是否正在显示歌单详情页
      if (selectedListRef.current) {
        // 检查是否有其他原生屏幕（如歌手/专辑详情页）在Home屏幕之上
        if (Object.keys(commonState.componentIds).length > 1) {
          // 有其他原生屏幕在顶部，不处理返回事件，让原生导航库来 pop
          return false;
        }

        // 如果没有其他原生屏幕，说明这个返回操作是针对歌单详情页的
        setSelectedList(null);
        return true; // 消费事件
      }

      // 如果不在歌单详情页，则不处理返回事件
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void getSongListSetting().then((info) => {
      songlistInfo.current.source = info.source
      songlistInfo.current.sortId = info.sortId
      songlistInfo.current.tagId = info.tagId
      headerBarRef.current?.setSource(info.source, info.sortId, info.tagName, info.tagId)
      loadList() // **核心修改：调用封装好的 loadList**
    })
  }, [loadList, headerKey]) // **核心修改：添加依赖**

  // 用于从详情页返回时重新加载列表**
  useEffect(() => {
    // 仅当 selectedList 从有值变为 null (即返回列表页) 时触发
    if (!selectedList) {
      setHeaderKey(Date.now())
      loadList()
    }
  }, [selectedList, loadList])


  const handleSortChange: HeaderBarProps['onSortChange'] = (id) => {
    songlistInfo.current.sortId = id
    void saveSongListSetting({ sortId: id })
    listRef.current?.loadList(songlistInfo.current.source, id, songlistInfo.current.tagId)
  }

  const handleTagChange: HeaderBarProps['onTagChange'] = (name, id) => {
    songlistInfo.current.tagId = id
    void saveSongListSetting({ tagName: name, tagId: id })
    listRef.current?.loadList(songlistInfo.current.source, songlistInfo.current.sortId, id)
  }

  const handleSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    songlistInfo.current.source = source
    songlistInfo.current.tagId = ''
    songlistInfo.current.sortId = songlistState.sortList[source]![0].id
    void saveSongListSetting({
      sortId: songlistInfo.current.sortId,
      source,
      tagId: '',
      tagName: '',
    })
    headerBarRef.current?.setSource(
      source,
      songlistInfo.current.sortId,
      '',
      songlistInfo.current.tagId
    )
    listRef.current?.loadList(source, songlistInfo.current.sortId, songlistInfo.current.tagId)
  }

  const handleOpenDetail = useCallback((item: ListInfoItem) => {
    setSelectedList(item)
  }, [])

  if (selectedList) {
    return <SonglistDetail info={selectedList} onBack={() => setSelectedList(null)} />
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        key={headerKey}
        ref={headerBarRef}
        onSortChange={handleSortChange}
        onTagChange={handleTagChange}
        onSourceChange={handleSourceChange}
      />
      <List ref={listRef} onOpenDetail={handleOpenDetail} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  },
})
