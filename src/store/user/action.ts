import state, {FollowedArtistInfo} from './state'

export const setWyLikedSongs = (ids: (string | number)[]) => {
  state.wy_liked_song_ids = new Set(ids.map(String))
  global.state_event.wyLikedListChanged()
}
export const addWyLikedSong = (id: string | number) => {
  const strId = String(id)
  if (state.wy_liked_song_ids.has(strId)) return
  state.wy_liked_song_ids.add(strId)
  global.state_event.wyLikedListChanged()
}
export const removeWyLikedSong = (id: string | number) => {
  const strId = String(id)
  if (!state.wy_liked_song_ids.has(strId)) return
  state.wy_liked_song_ids.delete(strId)
  global.state_event.wyLikedListChanged()
}

export const setWyFollowedArtists = (artists: FollowedArtistInfo[]) => {
  state.wy_followed_artists = artists
  global.state_event.wyFollowedListChanged()
}

export const addWyFollowedArtist = (artist: FollowedArtistInfo) => {
  if (state.wy_followed_artists.some(a => String(a.id) === String(artist.id))) return
  // 创建一个新数组，而不是修改原数组
  state.wy_followed_artists = [artist, ...state.wy_followed_artists]
  global.state_event.wyFollowedListChanged()
}

export const removeWyFollowedArtist = (id: string | number) => {
  const strId = String(id)
  const index = state.wy_followed_artists.findIndex(a => String(a.id) === strId)
  if (index < 0) return
  // 创建一个新数组，而不是修改原数组
  const newList = [...state.wy_followed_artists]
  newList.splice(index, 1)
  state.wy_followed_artists = newList
  global.state_event.wyFollowedListChanged()
}
