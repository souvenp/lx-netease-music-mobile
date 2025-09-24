import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';
import SubTitle from '../../components/SubTitle';
import Slider, { type SliderProps } from '../../components/Slider';
import { useI18n } from '@/lang';
import { useSettingValue } from '@/store/setting/hook';
import { useTheme } from '@/store/theme/hook';
import { createStyle } from '@/utils/tools';
import Text from '@/components/common/Text';
import { updateSetting } from '@/core/common';

export default memo(() => {
  const t = useI18n();
  const picOpacity = useSettingValue('theme.picOpacity');
  const theme = useTheme();

  const [sliderValue, setSliderValue] = useState(picOpacity);
  const [isSliding, setSliding] = useState(false);

  const handleSlidingStart = useCallback<NonNullable<SliderProps['onSlidingStart']>>(() => {
    setSliding(true);
  }, []);

  const handleValueChange = useCallback<NonNullable<SliderProps['onValueChange']>>((value) => {
    setSliderValue(value);
  }, []);

  const handleSlidingComplete = useCallback<NonNullable<SliderProps['onSlidingComplete']>>(
    (value) => {
      setSliding(false);
      if (picOpacity === value) return;
      updateSetting({ 'theme.picOpacity': value });
    },
    [picOpacity]
  );

  return (
    <SubTitle title={'背景图片不透明度'}>
      <View style={styles.content}>
        <Text style={{ color: theme['c-primary-font'] }}>
          {isSliding ? sliderValue : picOpacity}
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={100}
          onSlidingComplete={handleSlidingComplete}
          onValueChange={handleValueChange}
          onSlidingStart={handleSlidingStart}
          step={1}
          value={picOpacity}
        />
      </View>
    </SubTitle>
  );
});

const styles = createStyle({
  content: {
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
