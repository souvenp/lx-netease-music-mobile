import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeW } from '@/utils/pixelRatio'
import React, { forwardRef } from 'react'

export const BTN_WIDTH = scaleSizeW(36)
export const BTN_ICON_SIZE = 24

const Btn = forwardRef(({
                          icon,
                          color,
                          onPress,
                          onLongPress,
                        }: {
  icon: string
  color?: string
  onPress: () => void
  onLongPress?: () => void
}, ref: React.Ref<TouchableOpacity>) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      ref={ref}
      style={{ ...styles.cotrolBtn, width: BTN_WIDTH, height: BTN_WIDTH }}
      activeOpacity={0.5}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Icon name={icon} color={color ?? theme['c-font-label']} size={BTN_ICON_SIZE} />
    </TouchableOpacity>
  )
})

export default Btn

const styles = createStyle({
  cotrolBtn: {
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',

    // backgroundColor: '#ccc',
    shadowOpacity: 1,
    textShadowRadius: 1,
  },
})
