import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { brand, spacing } from '@/constants/theme';
import { t } from '@/i18n';

// Tela de abertura animada (docs/NOMMA_LAUNCH_SCREEN.md). Fica por cima do app enquanto o banco e os dados carregam;
// some quando `ready` vira true — nunca por um tempo fixo. Assets locais: funciona offline, dentro do APK.

const DOTS = 5;
/** Tempo mínimo na tela para não piscar quando os dados locais carregam em poucos milissegundos. */
const MIN_VISIBLE_MS = 800;
const ENTER_MS = 700;
const EXIT_MS = 320;

// ponytail: símbolo recortado da referência (assets/icons/nexus-glow.png, 505px). Trocar pelo vetor oficial quando existir.
const LOGO = require('../../assets/icons/nexus-glow.png');

const timing = (value: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
  Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });

export function NommaLaunchScreen({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.38, 180);
  const lineWidth = Math.min(width * 0.56, 260);
  const fontSize = Math.round(logoSize * 0.3);

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [enter] = useState(() => new Animated.Value(0)); // 0 -> 1: entrada do logo e do nome
  const [glow] = useState(() => new Animated.Value(0)); // intensidade do brilho
  const [sweep] = useState(() => new Animated.Value(0)); // 0 -> 1: luz percorrendo a linha
  const [dots] = useState(() => new Animated.Value(0)); // 0 -> 5: indicadores acendendo em sequência
  const [screen] = useState(() => new Animated.Value(1)); // opacidade da tela inteira (saída)
  const [shownAt] = useState(() => Date.now());

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion, () => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      // Menos movimento: composição estática, sem pulsos nem varreduras. A saída continua acontecendo.
      enter.setValue(1);
      glow.setValue(0.6);
      dots.setValue(DOTS);
      return;
    }
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.parallel([timing(enter, 1, ENTER_MS, Easing.out(Easing.cubic)), timing(glow, 1, ENTER_MS)]),
        // "respiração" bem sutil do brilho
        Animated.loop(Animated.sequence([timing(glow, 0.65, 1600), timing(glow, 1, 1600)])),
      ]),
      Animated.loop(timing(sweep, 1, 1400, Easing.inOut(Easing.cubic))),
      Animated.loop(timing(dots, DOTS, 1750, Easing.linear)),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, enter, glow, sweep, dots]);

  // Saída: só quando o app está pronto (respeitando o mínimo visual). Reduz o brilho e faz fade da tela.
  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
    const timer = setTimeout(() => {
      Animated.parallel([timing(screen, 0, EXIT_MS), timing(glow, 0.3, EXIT_MS)]).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, shownAt, screen, glow, onFinish]);

  const highlight = lineWidth * 0.35;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, { opacity: screen }]}
      // A tela da marca já está desenhada: troca o splash nativo (mesma cor de fundo) sem piscar.
      onLayout={() => SplashScreen.hide()}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Nomma, carregando"
    >
      <Animated.View
        style={{
          width: logoSize,
          height: logoSize,
          opacity: enter,
          transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        <Animated.Image source={LOGO} blurRadius={12} style={[styles.logo, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }) }]} />
        <Image source={LOGO} style={styles.logo} />
      </Animated.View>

      <Animated.Text
        style={[
          styles.name,
          {
            fontSize,
            letterSpacing: fontSize * 0.14,
            opacity: enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] }),
          },
        ]}
      >
        {t('branding.name')}
      </Animated.Text>

      <Animated.Text style={[styles.slogan, { opacity: enter }]}>{t('branding.slogan')}</Animated.Text>

      <View style={[styles.track, { width: lineWidth }]}>
        <Animated.View
          style={[
            styles.sweep,
            {
              width: highlight,
              opacity: reduceMotion ? 0 : 1,
              transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-highlight, lineWidth] }) }],
            },
          ]}
        />
      </View>

      <View style={styles.dots}>
        {Array.from({ length: DOTS }, (_, i) => (
          <View key={i} style={styles.dot}>
            <Animated.View
              style={[
                styles.dot,
                styles.dotActive,
                { opacity: dots.interpolate({ inputRange: [i, i + 0.35], outputRange: [0, 1], extrapolate: 'clamp' }) },
              ]}
            />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Levemente acima do centro, como na referência.
  container: { backgroundColor: brand.deep, alignItems: 'center', justifyContent: 'center', paddingBottom: '10%', zIndex: 10 },
  logo: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'contain' },
  name: {
    color: brand.text,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    textShadowColor: brand.glow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  slogan: { color: brand.text, fontSize: 14, marginTop: spacing.sm, opacity: 0.82 },
  track: { height: 2, borderRadius: 1, backgroundColor: brand.loadingTrack, marginTop: spacing.xl, overflow: 'hidden' },
  sweep: { height: 2, borderRadius: 1, backgroundColor: brand.loadingActive },
  dots: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xl },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: brand.loadingInactive },
  dotActive: { position: 'absolute', backgroundColor: brand.loadingActive },
});
