export interface FollowedArtistInfo {
  id: string | number
  name: string
  alias: string[] | null
  albumSize: number
  picUrl: string
  img1v1Url: string
}
export interface SubscribedAlbumInfo {
  id: string | number
  name: string
  picUrl: string
  artists: Array<{ id: string | number, name: string }>
  publishTime: number
  size: number
}
export interface SubscribedPlaylistInfo {
  id: string | number
  userId: number
  name: string
  coverImgUrl: string
  trackCount: number
  description?: string
}

export interface InitState {
  wy_uid: string | null
  wy_liked_song_ids: Set<string>
  wy_followed_artists: FollowedArtistInfo[]
  wy_subscribed_albums: SubscribedAlbumInfo[]
  wy_subscribed_playlists: SubscribedPlaylistInfo[]
  wy_vip_type: number
}
const state: InitState = {
  wy_uid: null,
  wy_liked_song_ids: new Set(),
  wy_followed_artists: [],
  wy_subscribed_albums: [],
  wy_subscribed_playlists: [],
  wy_vip_type: 0,
}

export default state
