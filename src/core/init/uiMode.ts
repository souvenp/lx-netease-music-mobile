import { getUiMode } from '@/utils/nativeModules/utils'

export default async () => {
    try {
        const mode = await getUiMode()
        // UI_MODE_TYPE_CAR = 3
        global.lx.isCarMode = mode === 3
    } catch (err) {
        global.lx.isCarMode = false
    }
}
