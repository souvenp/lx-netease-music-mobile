import { useEffect, useSyncExternalStore } from 'react'
import { AppState, Keyboard, PixelRatio, StyleSheet, Text, View } from 'react-native'
import { getStartupGreeting, hideStartupGreeting, subscribeStartupGreeting } from '@/core/startupGreeting'

// 放在首页普通视图树中，整层及子元素均不参与触摸命中，也不覆盖系统键盘窗口。
export default () => {
  const message = useSyncExternalStore(subscribeStartupGreeting, getStartupGreeting)

  useEffect(() => {
    // 其他输入框或启动时已显示的键盘也应优先；离开应用后不残留问候语。
    if (Keyboard.isVisible() || AppState.currentState !== 'active') hideStartupGreeting()
    const keyboardListener = Keyboard.addListener('keyboardDidShow', hideStartupGreeting)
    const appStateListener = AppState.addEventListener('change', state => {
      if (state !== 'active') hideStartupGreeting()
    })
    return () => {
      keyboardListener.remove()
      appStateListener.remove()
    }
  }, [])

  if (!message) return null
  return <View pointerEvents="none" style={styles.container}>
    <View style={styles.bubble}>
      <Text style={styles.text} accessibilityLiveRegion="polite">{message}</Text>
    </View>
  </View>
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    // 原生 Toast 的底部偏移为 120 物理像素，转换成 RN 布局单位保持原位置。
    bottom: 120 / PixelRatio.get(),
    alignItems: 'center',
    zIndex: 40,
  },
  bubble: { maxWidth: '100%', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#333333' },
  text: { color: '#ffffff', fontSize: 14, textAlign: 'center' },
})
