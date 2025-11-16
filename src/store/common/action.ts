import state, { type InitState } from './state'
import { type COMPONENT_IDS } from '@/config/constant'

export default {
  setFontSize(size: number) {
    state.fontSize = size
    global.state_event.fontSizeUpdated(size)
  },
  setStatusbarHeight(size: number) {
    if (state.statusbarHeight == size) return
    state.statusbarHeight = size
    global.state_event.statusbarHeightUpdated(size)
  },
  setComponentId(name: COMPONENT_IDS, id: string) {
    state.componentIds.push({ name, id })
    global.state_event.componentIdsUpdated([...state.componentIds])
  },
  removeComponentId(id: string) {
    const initialLength = state.componentIds.length
    state.componentIds = state.componentIds.filter(item => item.id !== id)
    if (state.componentIds.length < initialLength) {
      global.state_event.componentIdsUpdated([...state.componentIds])
    }
  },
  setNavActiveId(id: InitState['navActiveId']) {
    state.navActiveId = id
    if (id != 'nav_setting') state.lastNavActiveId = id
    global.state_event.navActiveIdUpdated(id)
  },
  setLastNavActiveId(id: InitState['navActiveId']) {
    state.lastNavActiveId = id
  },
  setBgPic(pic: string | null) {
    state.bgPic = pic
    global.state_event.bgPicUpdated(pic)
  },
  setSourceNames(names: InitState['sourceNames']) {
    state.sourceNames = names
    global.state_event.sourceNamesUpdated(names)
  },
}
