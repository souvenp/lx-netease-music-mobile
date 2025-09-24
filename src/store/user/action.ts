import state, {FollowedArtistInfo, SubscribedAlbumInfo} from './state'

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

export const setWySubscribedAlbums = (albums: SubscribedAlbumInfo[]) => {
  state.wy_subscribed_albums = albums;
  global.state_event.wySubscribedAlbumsChanged();
};

export const addWySubscribedAlbum = (album: SubscribedAlbumInfo) => {
  if (state.wy_subscribed_albums.some(a => String(a.id) === String(album.id))) return;
  state.wy_subscribed_albums = [album, ...state.wy_subscribed_albums];
  global.state_event.wySubscribedAlbumsChanged();
};

export const removeWySubscribedAlbum = (id: string | number) => {
  const strId = String(id);
  const index = state.wy_subscribed_albums.findIndex(a => String(a.id) === strId);
  if (index < 0) return;
  const newList = [...state.wy_subscribed_albums];
  newList.splice(index, 1);
  state.wy_subscribed_albums = newList;
  global.state_event.wySubscribedAlbumsChanged();
};
