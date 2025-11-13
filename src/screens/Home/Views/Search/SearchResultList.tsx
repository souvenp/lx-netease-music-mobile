import {forwardRef, useImperativeHandle, useRef, useState, useCallback, memo, useEffect} from 'react'
import { FlatList, RefreshControl } from 'react-native'
import musicSearch from '@/utils/musicSdk/wy/musicSearch'
import { useTheme } from '@/store/theme/hook'
import SingerListItem from '../FollowedArtists/ListItem'
import AlbumListItem from '../../Views/SubscribedAlbums/ListItem'

export default forwardRef(({ searchType }, ref) => {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const searchInfoRef = useRef({ text: '', page: 1, hasMore: true })
  const theme = useTheme()

  useEffect(() => {
    setList([])
    searchInfoRef.current.page = 1
    searchInfoRef.current.hasMore = true
  }, [searchType])

  const handleLoad = useCallback((text, page, isRefresh = false) => {
    if (loading || (!isRefresh && !searchInfoRef.current.hasMore)) return
    setLoading(true)

    let searchPromise
    if (searchType === 'singer') {
      searchPromise = musicSearch.searchSinger(text, page)
    } else if (searchType === 'album') {
      searchPromise = musicSearch.searchAlbum(text, page)
    } else {
      setLoading(false)
      return
    }

    searchPromise.then(result => {
      setList(isRefresh ? result.list : [...list, ...result.list])
      searchInfoRef.current.page = page + 1
      searchInfoRef.current.hasMore = result.list.length > 0 && result.total > (page * 30)
    }).catch(() => {}).finally(() => {
      setLoading(false)
    })
  }, [loading, list, searchType])

  useImperativeHandle(ref, () => ({
    loadList(text) {
      searchInfoRef.current = { text, page: 1, hasMore: true }
      handleLoad(text, 1, true)
    },
  }))

  const renderItem = ({ item }) => {
    if (searchType === 'singer') {
      return <SingerListItem artist={item} showFollowButton={true}  />
    }
    if (searchType === 'album') {
      return <AlbumListItem item={item} showSubscribeButton={true}  />
    }
    return null
  }

  return (
    <FlatList
      data={list}
      renderItem={renderItem}
      keyExtractor={item => String(item.id)}
      onEndReached={() => handleLoad(searchInfoRef.current.text, searchInfoRef.current.page)}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          colors={[theme['c-primary']]}
          refreshing={loading && searchInfoRef.current.page === 1}
          onRefresh={() => handleLoad(searchInfoRef.current.text, 1, true)}
        />
      }
    />
  )
})
