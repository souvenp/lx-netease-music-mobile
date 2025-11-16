import { useRef, useEffect, useState, useCallback } from 'react'
import { type LayoutChangeEvent, View, BackHandler } from 'react-native'
import HeaderBar, { type HeaderBarProps, type HeaderBarType } from './HeaderBar'
import searchState, { type SearchType } from '@/store/search/state'
import commonState from '@/store/common/state'
import searchMusicState from '@/store/search/music/state'
import searchSonglistState, { type ListInfoItem } from '@/store/search/songlist/state'
import { getSearchSetting, saveSearchSetting } from '@/utils/data'
import {createStyle, toast} from '@/utils/tools'
import TipList, { type TipListType } from './TipList'
import List, { type ListType } from './List'
import { addHistoryWord, setSearchText as setSearchState } from '@/core/search/search'
import SonglistDetail from '../../../SonglistDetail'
import {COMPONENT_IDS} from "@/config/constant.ts"

interface SearchInfo {
  temp_source: LX.OnlineSource
  source: LX.OnlineSource | 'all'
  searchType: 'music' | 'songlist' | 'singer' | 'album'
}

export default () => {
  const headerBarRef = useRef<HeaderBarType>(null)
  const searchTipListRef = useRef<TipListType>(null)
  const listRef = useRef<ListType>(null)
  const layoutHeightRef = useRef<number>(0)
  const searchInfo = useRef<SearchInfo>({ temp_source: 'kw', source: 'kw', searchType: 'music' })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [selectedList, setSelectedList] = useState<ListInfoItem | null>(null)
  const selectedListRef = useRef(selectedList)
  selectedListRef.current = selectedList

  const [headerKey, setHeaderKey] = useState(Date.now())

  useEffect(() => {
    const onBackPress = () => {
      if (selectedListRef.current) {
        // 获取状态管理中记录的最后一个（即最顶层）屏幕信息
        const lastScreen = commonState.componentIds[commonState.componentIds.length - 1]

        // 如果最顶层的屏幕不是 Home 屏幕，则意味着有其他屏幕（如歌手详情页）被 push 到栈顶
        // 此时不应处理返回事件，应交由 react-native-navigation 默认处理（即 pop 顶层屏幕）
        if (lastScreen && lastScreen.name !== COMPONENT_IDS.home) {
          return false
        }

        // 否则，处理返回事件，关闭当前的歌单详情浮层
        setSelectedList(null)
        return true // 消费事件，防止退出应用
      }
      return false
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!selectedList) {
      setHeaderKey(Date.now())
      if (searchState.searchText) {
        listRef.current?.loadList(
          searchState.searchText,
          searchInfo.current.source,
          searchInfo.current.searchType,
        )
      }
    }
  }, [selectedList])

  const handleSearch: HeaderBarProps['onSearch'] = useCallback((text) => {
    handleHideTipList()
    setSelectedList(null)
    setSearchState(text) // 更新全局状态
    searchTipListRef.current?.search(text, layoutHeightRef.current)
    headerBarRef.current?.setText(text)
    headerBarRef.current?.blur()
    void addHistoryWord(text)
    listRef.current?.loadList(text, searchInfo.current.source, searchInfo.current.searchType)
  }, [])

  useEffect(() => {
    void getSearchSetting().then((info) => {
      searchInfo.current.temp_source = info.temp_source
      searchInfo.current.source = info.source
      searchInfo.current.searchType = info.type
      switch (info.type) {
        case 'music':
        case 'singer':
        case 'album':
          headerBarRef.current?.setSourceList(searchMusicState.sources, info.source)
          break
        case 'songlist':
          headerBarRef.current?.setSourceList(searchSonglistState.sources, info.source)
          break
      }
      headerBarRef.current?.setText(searchState.searchText)
      listRef.current?.loadList(
        searchState.searchText,
        searchInfo.current.source,
        searchInfo.current.searchType,
      )
    })

    const handleTypeChange = (type: SearchType) => {
      setSelectedList(null)
      searchInfo.current.searchType = type
      void saveSearchSetting({ type })
      if ((type === 'singer' || type === 'album') && searchInfo.current.source !== 'wy') {
        toast('歌手与专辑搜索目前仅支持网易云源')
      }
      if (searchState.searchText) {
        listRef.current?.loadList(searchState.searchText, searchInfo.current.source, type)
      }
    }
    global.app_event.on('searchTypeChanged', handleTypeChange)

    return () => {
      global.app_event.off('searchTypeChanged', handleTypeChange)
    }
  }, [headerKey])

  useEffect(() => {
    const handleNavChange = (id: string) => {
      if (id === 'nav_search' && searchState.searchText) {
        headerBarRef.current?.setText(searchState.searchText)
        listRef.current?.loadList(searchState.searchText, searchInfo.current.source, searchInfo.current.searchType)
      }
    }
    global.state_event.on('navActiveIdUpdated', handleNavChange)
    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavChange)
    }
  }, [])

  const handleLayout = (e: LayoutChangeEvent) => {
    layoutHeightRef.current = e.nativeEvent.layout.height
  }
  const handleSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    setSelectedList(null)
    searchInfo.current.source = source
    void saveSearchSetting({ source })
    if (searchState.searchText) {
      listRef.current?.loadList(searchState.searchText, source, searchInfo.current.searchType)
    }
  }

  const handleTipSearch: HeaderBarProps['onTipSearch'] = (text) => {
    setTimeout(() => {
      searchTipListRef.current?.search(text, layoutHeightRef.current)
    }, 500)
  }
  const handleHideTipList = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    searchTipListRef.current?.hide()
  }
  const handleShowTipList: HeaderBarProps['onShowTipList'] = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      searchTipListRef.current?.show(layoutHeightRef.current)
    }, 500)
  }

  const handleOpenDetail = useCallback((item: ListInfoItem) => {
    setSelectedList(item)
  }, [])

  return (
    <View style={styles.container}>
      { !selectedList && (
        <HeaderBar
          key={headerKey}
          ref={headerBarRef}
          onSourceChange={handleSourceChange}
          onTipSearch={handleTipSearch}
          onSearch={handleSearch}
          onHideTipList={handleHideTipList}
          onShowTipList={handleShowTipList}
        />
      )}
      <View style={styles.content} onLayout={handleLayout}>
        { selectedList
          ? <SonglistDetail
            componentId={commonState.componentIds.find(c => c.name === COMPONENT_IDS.home)?.id}
            info={selectedList} onBack={() => setSelectedList(null)}
          />
          : (
            <>
              <TipList ref={searchTipListRef} onSearch={handleSearch} />
              <List ref={listRef} onSearch={handleSearch} onOpenDetail={handleOpenDetail} />
            </>
          )
        }
      </View>
    </View>
  )
}


const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
