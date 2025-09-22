// screens/Home/Views/Setting/settings/Theme/Blur.tsx

import { memo, useCallback, useState } from 'react'
import { View } from 'react-native'
import SubTitle from '../../components/SubTitle'
import Slider, { type SliderProps } from '../../components/Slider'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'

export default memo(() => {
  const t = useI18n()
  const blur = useSettingValue('theme.blur')
  const theme = useTheme()
  const [sliderSize, setSliderSize] = useState(blur)
  const [isSliding, setSliding] = useState(false)

  const handleSlidingStart = useCallback<NonNullable<SliderProps['onSlidingStart']>>(() => {
    setSliding(true)
  }, [])

  const handleValueChange = useCallback<NonNullable<SliderProps['onValueChange']>>((value) => {
    setSliderSize(value)
  }, [])

  const handleSlidingComplete = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(
    (value) => {
      setSliding(false)
      if (blur === value) return
      updateSetting({ 'theme.blur': value })
    },
    [blur]
  )

  return (
    <SubTitle title={'背景模糊度'}>
      <View style={styles.content}>
        <Text style={{ color: theme['c-primary-font'] }}>
          {isSliding ? sliderSize : blur}
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={100}
          onSlidingComplete={handleSlidingComplete}
          onValueChange={handleValueChange}
          onSlidingStart={handleSlidingStart}
          step={1}
          value={blur}
        />
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  content: {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
})
