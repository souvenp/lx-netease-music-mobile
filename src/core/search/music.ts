import searchMusicState, { type Source } from '@/store/search/music/state'
import searchMusicActions, { type SearchResult } from '@/store/search/music/action'
import musicSdk from '@/utils/musicSdk'

export const setSource: (typeof searchMusicActions)['setSource'] = (source) => {
  searchMusicActions.setSource(source)
}
export const setSearchText: (typeof searchMusicActions)['setSearchText'] = (text) => {
  searchMusicActions.setSearchText(text)
}
export const setListInfo: typeof searchMusicActions.setListInfo = (result, id, page) => {
  return searchMusicActions.setListInfo(result, id, page)
}

export const prependListInfo: typeof searchMusicActions.prependListInfo = (source, list) => {
  return searchMusicActions.prependListInfo(source, list)
}

export const clearListInfo: typeof searchMusicActions.clearListInfo = (source) => {
  searchMusicActions.clearListInfo(source)
}

export const search = async (
  text: string,
  page: number,
  sourceId: Source,
  onSupplement?: (list: LX.Music.MusicInfoOnline[]) => void
): Promise<LX.Music.MusicInfoOnline[]> => {
  const listInfo = searchMusicState.listInfos[sourceId]!
  if (!text) return []
  const key = `${page}__${text}`
  if (sourceId == 'all') {
    listInfo.key = key
    let task = []
    for (const source of searchMusicState.sources) {
      if (source == 'all') continue
      task.push(
        (
          (musicSdk[source]?.musicSearch.search(
            text,
            page,
            searchMusicState.listInfos.all.limit
          ) as Promise<SearchResult>) ?? Promise.reject(new Error('source not found: ' + source))
        ).catch((error: any) => {
          console.log(error)
          return {
            allPage: 1,
            limit: 30,
            list: [],
            source,
            total: 0,
          }
        })
      )
    }
    return Promise.all(task).then((results: SearchResult[]) => {
      if (key != listInfo.key) return []
      setSearchText(text)
      setSource(sourceId)
      return setListInfo(results, page, text)
    })
  } else {
    if (listInfo?.key == key && listInfo?.list.length) return listInfo?.list
    if (listInfo.key != key) clearListInfo(sourceId)
    listInfo.key = key
    const supplementPromise = sourceId == 'wy' && page == 1
      ? musicSdk.wy.musicSearch.searchBySerpApi(text)
      : null
    return (
      musicSdk[sourceId]?.musicSearch
        .search(text, page, listInfo.limit)
        .then((data: SearchResult) => {
          if (key != listInfo.key) return []
          setSearchText(text)
          const list = setListInfo(data, page, text)
          if (supplementPromise) {
            void supplementPromise.then((supplementList: LX.Music.MusicInfoOnline[]) => {
              if (
                !supplementList.length ||
                searchMusicState.searchText != text ||
                searchMusicState.source != sourceId
              ) return
              const list = prependListInfo(sourceId, supplementList)
              onSupplement?.(list)
            })
          }
          return list
        }) ?? Promise.reject(new Error('source not found: ' + sourceId))
    ).catch((err: any) => {
      if (key == listInfo.key && listInfo.list.length && page == 1) clearListInfo(sourceId)
      throw err
    })
  }
}
