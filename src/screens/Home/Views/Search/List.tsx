import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { InitState as SearchState } from '@/store/search/state'
import type { Source as MusicSource } from '@/store/search/music/state'
import type { Source as SongListSource } from '@/store/search/songlist/state'
import MusicList, { type MusicListType } from './MusicList'
import BlankView, { type BlankViewType } from './BlankView'
import SonglistList from './SonglistList'

interface ListProps {
  onSearch: (keyword: string) => void
  onOpenDetail: (item: any) => void; // 保留 onOpenDetail 以便传递
}
export interface ListType {
  loadList: (
    text: string,
    source: MusicSource | SongListSource,
    type: SearchState['searchType']
  ) => void
}

export default forwardRef<ListType, ListProps>(({ onSearch, onOpenDetail }, ref) => {
  const [listType, setListType] = useState<SearchState['searchType']>('music')
  const [showBlankView, setShowListView] = useState(true)
  const listRef = useRef<MusicListType>(null)
  const blankViewRef = useRef<BlankViewType>(null)

  useImperativeHandle(
    ref,
    () => ({
      loadList(text, source, type) {
        if (text) {
          setShowListView(false)
          setListType(type)
          requestAnimationFrame(() => {
            listRef.current?.loadList(text, source)
          })
        } else {
          setShowListView(true)
          requestAnimationFrame(() => {
            blankViewRef.current?.show(source)
          })
        }
      },
    }),
    []
  )

  return showBlankView ? (
    <BlankView ref={blankViewRef} onSearch={onSearch} />
  ) : listType == 'songlist' ? (
    <SonglistList ref={listRef} onOpenDetail={onOpenDetail} />
  ) : (
    <MusicList ref={listRef} />
  )
})
