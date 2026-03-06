import { NativeModules, NativeEventEmitter } from 'react-native'

const { MusicWidgetModule } = NativeModules

const widgetEmitter = new NativeEventEmitter(MusicWidgetModule)

/**
 * Update the home screen widget with current playback info
 */
export const updateWidget = async (
    title: string,
    artist: string,
    isPlaying: boolean,
    artworkUrl?: string,
): Promise<void> => {
    return MusicWidgetModule.updateWidget(title, artist, isPlaying, artworkUrl ?? '')
}

/**
 * Listen for widget button press events
 */
export const onWidgetPlayPause = (callback: () => void) => {
    return widgetEmitter.addListener('widget-play-pause', callback)
}

export const onWidgetPrev = (callback: () => void) => {
    return widgetEmitter.addListener('widget-prev', callback)
}

export const onWidgetNext = (callback: () => void) => {
    return widgetEmitter.addListener('widget-next', callback)
}
