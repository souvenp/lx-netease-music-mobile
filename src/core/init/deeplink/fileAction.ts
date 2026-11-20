import { readMetadata } from '@/utils/localMediaMetadata'
import { handleImportList } from '@/screens/Home/Views/Setting/settings/Backup/actions'
import { handleImportLocalFile } from '@/screens/Home/Views/Setting/settings/Basic/UserApiEditModal/action'
import { type FileType } from '@/utils/fs'
import { confirmDialog } from '@/utils/tools'
import { addListMusics, setActiveList } from '@/core/list'
import { getList } from '@/core/player/playInfo'
import { LIST_IDS } from '@/config/constant'
import { playList } from '@/core/player/player'
import {
  buildLocalMusicInfo,
  buildLocalMusicInfoByFilePath,
} from '@/screens/Home/Views/Mylist/MyList/listAction'

export const handleFileLXMCAction = async (file: FileType) => {
  if (
    !(await confirmDialog({
      message: global.i18n.t('deep_link_file_lxmc_confirm_tip', { name: file.name }),
    }))
  )
    return

  handleImportList(file.path)
}

export const handleFileMusicAction = async (file: FileType) => {
  const info = await readMetadata(file.path)
  const musicInfo = info
    ? buildLocalMusicInfo(file.path, info)
    : buildLocalMusicInfoByFilePath(file)
  // 外部打开的音频属于试听列表，不能用播放一次即出队的“稍后播放”。
  await addListMusics(LIST_IDS.DEFAULT, [musicInfo])
  const index = getList(LIST_IDS.DEFAULT).findIndex(item => item.id === musicInfo.id)
  if (index < 0) throw new Error('音频未能加入试听列表')
  setActiveList(LIST_IDS.DEFAULT)
  await playList(LIST_IDS.DEFAULT, index)
}

export const handleFileJSAction = async (file: FileType) => {
  if (
    !(await confirmDialog({
      message: global.i18n.t('deep_link_file_js_confirm_tip', { name: file.name }),
    }))
  )
    return

  handleImportLocalFile(file.path)
}
