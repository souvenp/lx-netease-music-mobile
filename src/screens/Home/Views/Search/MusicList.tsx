import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { search } from '@/core/search/music'
import searchMusicState, { type Source } from '@/store/search/music/state'

// export type MusicListProps = Pick<OnlineListProps,
// 'onLoadMore'
// | 'onPlayList'
// | 'onRefresh'
// >

export interface MusicListType {
  loadList: (text: string, source: Source) => void
}

export default forwardRef<MusicListType, {}>((props, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const searchInfoRef = useRef<{ text: string; source: Source }>({ text: '', source: 'kw' })
  const isUnmountedRef = useRef(false)
  const requestIdRef = useRef(0)
  const loadingQueryKeyRef = useRef<string | null>(null)

  const isCurrentRequest = (requestId: number) => {
    return !isUnmountedRef.current && requestId == requestIdRef.current
  }

  const updateList = (requestId: number, list: LX.Music.MusicInfoOnline[], page: number) => {
    if (!isCurrentRequest(requestId)) return
    const source = searchInfoRef.current.source
    listRef.current?.setList(list, false, source == 'all')
    listRef.current?.setStatus(
      searchMusicState.listInfos[source]!.maxPage <= page ? 'end' : 'idle'
    )
  }

  const updateSupplement = (
    text: string,
    source: Source,
    list: LX.Music.MusicInfoOnline[]
  ) => {
    if (
      isUnmountedRef.current ||
      searchInfoRef.current.text != text ||
      searchInfoRef.current.source != source
    ) return
    const page = searchMusicState.listInfos[source]!.page
    listRef.current?.setList(list, false, source == 'all')
    listRef.current?.setStatus(
      searchMusicState.listInfos[source]!.maxPage <= page ? 'end' : 'idle'
    )
  }

  useImperativeHandle(
    ref,
    () => ({
      async loadList(text, source) {
        const queryKey = `${source}__${text}`
        if (loadingQueryKeyRef.current == queryKey) return
        loadingQueryKeyRef.current = queryKey
        const requestId = ++requestIdRef.current
        searchInfoRef.current.text = text
        searchInfoRef.current.source = source
        // const listDetailInfo = searchMusicState.listDetailInfo
        listRef.current?.setList([], false, source == 'all')
        if (
          searchMusicState.searchText == text &&
          searchMusicState.source == source &&
          searchMusicState.listInfos[searchMusicState.source]!.list.length
        ) {
          loadingQueryKeyRef.current = null
          requestAnimationFrame(() => {
            updateList(
              requestId,
              searchMusicState.listInfos[searchMusicState.source]!.list,
              searchMusicState.listInfos[searchMusicState.source]!.page
            )
          })
        } else {
          listRef.current?.setStatus('loading')
          const page = 1
          return search(text, page, source, (list) => {
            updateSupplement(text, source, list)
          })
            .then(() => {
              // const result = setListInfo(listDetail, id, page)
              updateList(requestId, searchMusicState.listInfos[source]!.list, page)
            })
            .catch(() => {
              if (!isCurrentRequest(requestId)) return
              listRef.current?.setStatus('error')
            })
            .finally(() => {
              if (loadingQueryKeyRef.current == queryKey) loadingQueryKeyRef.current = null
            })
        }
      },
    }),
    []
  )

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
      requestIdRef.current++
      loadingQueryKeyRef.current = null
    }
  }, [])

  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    const requestId = ++requestIdRef.current
    const page = 1
    const { text, source } = searchInfoRef.current
    const queryKey = `${source}__${text}`
    loadingQueryKeyRef.current = queryKey
    listRef.current?.setStatus('refreshing')
    search(
      text,
      page,
      source,
      (list) => {
        updateSupplement(text, source, list)
      }
    )
      .then(() => {
        // const result = setListInfo(listDetail, searchMusicState.listDetailInfo.id, page)
        updateList(requestId, searchMusicState.listInfos[source]!.list, page)
      })
      .catch(() => {
        if (!isCurrentRequest(requestId)) return
        listRef.current?.setStatus('error')
      })
      .finally(() => {
        if (loadingQueryKeyRef.current == queryKey) loadingQueryKeyRef.current = null
      })
  }
  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    const requestId = ++requestIdRef.current
    listRef.current?.setStatus('loading')
    const info = searchMusicState.listInfos[searchInfoRef.current.source]!
    const page = info?.list.length ? info.page + 1 : 1
    search(searchInfoRef.current.text, page, searchInfoRef.current.source)
      .then((list) => {
        // const result = setListInfo(listDetail, searchMusicState.listDetailInfo.id, page)
        if (!isCurrentRequest(requestId)) return
        listRef.current?.setList(list, true, searchInfoRef.current.source == 'all')
        listRef.current?.setStatus(info.maxPage <= page ? 'end' : 'idle')
      })
      .catch(() => {
        if (!isCurrentRequest(requestId)) return
        listRef.current?.setStatus('error')
      })
  }

  return (
    <OnlineList
      ref={listRef}
      listId="search"
      onRefresh={handleRefresh}
      onLoadMore={handleLoadMore}
      checkHomePagerIdle
    />
  )
})
