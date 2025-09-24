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
export interface InitState {
  wy_liked_song_ids: Set<string>
  wy_followed_artists: FollowedArtistInfo[]
  wy_subscribed_albums: SubscribedAlbumInfo[];
}
const state: InitState = {
  wy_liked_song_ids: new Set(),
  wy_followed_artists: [],
  wy_subscribed_albums: [],
}

export default state
