import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { createStyle } from '@/utils/tools';
import { useIsPlay } from '@/store/player/hook';

export default ({ color = '#1cd0a6' }: { color?: string }) => {
    const isPlay = useIsPlay();
    const anim1 = useRef(new Animated.Value(0.3)).current;
    const anim2 = useRef(new Animated.Value(0.8)).current;
    const anim3 = useRef(new Animated.Value(0.5)).current;
    const anim4 = useRef(new Animated.Value(0.2)).current;

    useEffect(() => {
        let a1: Animated.CompositeAnimation;
        let a2: Animated.CompositeAnimation;
        let a3: Animated.CompositeAnimation;
        let a4: Animated.CompositeAnimation;

        if (isPlay) {
            const createAnimation = (anim: Animated.Value, duration: number, delay: number = 0) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: duration,
                            useNativeDriver: true,
                            delay,
                        }),
                        Animated.timing(anim, {
                            toValue: 0.2,
                            duration: duration,
                            useNativeDriver: true,
                        })
                    ])
                );
            };

            a1 = createAnimation(anim1, 400);
            a2 = createAnimation(anim2, 500, 100);
            a3 = createAnimation(anim3, 350, 200);
            a4 = createAnimation(anim4, 450, 50);

            a1.start();
            a2.start();
            a3.start();
            a4.start();
        } else {
            anim1.stopAnimation();
            anim2.stopAnimation();
            anim3.stopAnimation();
            anim4.stopAnimation();

            Animated.timing(anim1, { toValue: 0.2, duration: 200, useNativeDriver: true }).start();
            Animated.timing(anim2, { toValue: 0.4, duration: 200, useNativeDriver: true }).start();
            Animated.timing(anim3, { toValue: 0.2, duration: 200, useNativeDriver: true }).start();
            Animated.timing(anim4, { toValue: 0.3, duration: 200, useNativeDriver: true }).start();
        }

        return () => {
            a1?.stop();
            a2?.stop();
            a3?.stop();
            a4?.stop();
        };
    }, [isPlay, anim1, anim2, anim3, anim4]);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: anim1 }] }]} />
            <Animated.View style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: anim2 }] }]} />
            <Animated.View style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: anim3 }] }]} />
            <Animated.View style={[styles.bar, { backgroundColor: color, transform: [{ scaleY: anim4 }] }]} />
        </View>
    );
};

const styles = createStyle({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        width: 14,
        height: 14,
    },
    bar: {
        width: 2.5,
        height: '100%',
        borderRadius: 1,
    },
});
