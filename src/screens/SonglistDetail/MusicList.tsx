import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { clearListDetail, getListDetail, setListDetail, setListDetailInfo } from '@/core/songlist'
import songlistState from '@/store/songlist/state'
import { handlePlay } from './listAction'
import { useListInfo } from './state'
import type { DetailInfo } from './index'

export interface MusicListProps {}

export interface MusicListType {
  loadList: (source: LX.OnlineSource, listId: string) => Promise<DetailInfo>
}

export default forwardRef<MusicListType, MusicListProps>((props, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const isUnmountedRef = useRef(false)
  const info = useListInfo()

  useImperativeHandle(ref, () => ({
    async loadList(source, id) {
      clearListDetail()
      const listDetailInfo = songlistState.listDetailInfo

      const createDetailInfo = (detail: typeof listDetailInfo.info): DetailInfo => ({
        name: (info.name || detail.name) ?? '',
        desc: detail.desc || info.desc || '',
        playCount: info.play_count ?? detail.play_count ?? '',
        imgUrl: info.img ?? detail.img,
      })

      if (
        listDetailInfo.id === id &&
        listDetailInfo.source === source &&
        listDetailInfo.list.length
      ) {
        requestAnimationFrame(() => {
          listRef.current?.setList(listDetailInfo.list)
        })
        return Promise.resolve(createDetailInfo(listDetailInfo.info))
      }

      listRef.current?.setStatus('loading')
      const page = 1
      setListDetailInfo(info.source, info.id)

      return getListDetail(id, source, page)
        .then((listDetail) => {
          const result = setListDetail(listDetail, id, page)
          if (isUnmountedRef.current) return createDetailInfo(result.info)
          requestAnimationFrame(() => {
            listRef.current?.setList(result.list)
            listRef.current?.setStatus(
              songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle'
            )
          })
          return createDetailInfo(result.info)
        })
        .catch((err) => {
          if (songlistState.listDetailInfo.list.length && page === 1) clearListDetail()
          listRef.current?.setStatus('error')
          throw err
        })
    },
  }))

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  const handlePlayList: OnlineListProps['onPlayList'] = (index) => {
    const listDetailInfo = songlistState.listDetailInfo
    void handlePlay(listDetailInfo.id, listDetailInfo.source, listDetailInfo.list, index)
  }

  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    const page = 1
    listRef.current?.setStatus('refreshing')
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page, true)
      .then((listDetail) => {
        const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
        if (isUnmountedRef.current) return
        listRef.current?.setList(result.list)
        listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
      })
      .catch(() => {
        if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
        listRef.current?.setStatus('error')
      })
  }

  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const page = songlistState.listDetailInfo.list.length
      ? songlistState.listDetailInfo.page + 1
      : 1
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page)
      .then((listDetail) => {
        const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
        if (isUnmountedRef.current) return
        listRef.current?.setList(result.list, true)
        listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
      })
      .catch(() => {
        if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
        listRef.current?.setStatus('error')
      })
  }

  return (
    <OnlineList
      ref={listRef}
      onPlayList={handlePlayList}
      onRefresh={handleRefresh}
      onLoadMore={handleLoadMore}
      forcePlayList={true}
      listId={`${info.source}__${info.id}`}
    />
  )
})
