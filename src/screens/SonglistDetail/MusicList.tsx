import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef} from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { clearListDetail, getListDetail, setListDetail, setListDetailInfo } from '@/core/songlist'
import songlistState from '@/store/songlist/state'
import { handlePlay } from './listAction'
import { useListInfo } from './state'
import {DetailInfo} from "@/screens/SonglistDetail/Header.tsx"
import playerState from '@/store/player/state'
import { LIST_IDS } from '@/config/constant'
import listState from '@/store/list/state'
import { getListMusics } from '@/core/list'

export interface MusicListProps {
  componentId: string
  isCreator: boolean
  onListUpdate: OnlineListProps['onListUpdate']
  playingId: string | null
}

export interface MusicListType {
  loadList: (source: LX.OnlineSource, listId: string, isRefresh?: boolean) => Promise<DetailInfo>
  scrollToInfo: (info: LX.Music.MusicInfoOnline) => void
}

export default forwardRef<MusicListType, MusicListProps>(({componentId, isCreator, playingId }, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const isUnmountedRef = useRef(false)
  const info = useListInfo()

  useEffect(() => {
    const handleJumpPosition = () => {
      let listId = playerState.playMusicInfo.listId
      if (listId === LIST_IDS.TEMP) listId = listState.tempListMeta.id
      if (listId !== `${info.source}__${info.id}`) return

      const musicInfo = playerState.playMusicInfo.musicInfo
      if (musicInfo) {
        const currentList = songlistState.listDetailInfo.list
        const index = currentList.findIndex(m => m.id === musicInfo.id)
        if (index > -1) {
          listRef.current?.scrollToInfo(musicInfo as LX.Music.MusicInfoOnline)
        } else {
          // 尝试从播放列表获取完整数据
          const currentListId = `${info.source}__${info.id}`
          if (listId === currentListId) {
            void getListMusics(LIST_IDS.TEMP).then(fullList => {
              // 只有当临时列表数据更多（说明加载了更多页）且 ID 匹配时才更新
              if (fullList.length > currentList.length) {
                const castedList = fullList as LX.Music.MusicInfoOnline[]
                // 简单校验一下是否是同一个列表的数据（检查第一首歌 ID 是否一致，或者直接信任 listId）
                if (castedList.length && currentList.length && castedList[0].id === currentList[0].id) {
                  songlistState.listDetailInfo.list = castedList
                  listRef.current?.setList(castedList)
                  setTimeout(() => {
                    listRef.current?.scrollToInfo(musicInfo as LX.Music.MusicInfoOnline)
                  }, 200)
                }
              }
            })
          }
        }
      }
    }

    global.app_event.on('jumpListPosition', handleJumpPosition)
    return () => {
      global.app_event.off('jumpListPosition', handleJumpPosition)
    }
  }, [info.id, info.source])

  useImperativeHandle(
    ref,
    () => ({
      async loadList(source, id, isRefresh = false) {
        clearListDetail()
        const listDetailInfo = songlistState.listDetailInfo
        const createDetailInfo = (detail: typeof listDetailInfo.info): DetailInfo => ({
          name: (info.name || detail.name) ?? '',
          desc: detail.desc || info.desc || '',
          playCount: info.play_count ?? detail.play_count ?? '',
          imgUrl: info.img ?? detail.img,
          userId: info.userId || detail.userId,
          total: listDetailInfo.total,
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
        return getListDetail(id, source, page, isRefresh)
          .then((listDetail) => {
            const result = setListDetail(listDetail, id, page)
            if (isUnmountedRef.current) return createDetailInfo(result.info)
            requestAnimationFrame(() => {
              listRef.current?.setList(result.list)
              listRef.current?.setStatus(
                songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle',
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
      scrollToInfo(targetInfo) {
        const currentList = songlistState.listDetailInfo.list
        if (currentList.some(s => s.id === targetInfo.id)) {
          listRef.current?.scrollToInfo(targetInfo)
          return
        }

        // 检查播放器中是否有完整列表
        const currentListId = `${songlistState.listDetailInfo.source}__${songlistState.listDetailInfo.id}`
        let playingListId = playerState.playMusicInfo.listId
        if (playingListId === LIST_IDS.TEMP) playingListId = listState.tempListMeta.id

        if (playingListId === currentListId) {
          void getListMusics(LIST_IDS.TEMP).then(fullList => {
            const castedList = fullList as LX.Music.MusicInfoOnline[]
            if (castedList.some(s => s.id === targetInfo.id)) {
              songlistState.listDetailInfo.list = castedList
              listRef.current?.setList(castedList)
              setTimeout(() => {
                listRef.current?.scrollToInfo(targetInfo)
              }, 200)
            }
          })
        }
      },
    }),
    [info.source, info.id],
  )

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

  const handleListUpdate = useCallback((newList: LX.Music.MusicInfoOnline[]) => {
    if (isUnmountedRef.current) return
    songlistState.listDetailInfo.list = newList
  }, [])

  return (
    <OnlineList componentId={componentId}
                ref={listRef}
                onPlayList={handlePlayList}
                onRefresh={handleRefresh}
                onLoadMore={handleLoadMore}
                onListUpdate={handleListUpdate}
                forcePlayList={true}
                listId={`${info.source}__${info.id}`}
                isCreator={isCreator}
                playingId={playingId}
    />
  )
})
