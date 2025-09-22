export interface FollowedArtistInfo { // <-- 新增接口
  id: string | number
  name: string
  alias: string[] | null
  albumSize: number
  picUrl: string
  img1v1Url: string
}
export interface InitState {
  wy_liked_song_ids: Set<string>
  wy_followed_artists: FollowedArtistInfo[]
}
const state: InitState = {
  wy_liked_song_ids: new Set(),
  wy_followed_artists: [],
}

export default state
