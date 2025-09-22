import { LIST_IDS } from '@/config/constant'
import { setTempList, setActiveList } from '@/core/list'
import { playList } from '@/core/player/player'
import listState from '@/store/list/state'
import {clearPlayedList} from "@/core/player/playedList.ts";

export const handlePlay = async (list: LX.Music.MusicInfoOnline[], index = 0) => {
  const listId = 'dailyrec_wy'
  await setTempList(listId, [...list])
  clearPlayedList()
  setActiveList(LIST_IDS.TEMP)
  void playList(LIST_IDS.TEMP, index)
}
