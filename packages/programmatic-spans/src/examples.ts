export type ProgrammaticSpanExampleCategory =
  | 'Mont Presets'
  | 'Hyperframes Captions'
  | 'Hyperframes Effects'
  | 'Hyperframes Transitions';

export type ProgrammaticSpanExampleId = string;

export interface ProgrammaticSpanExample {
  id: ProgrammaticSpanExampleId;
  title: string;
  category: ProgrammaticSpanExampleCategory;
  source: string;
  hyperframes?: {
    name: string;
    url: string;
  };
}

export const PROGRAMMATIC_SPAN_EXAMPLE_CATEGORIES: ProgrammaticSpanExampleCategory[] = [
  'Mont Presets',
  'Hyperframes Captions',
  'Hyperframes Effects',
  'Hyperframes Transitions'
];

const CORE_PROGRAMMATIC_SPAN_EXAMPLES: Array<Omit<ProgrammaticSpanExample, 'category'>> = [
  {
    id: 'product-promo',
    title: 'Product Promo',
    source: `export default defineSpanScene({
  id: "product-promo",
  width: 1280,
  height: 720,
  durationMs: 6200,
  editModeTimeMs: 2100,
  settings: {
    headline: textSetting("Ship the exact demo", { label: "Headline" }),
    primary: colorSetting("#14b8a6", { label: "Primary color" }),
    accent: colorSetting("#2563eb", { label: "Accent color" }),
    ctaLabel: stringSetting("Create scene", { label: "Button label" }),
    metricValue: numberSetting(4.8, { label: "Metric value", min: 1, max: 8, step: 0.1 }),
    ctaFrame: rectSetting({ x: 0, y: 27, width: 214, height: 58 }, { label: "CTA frame", overlay: "frame", visualId: "cta" }),
    cursorStart: pointSetting({ x: 836, y: 388 }, { label: "Cursor start", overlay: true, overlayGroup: "cursor-path", overlayOrder: 0, overlayOriginVisualId: "browser-body" }),
    cursorClick: pointSetting({ x: 226, y: 414 }, { label: "Cursor click", overlay: true, overlayGroup: "cursor-path", overlayOrder: 1, overlayOriginVisualId: "browser-body" })
  },
  tokens: {
    backdrop: color.darken(settings.primary, 0.72),
    haloLeft: color.darken(settings.primary, 0.34),
    haloRight: color.darken(settings.accent, 0.34),
    ctaFill: settings.primary,
    ctaGlow: color.mix(settings.primary, "#ffffff", 0.62),
    metricSurface: color.mix(settings.accent, "#ffffff", 0.91),
    metricStroke: color.mix(settings.accent, "#ffffff", 0.66),
    metricText: color.darken(settings.accent, 0.42),
    metricLabel: color.darken(settings.accent, 0.18)
  },
  render({ settings, tokens }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill={tokens.backdrop} layer={0} />
        <Rect id="halo-left" x={-180} y={64} width={440} height={440} radius={220} fill={tokens.haloLeft} opacity={0.62} blur={34} layer={1} />
        <Rect id="halo-right" x={920} y={260} width={420} height={420} radius={210} fill={tokens.haloRight} opacity={0.42} blur={34} layer={1} />
        <MotionBox id="browser-motion" x={166} y={98} width={948} height={524} pivotX="50%" pivotY="50%" layer={2}>
          <Animation.SwoopIn start="0ms" duration="720ms" />
          <Animation.SwoopOut start="5400ms" duration="620ms" />
          <BrowserWindow id="browser" x={0} y={0} width="100%" height="100%" radius={28} headerHeight={66} fill="#f8fafc" stroke="#dbeafe" strokeWidth={2}>
            <Bento id="content-grid" x={54} y={100} width={840} height={370} columns={12} rows={6} gap={18}>
              <Cell id="copy-cell" col={1} row={1} colSpan={7} rowSpan={4} mode="position">
                <VStack id="copy-stack" x={0} y={0} width="100%" height={246} gap={18} align="start">
                  <Text id="headline" text={settings.headline} width="100%" height={126} size={58} color="#0f172a" layer={5}>
                    <TextEffect.Typewriter start="420ms" duration="920ms" />
                    <Animation.FadeIn start="420ms" duration="380ms" />
                  </Text>
                  <Text id="body" text="Programmatic spans can draw reusable scenes with deterministic GPU timing." width="92%" height={82} size={24} weight="500" color="#475569" layer={5}>
                    <Animation.FadeIn start="780ms" duration="360ms" />
                  </Text>
                </VStack>
              </Cell>
              <Cell id="metric-cell" col={9} row={2} colSpan={4} rowSpan={3} padding={8} align="center" justify="center">
                <Rect id="metric-card" x={0} y={0} width="100%" height="100%" radius={24} fill={tokens.metricSurface} stroke={tokens.metricStroke} strokeWidth={2} layer={5}>
                  <Animate prop="scale" from={0.9} to={1} start="1150ms" duration="360ms" ease="outCubic" />
                  <Animate prop="opacity" from={0} to={1} start="1150ms" duration="260ms" ease="outQuad" />
                </Rect>
                <VStack id="metric-stack" width="72%" height="58%" gap={10} align="center">
                  <Text id="metric-value" text="4.8x" width="100%" height="62%" size={54} color={tokens.metricText} align="center" layer={6}>
                    <TextEffect.Count from={1.0} to={settings.metricValue} start="1240ms" duration="680ms" step="decimal" suffix="x" />
                    <Animation.FadeIn start="1420ms" duration="260ms" />
                  </Text>
                  <Text id="metric-label" text="faster iteration" width="100%" height="28%" size={21} weight="600" color={tokens.metricLabel} align="center" opacity={0} layer={6}>
                    <Animation.FadeIn start="1740ms" duration="260ms" />
                  </Text>
                </VStack>
              </Cell>
              <Cell id="cta-cell" col={1} row={5} colSpan={4} rowSpan={2} align="start" justify="center">
                <MotionBox id="cta-motion" x={settings.ctaFrame.x} y={settings.ctaFrame.y} width={settings.ctaFrame.width} height={settings.ctaFrame.height} pivotX="50%" pivotY="50%">
                  <Animation.FadeIn start="1700ms" duration="340ms" />
                  <Animation.Pulse start="3090ms" duration="260ms" peak={0.96} easeIn="outQuad" easeOut="outCubic" />
                  <CTAButton id="cta" label={settings.ctaLabel} width="100%" height="100%" radius={18} fill={tokens.ctaFill} hoverStart="2920ms" clickStart="3090ms" hoverGlowFill={tokens.ctaGlow} layer={5} />
                </MotionBox>
              </Cell>
            </Bento>
            <CursorClick id="cursor" fromX={settings.cursorStart.x} fromY={settings.cursorStart.y} toX={settings.cursorClick.x} toY={settings.cursorClick.y} moveStart="2150ms" moveDuration="900ms" clickStart="3090ms" pulseStart="3060ms" pulseDuration="780ms" pulseColor={tokens.ctaFill} cursorWidth={56} layer={10} />
          </BrowserWindow>
        </MotionBox>
        <Rect id="fade-in-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={1} layer={60}>
          <Animation.FadeOut start="0ms" duration="420ms" />
        </Rect>
        <Rect id="fade-out-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={0} layer={61}>
          <Animation.FadeIn start="5600ms" duration="520ms" />
        </Rect>
      </Scene>
    );
  }
});`
  },
  {
    id: 'text-effects-showcase',
    title: 'Text Effects Showcase',
    source: `export default defineSpanScene({
  id: "text-effects-showcase",
  width: 1280,
  height: 720,
  durationMs: 4200,
  variables: {
    accent: colorVar("#14b8a6")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#111827" layer={0} />
        <Text id="title" text="Text effects compose with stable layout" x={96} y={70} width={840} height={82} size={52} color="#f8fafc" layer={2}>
          <TextEffect.Typewriter start="120ms" duration="900ms" />
        </Text>
        <Bento id="effect-grid" x={96} y={184} width={1088} height={430} columns={3} rows={2} gap={22}>
          <Cell id="word-cell" col={1} row={1} colSpan={1} rowSpan={1} padding={26} align="center" justify="center">
            <Rect id="word-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#bae6fd" strokeWidth={2} layer={2} />
            <VStack id="word-stack" width="86%" height="62%" gap={16} align="center">
              <Text id="word-label" text="Word reveal" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={3} />
              <Text id="word-text" text="Design systems repeat" width="100%" height={68} size={34} color="#0f766e" align="center" layer={3}>
                <TextEffect.WordReveal start="760ms" duration="980ms" stagger={220} />
              </Text>
            </VStack>
          </Cell>
          <Cell id="letter-cell" col={2} row={1} colSpan={1} rowSpan={1} padding={26} align="center" justify="center">
            <Rect id="letter-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#c4b5fd" strokeWidth={2} layer={2} />
            <VStack id="letter-stack" width="86%" height="62%" gap={16} align="center">
              <Text id="letter-label" text="Letter fly in" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={3} />
              <Text id="letter-text" text="Momentum" width="100%" height={70} size={44} color="#6d28d9" align="center" layer={3}>
                <TextEffect.LetterFlyIn start="1060ms" duration="980ms" direction="bottom" />
              </Text>
            </VStack>
          </Cell>
          <Cell id="drop-cell" col={3} row={1} colSpan={1} rowSpan={1} padding={26} align="center" justify="center">
            <Rect id="drop-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#fed7aa" strokeWidth={2} layer={2} />
            <VStack id="drop-stack" width="86%" height="62%" gap={16} align="center">
              <Text id="drop-label" text="Word drop" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={3} />
              <Text id="drop-text" text="Launch with polish" width="100%" height={70} size={36} color="#c2410c" align="center" layer={3}>
                <TextEffect.WordDrop start="1360ms" duration="960ms" />
              </Text>
            </VStack>
          </Cell>
          <Cell id="wipe-cell" col={1} row={2} colSpan={1} rowSpan={1} padding={26} align="center" justify="center">
            <Rect id="wipe-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#99f6e4" strokeWidth={2} layer={2} />
            <VStack id="wipe-stack" width="86%" height="62%" gap={16} align="center">
              <Text id="wipe-label" text="Text wipe" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={3} />
              <Text id="wipe-text" text="Reveal from the right" width="100%" height={70} size={34} color="#0f766e" align="center" layer={3}>
                <TextEffect.Wipe start="1660ms" duration="900ms" direction="right" />
              </Text>
            </VStack>
          </Cell>
          <Cell id="general-cell" col={2} row={2} colSpan={1} rowSpan={1} padding={26} align="center" justify="center">
            <Rect id="general-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#bfdbfe" strokeWidth={2} layer={2} />
            <VStack id="general-stack" width="86%" height="62%" gap={16} align="center">
              <Text id="general-label" text="General reveal" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={3} />
              <Text id="general-text" text="Agent-authored motion" width="100%" height={70} size={32} color="#1d4ed8" align="center" layer={3}>
                <TextEffect.Reveal unit="words" style="fly" direction="bottom" start="1960ms" duration="960ms" stagger={240} />
              </Text>
            </VStack>
          </Cell>
          <Cell id="count-cell" col={3} row={2} colSpan={1} rowSpan={1} padding={26} align="center" justify="center">
            <Rect id="count-card" width="100%" height="100%" radius={24} fill="#ecfeff" stroke="#67e8f9" strokeWidth={2} layer={2} />
            <VStack id="count-stack" width="86%" height="62%" gap={16} align="center">
              <Text id="count-label" text="Count value" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={3} />
              <Text id="count-text" text="4.8x" width="100%" height={72} size={50} color={vars.accent} align="center" layer={3}>
                <TextEffect.Count from={1.0} to={4.8} start="2260ms" duration="760ms" step="decimal" suffix="x" />
              </Text>
            </VStack>
          </Cell>
        </Bento>
      </Scene>
    );
  }
});`
  },
  {
    id: 'media-showcase',
    title: 'Visual Media',
    source: `export default defineSpanScene({
  id: "media-showcase",
  width: 1280,
  height: 720,
  durationMs: 5600,
  variables: {
    accent: colorVar("#14b8a6")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#0f172a" layer={0} />
        <Circle id="wash-a" x={112} y={146} radius={190} fill="#155e75" opacity={0.58} blur={32} layer={1} />
        <Circle id="wash-b" x={1110} y={560} radius={220} fill="#4c1d95" opacity={0.44} blur={34} layer={1} />
        <Text id="title" text="Visual media stays native" x={96} y={64} width={820} height={76} size={56} color="#f8fafc" layer={2}>
          <Animation.FadeIn start="80ms" duration="360ms" />
        </Text>
        <Text id="subtitle" text="Bitmap, vector, GIF, Lottie, and 3D visuals compile into the existing GPU scene renderer." x={100} y={142} width={820} height={48} size={24} weight="500" color="#cbd5e1" layer={2}>
          <Animation.FadeIn start="220ms" duration="360ms" />
        </Text>
        <Bento id="media-grid" x={96} y={236} width={1088} height={332} columns={10} rows={1} gap={18}>
          <Cell id="vector-cell" col={1} row={1} colSpan={2} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="vector-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#bae6fd" strokeWidth={2} layer={2} />
            <VStack id="vector-stack" width="82%" height="76%" gap={14} align="center">
              <Text id="vector-label" text="Vector" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={4} />
              <Vector id="vector-logo" src={asset("/brand/logo-icon.svg")} width="88%" height={142} fit="contain" layer={4}>
                <Animation.SwoopIn start="360ms" duration="620ms" />
              </Vector>
            </VStack>
          </Cell>
          <Cell id="bitmap-cell" col={3} row={1} colSpan={2} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="bitmap-card" width="100%" height="100%" radius={24} fill="#ffffff" stroke="#bbf7d0" strokeWidth={2} layer={2} />
            <VStack id="bitmap-stack" width="82%" height="76%" gap={14} align="center">
              <Text id="bitmap-label" text="Bitmap" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={4} />
              <Bitmap id="bitmap-logo" src={asset("/brand/logo-128.png")} width={142} height={142} fit="contain" layer={4}>
                <Animation.SwoopIn start="500ms" duration="620ms" />
              </Bitmap>
            </VStack>
          </Cell>
          <Cell id="gif-cell" col={5} row={1} colSpan={2} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="gif-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#fde68a" strokeWidth={2} layer={2} />
            <VStack id="gif-stack" width="82%" height="76%" gap={14} align="center">
              <Text id="gif-label" text="GIF" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={4} />
              <Gif id="gif-swatch" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" contentType="image/gif" originalName="swatch.gif" width="100%" height={142} fit="cover" layer={4}>
                <Animate prop="opacity" from={0} to={1} start="640ms" duration="320ms" ease="outQuad" />
                <Animation.Pulse start="1560ms" duration="560ms" peak={1.06} />
              </Gif>
              <Rect id="gif-stripe" width="68%" height={12} radius={6} fill={vars.accent} layer={5}>
                <Animate prop="opacity" from={0} to={1} start="1500ms" duration="320ms" ease="outQuad" />
                <Animation.Pulse start="1840ms" duration="520ms" peak={1.08} />
              </Rect>
            </VStack>
          </Cell>
          <Cell id="lottie-cell" col={7} row={1} colSpan={2} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="lottie-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#67e8f9" strokeWidth={2} layer={2} />
            <VStack id="lottie-stack" width="82%" height="76%" gap={14} align="center">
              <Text id="lottie-label" text="Lottie" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={4} />
              <Lottie id="pulse-lottie" src={asset("/workbench/programmatic-spans/pulse-lottie.json")} width={154} height={154} fit="contain" mediaSpeed={1.15} layer={4}>
                <Animation.FadeIn start="780ms" duration="340ms" />
              </Lottie>
            </VStack>
          </Cell>
          <Cell id="model-cell" col={9} row={1} colSpan={2} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="model-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#c4b5fd" strokeWidth={2} layer={2} />
            <VStack id="model-stack" width="82%" height="76%" gap={14} align="center">
              <Text id="model-label" text="3D model" width="100%" height={34} size={24} weight="700" color="#0f172a" align="center" layer={4} />
              <Model3D id="duck-model" src={asset("/experiments/3d-assets/Duck.glb")} width="100%" height={154} cameraDistance={3.4} cameraFov={34} pitch={8} yaw={-24} assetScale={1.05} layer={4}>
                <Animate prop="modelYaw" from={-24} to={26} start="940ms" duration="3600ms" ease="inOutCubic" />
                <Animation.FadeIn start="920ms" duration="360ms" />
              </Model3D>
            </VStack>
          </Cell>
        </Bento>
        <Rect id="fade-in-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={1} layer={60}>
          <Animation.FadeOut start="0ms" duration="420ms" />
        </Rect>
        <Rect id="fade-out-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={0} layer={61}>
          <Animation.FadeIn start="5040ms" duration="520ms" />
        </Rect>
      </Scene>
    );
  }
});`
  },
  {
    id: 'shape-showcase',
    title: 'Parametric Shapes',
    source: `export default defineSpanScene({
  id: "shape-showcase",
  width: 1280,
  height: 720,
  durationMs: 5200,
  variables: {
    accent: colorVar("#14b8a6"),
    sky: colorVar("#38bdf8")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#0f172a" layer={0} />
        <Circle id="wash-left" x={88} y={128} radius={190} fill="#134e4a" opacity={0.48} blur={34} layer={1} />
        <Circle id="wash-right" x={1070} y={560} radius={220} fill="#312e81" opacity={0.44} blur={36} layer={1} />
        <Text id="title" text="Parametric shapes stay native" x={96} y={66} width={760} height={74} size={52} color="#f8fafc" layer={2}>
          <Animation.FadeIn start="80ms" duration="360ms" />
        </Text>
        <Text id="subtitle" text="Stars, arrows, callouts, lines, arcs, triangles, and diamonds compile into timeline shape visuals." x={100} y={140} width={900} height={44} size={23} weight="500" color="#cbd5e1" layer={2}>
          <Animation.FadeIn start="240ms" duration="360ms" />
        </Text>
        <Bento id="shape-grid" x={96} y={224} width={1088} height={384} columns={4} rows={2} gap={20}>
          <Cell id="star-cell" col={1} row={1} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="star-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#fde68a" strokeWidth={2} layer={2} />
            <VStack id="star-stack" width="82%" height="100%" gap={12} align="center" justify="center">
              <Text id="star-label" text="Star badge" width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
              <Shape.Star id="star-shape" width={100} height={100} fill="#facc15" stroke="#f59e0b" strokeWidth={2} cornerRadius={8} layer={4}>
                <Animation.SwoopIn start="360ms" duration="620ms" />
                <Animation.Pulse start="1360ms" duration="520ms" peak={1.08} />
              </Shape.Star>
            </VStack>
          </Cell>
          <Cell id="arrow-cell" col={2} row={1} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="arrow-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#99f6e4" strokeWidth={2} layer={2} />
            <VStack id="arrow-stack" width="86%" height="100%" gap={14} align="center" justify="center">
              <Text id="arrow-label" text="Arrow flow" width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
              <Shape.Arrow id="arrow-shape" width="100%" height={68} fill={vars.accent} cornerRadius={12} headLength={36} shaftWidth={34} wingConcavity={10} layer={4}>
                <Animation.SwoopIn start="520ms" duration="620ms" />
              </Shape.Arrow>
            </VStack>
          </Cell>
          <Cell id="callout-cell" col={3} row={1} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="callout-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#bfdbfe" strokeWidth={2} layer={2} />
            <Text id="callout-label" text="Callout" x={0} y={4} width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
            <Shape.CalloutBox id="callout-shape" x={16} y={48} width="88%" height={86} fill="#ffffff" stroke="#93c5fd" strokeWidth={2} cornerRadius={18} pointerSide="bottom" pointerOffset={68} pointerWidth={44} pointerHeight={22} layer={4}>
              <Animation.FadeIn start="680ms" duration="360ms" />
            </Shape.CalloutBox>
            <Text id="callout-copy" text="Native pointer" x={44} y={74} width={164} height={34} size={21} weight="700" color="#1e3a8a" align="center" layer={5}>
              <Animation.FadeIn start="840ms" duration="320ms" />
            </Text>
          </Cell>
          <Cell id="arc-cell" col={4} row={1} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="arc-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#bbf7d0" strokeWidth={2} layer={2} />
            <VStack id="arc-stack" width="82%" height="100%" gap={12} align="center" justify="center">
              <Text id="arc-label" text="Arc progress" width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
              <Shape.Arc id="arc-shape" width={100} height={100} fill="#22c55e" sweep={8} thickness={28} cornerRadius={8} layer={4}>
                <Animate prop="sweep" from={8} to={78} start="820ms" duration="980ms" ease="outCubic" />
              </Shape.Arc>
            </VStack>
          </Cell>
          <Cell id="line-cell" col={1} row={2} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="line-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#bae6fd" strokeWidth={2} layer={2} />
            <VStack id="line-stack" width="86%" height="100%" gap={14} align="center" justify="center">
              <Text id="line-label" text="Curved line" width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
              <Shape.Line id="line-shape" width="100%" height={72} stroke={vars.sky} strokeWidth={8} control1Y={12} control2Y={88} layer={4}>
                <Animation.FadeIn start="960ms" duration="360ms" />
              </Shape.Line>
            </VStack>
          </Cell>
          <Cell id="turn-cell" col={2} row={2} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="turn-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#ddd6fe" strokeWidth={2} layer={2} />
            <VStack id="turn-stack" width="86%" height="100%" gap={14} align="center" justify="center">
              <Text id="turn-label" text="Turn arrow" width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
              <Shape.TurnArrow id="turn-shape" width="100%" height={72} fill="#8b5cf6" cornerRadius={12} tailWidth={36} headLength={34} layer={4}>
                <Animation.SwoopIn start="1100ms" duration="620ms" />
              </Shape.TurnArrow>
            </VStack>
          </Cell>
          <Cell id="triangle-cell" col={3} row={2} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="triangle-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#fecdd3" strokeWidth={2} layer={2} />
            <VStack id="triangle-stack" width="82%" height="100%" gap={12} align="center" justify="center">
              <Text id="triangle-label" text="Triangle" width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
              <Shape.Triangle id="triangle-shape" width={98} height={98} fill="#fb7185" stroke="#e11d48" strokeWidth={2} cornerRadius={10} rotation={90} layer={4}>
                <Animation.SwoopIn start="1240ms" duration="620ms" />
              </Shape.Triangle>
            </VStack>
          </Cell>
          <Cell id="diamond-cell" col={4} row={2} colSpan={1} rowSpan={1} padding={18} align="center" justify="center">
            <Rect id="diamond-card" width="100%" height="100%" radius={22} fill="#f8fafc" stroke="#fed7aa" strokeWidth={2} layer={2} />
            <VStack id="diamond-stack" width="82%" height="100%" gap={12} align="center" justify="center">
              <Text id="diamond-label" text="Diamond" width="100%" height={30} size={23} weight="700" color="#0f172a" align="center" layer={4} />
              <Shape.Diamond id="diamond-shape" width={98} height={98} fill="#fb923c" stroke="#ea580c" strokeWidth={2} cornerRadius={8} layer={4}>
                <Animation.SwoopIn start="1380ms" duration="620ms" />
              </Shape.Diamond>
            </VStack>
          </Cell>
        </Bento>
        <Rect id="fade-in-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={1} layer={60}>
          <Animation.FadeOut start="0ms" duration="420ms" />
        </Rect>
        <Rect id="fade-out-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={0} layer={61}>
          <Animation.FadeIn start="4680ms" duration="520ms" />
        </Rect>
      </Scene>
    );
  }
});`
  },
  {
    id: 'render-effects-showcase',
    title: 'Render Effects',
    source: `export default defineSpanScene({
  id: "render-effects-showcase",
  width: 1280,
  height: 720,
  durationMs: 5200,
  variables: {
    accent: colorVar("#14b8a6"),
    glow: colorVar("#67e8f9")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#0f172a" layer={0} />
        <Circle id="wash-a" x={86} y={128} radius={200} fill="#0e7490" opacity={0.38} blur={34} layer={1} />
        <Circle id="wash-b" x={1064} y={548} radius={224} fill="#6d28d9" opacity={0.34} blur={36} layer={1} />
        <Text id="title" text="Render effects are visual props" x={96} y={66} width={820} height={74} size={52} color="#f8fafc" layer={2}>
          <Animation.FadeIn start="80ms" duration="360ms" />
        </Text>
        <Text id="subtitle" text="Blur, shadows, glows, and tilt shift reuse the existing GPU renderer attributes." x={100} y={140} width={860} height={44} size={23} weight="500" color="#cbd5e1" layer={2}>
          <Animation.FadeIn start="240ms" duration="360ms" />
        </Text>
        <Bento id="effect-grid" x={96} y={228} width={1088} height={360} columns={4} rows={1} gap={22}>
          <Cell id="shadow-cell" col={1} row={1} colSpan={1} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="shadow-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#bae6fd" strokeWidth={2} layer={2}>
              <RenderEffect.Shadow blur={22} y={18} opacity={34} color="#020617" />
            </Rect>
            <VStack id="shadow-stack" width="82%" height="78%" gap={18} align="center" justify="center">
              <Text id="shadow-label" text="Shadow" width="100%" height={34} size={26} weight="700" color="#0f172a" align="center" layer={5} />
              <Shape.Star id="shadow-star" width={110} height={110} fill="#facc15" stroke="#f59e0b" strokeWidth={2} cornerRadius={8} layer={5}>
                <RenderEffect.Shadow blur={18} y={14} opacity={36} color="#78350f" />
                <Animation.SwoopIn start="360ms" duration="620ms" />
              </Shape.Star>
            </VStack>
          </Cell>
          <Cell id="glow-cell" col={2} row={1} colSpan={1} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="glow-card" width="100%" height="100%" radius={24} fill="#0f172a" stroke="#164e63" strokeWidth={2} layer={2} />
            <VStack id="glow-stack" width="82%" height="78%" gap={18} align="center" justify="center">
              <Text id="glow-label" text="Glow" width="100%" height={34} size={26} weight="700" color="#e0f2fe" align="center" layer={5} />
              <Shape.Arc id="glow-arc" width={116} height={116} fill={vars.glow} sweep={78} thickness={26} cornerRadius={8} layer={5}>
                <RenderEffect.Glow color={vars.glow} blur={34} opacity={72} />
                <Animation.Pulse start="860ms" duration="720ms" peak={1.08} />
              </Shape.Arc>
            </VStack>
          </Cell>
          <Cell id="blur-cell" col={3} row={1} colSpan={1} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="blur-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#ddd6fe" strokeWidth={2} layer={2} />
            <Shape.Diamond id="blur-backdrop" centerX="50%" y={84} width={120} height={120} fill="#8b5cf6" opacity={0.86} layer={4}>
              <RenderEffect.Blur amount={9} />
            </Shape.Diamond>
            <Text id="blur-label" text="Blur" x={0} y={38} width="100%" height={34} size={26} weight="700" color="#0f172a" align="center" layer={5} />
            <Text id="blur-copy" text="soft focus" centerX="50%" y={142} width={176} height={44} size={27} weight="800" color="#312e81" align="center" layer={5}>
              <RenderEffect.Shadow blur={12} y={8} opacity={26} color="#312e81" />
            </Text>
          </Cell>
          <Cell id="tilt-cell" col={4} row={1} colSpan={1} rowSpan={1} padding={22} align="center" justify="center">
            <Rect id="tilt-card" width="100%" height="100%" radius={24} fill="#f8fafc" stroke="#fed7aa" strokeWidth={2} layer={2} />
            <VStack id="tilt-stack" width="84%" height="78%" gap={16} align="center" justify="center">
              <Text id="tilt-label" text="Tilt shift" width="100%" height={34} size={26} weight="700" color="#0f172a" align="center" layer={5} />
              <Shape.CalloutBox id="tilt-callout" width="100%" height={106} fill="#fff7ed" stroke="#fb923c" strokeWidth={2} cornerRadius={18} pointerSide="bottom" pointerOffset={62} pointerWidth={44} pointerHeight={22} layer={5}>
                <RenderEffect.TiltShift blur={13} center={50} focus={32} feather={22} />
              </Shape.CalloutBox>
              <Text id="tilt-copy" text="local focus" width="100%" height={34} size={24} weight="800" color="#c2410c" align="center" layer={6} />
            </VStack>
          </Cell>
        </Bento>
        <Rect id="fade-in-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={1} layer={60}>
          <Animation.FadeOut start="0ms" duration="420ms" />
        </Rect>
        <Rect id="fade-out-cover" x={0} y={0} width={1280} height={720} fill="#0f172a" opacity={0} layer={61}>
          <Animation.FadeIn start="4680ms" duration="520ms" />
        </Rect>
      </Scene>
    );
  }
});`
  },
  {
    id: 'dashboard-window',
    title: 'Dashboard Window',
    source: `export default defineSpanScene({
  id: "dashboard-window",
  width: 1280,
  height: 720,
  durationMs: 6400,
  variables: {
    title: stringVar("Weekly pipeline"),
    accent: colorVar("#2563eb")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#0b1220" layer={0} />
        <BrowserWindow id="dashboard" x={116} y={88} width={1048} height={548} headerHeight={60} radius={26} fill="#f8fafc" headerFill="#e5e7eb" stroke="#93c5fd" strokeWidth={2} layer={2}>
          <Animate prop="opacity" from={0} to={1} start="0ms" duration="360ms" ease="outQuad" />
          <Animate prop="y" from={118} to={88} start="0ms" duration="520ms" ease="outCubic" />
          <Bento id="dashboard-grid" x={46} y={92} width={956} height={398} columns={12} rows={6} gap={18}>
            <Cell id="dashboard-copy" col={1} row={1} colSpan={7} rowSpan={2} mode="position">
              <VStack id="dashboard-copy-stack" x={0} y={0} width={540} height={114} gap={10} align="start">
                <Text id="title" text={vars.title} width={480} height={58} size={42} color="#0f172a" layer={4}>
                  <Animate prop="opacity" from={0} to={1} start="360ms" duration="340ms" ease="outQuad" />
                </Text>
                <Text id="subtitle" text="Chart preset nested inside browser chrome with static TSX props." width={540} height={38} size={20} weight="500" color="#64748b" layer={4} />
              </VStack>
            </Cell>
            <Cell id="dashboard-chart" col={1} row={3} colSpan={9} rowSpan={4} mode="position">
              <DataChart id="chart" title="Qualified meetings" values={[96, 154, 210, 184, 286]} x={0} y={0} baselineOffset={284} axisWidth={760} barWidth={66} gap={38} titleSize={28} titleWidth={420} callout="+42 this week" calloutColor={vars.accent} layer={4} />
            </Cell>
            <Cell id="dashboard-side" col={10} row={2} colSpan={3} rowSpan={4} mode="position">
              <Rect id="side-card" x={0} y={0} width={190} height={278} radius={22} fill="#eff6ff" stroke="#bfdbfe" strokeWidth={2} layer={4}>
                <Animate prop="opacity" from={0} to={1} start="1800ms" duration="320ms" ease="outQuad" />
                <Animate prop="x" from={28} to={0} start="1800ms" duration="420ms" ease="outCubic" />
              </Rect>
              <Text id="score" text="91%" x={34} y={38} width={122} height={72} size={58} color={vars.accent} layer={5} />
              <Text id="score-label" text="on track" x={38} y={116} width={110} height={34} size={22} weight="600" color="#1e3a8a" layer={5} />
              <CTAButton id="review" label="Review pipeline" x={28} y={206} width={136} height={46} radius={15} size={18} fill={vars.accent} layer={5} />
            </Cell>
          </Bento>
        </BrowserWindow>
      </Scene>
    );
  }
});`
  },
  {
    id: 'launch-card',
    title: 'Launch Card',
    source: `export default defineSpanScene({
  id: "launch-card",
  width: 1280,
  height: 720,
  durationMs: 5600,
  variables: {
    cta: stringVar("Generate preview"),
    accent: colorVar("#dc2626")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#fafaf9" layer={0} />
        <Circle id="circle-a" x={232} y={180} radius={112} fill="#bae6fd" opacity={0.86} blur={22} layer={1}>
          <Animate prop="x" from={200} to={232} start="0ms" duration="900ms" ease="outCubic" />
        </Circle>
        <Circle id="circle-b" x={1010} y={540} radius={154} fill="#fecaca" opacity={0.84} blur={26} layer={1}>
          <Animate prop="y" from={580} to={540} start="120ms" duration="900ms" ease="outCubic" />
        </Circle>
        <Rect id="card" x={316} y={128} width={648} height={458} radius={30} fill="#ffffff" stroke="#e7e5e4" strokeWidth={2} layer={2}>
          <Animate prop="scale" from={0.94} to={1} start="0ms" duration="520ms" ease="outCubic" />
          <Animate prop="opacity" from={0} to={1} start="0ms" duration="340ms" ease="outQuad" />
        </Rect>
        <TrafficLights id="status" x={376} y={190} radius={11} gap={34} layer={4} />
        <Text id="eyebrow" text="Static TSX preset" x={376} y={246} width={240} height={30} size={22} weight="700" color={vars.accent} layer={4} />
        <Text id="headline" text="Buttons fit before frames render." x={374} y={292} width={514} height={120} size={58} color="#1c1917" layer={4}>
          <Animate prop="opacity" from={0} to={1} start="420ms" duration="360ms" ease="outQuad" />
          <Animate prop="x" from={344} to={374} start="420ms" duration="520ms" ease="outCubic" />
        </Text>
        <Text id="body" text="CTAButton estimates text width and produces centered GPU text without wrapping." x={378} y={430} width={430} height={58} size={24} weight="500" color="#57534e" layer={4} />
        <CTAButton id="primary-cta" label={vars.cta} x={378} y={512} width={216} height={58} radius={18} size={23} fill={vars.accent} layer={4}>
          <Animate prop="opacity" from={0} to={1} start="1020ms" duration="280ms" ease="outQuad" />
        </CTAButton>
        <CTAButton id="secondary-cta" label="Open diagnostics" x={612} y={512} width={196} height={58} radius={18} size={22} fill="#292524" color="#fafaf9" layer={4}>
          <Animate prop="opacity" from={0} to={1} start="1220ms" duration="280ms" ease="outQuad" />
        </CTAButton>
      </Scene>
    );
  }
});`
  },
  {
    id: 'data-chart',
    title: 'Data Chart',
    source: `export default defineSpanScene({
  id: "data-chart",
  width: 1280,
  height: 720,
  durationMs: 5200,
  variables: {
    title: stringVar("Activation by cohort")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#f8fafc" layer={0} />
        <DataChart id="chart" title={vars.title} values={[180, 260, 330, 220, 370]} x={96} y={74} layer={2} />
      </Scene>
    );
  }
});`
  },
  {
    id: 'revenue-chart',
    title: 'Revenue Chart',
    source: `export default defineSpanScene({
  id: "revenue-chart",
  width: 1280,
  height: 720,
  durationMs: 5600,
  variables: {
    title: stringVar("Revenue expansion"),
    callout: stringVar("+28% net retention")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#18181b" layer={0} />
        <Rect id="panel" x={92} y={76} width={1096} height={560} radius={28} fill="#fafaf9" stroke="#d6d3d1" strokeWidth={2} layer={1}>
          <Animate prop="opacity" from={0} to={1} start="0ms" duration="340ms" ease="outQuad" />
        </Rect>
        <DataChart id="chart" title={vars.title} values={[132, 188, 246, 302, 354]} x={146} y={120} baselineOffset={398} axisWidth={880} barWidth={82} gap={48} callout={vars.callout} calloutColor="#7c3aed" layer={3} />
        <CTAButton id="cta" label="Export report" x={872} y={542} width={182} height={54} radius={17} fill="#7c3aed" size={22} layer={5}>
          <Animate prop="opacity" from={0} to={1} start="3300ms" duration="320ms" ease="outQuad" />
        </CTAButton>
      </Scene>
    );
  }
});`
  },
  {
    id: 'decision-tree',
    title: 'Decision Tree',
    source: `export default defineSpanScene({
  id: "decision-tree",
  width: 1280,
  height: 720,
  durationMs: 6000,
  variables: {
    root: stringVar("Is the demo reusable?")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#111827" layer={0} />
        <DecisionTree id="tree" root={vars.root} layer={1} />
      </Scene>
    );
  }
});`
  },
  {
    id: 'flowchart-plan',
    title: 'Flowchart Plan',
    source: `export default defineSpanScene({
  id: "flowchart-plan",
  width: 1280,
  height: 720,
  durationMs: 6400,
  variables: {
    root: stringVar("Should this become a preset?"),
    final: stringVar("Save as TSX source plus compiled IR")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#f8fafc" layer={0} />
        <Circle id="wash" x={1010} y={144} radius={184} fill="#dbeafe" opacity={0.88} blur={28} layer={1} />
        <Flowchart id="plan" root={vars.root} left="Yes: expose a semantic JSX tag" right="No: keep it as primitives" final={vars.final} layer={2} />
      </Scene>
    );
  }
});`
  },
  {
    id: 'chrome-controls',
    title: 'Chrome Controls',
    source: `export default defineSpanScene({
  id: "chrome-controls",
  width: 1280,
  height: 720,
  durationMs: 5000,
  variables: {
    accent: colorVar("#0f766e")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#f5f5f4" layer={0} />
        <Text id="headline" text="Browser chrome is composable." x={116} y={88} width={620} height={76} size={56} color="#1c1917" layer={1} />
        <Text id="body" text="BrowserWindow can draw its own controls, or TrafficLights can be placed manually for custom chrome." x={120} y={170} width={610} height={76} size={24} weight="500" color="#57534e" layer={1} />
        <BrowserWindow id="native-window" x={120} y={296} width={420} height={252} headerHeight={58} radius={24} fill="#ffffff" headerFill="#e7e5e4" stroke="#d6d3d1" strokeWidth={2} layer={2}>
          <Animate prop="x" from={76} to={120} start="200ms" duration="520ms" ease="outCubic" />
          <Text id="native-title" text="Built in" x={44} y={104} width={190} height={42} size={32} color="#1c1917" layer={4} />
          <CTAButton id="native-button" label="Run scene" x={44} y={166} width={154} height={46} radius={15} size={19} fill={vars.accent} layer={4} />
        </BrowserWindow>
        <BrowserWindow id="manual-window" x={640} y={296} width={520} height={252} headerHeight={58} radius={24} trafficLights={false} fill="#ffffff" headerFill="#e0f2fe" stroke="#bae6fd" strokeWidth={2} layer={2}>
          <Animate prop="x" from={684} to={640} start="360ms" duration="520ms" ease="outCubic" />
          <TrafficLights id="manual-lights" x={50} y={29} radius={12} gap={39} red="#fb7185" yellow="#facc15" green="#2dd4bf" layer={4} />
          <Text id="manual-title" text="Manual controls" x={48} y={104} width={270} height={42} size={32} color="#0f172a" layer={4} />
          <CTAButton id="manual-button" label="Inspect alignment" x={48} y={166} width={214} height={46} radius={15} size={19} fill="#0369a1" layer={4} />
        </BrowserWindow>
      </Scene>
    );
  }
});`
  },
  {
    id: 'v-stack-layout',
    title: 'Vertical Stack Layout',
    source: `export default defineSpanScene({
  id: "v-stack-layout",
  width: 1280,
  height: 720,
  durationMs: 5200,
  variables: {
    headline: stringVar("Layout owns the rhythm"),
    accent: colorVar("#0f766e")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#f8fafc" layer={0} />
        <Rect id="panel" x={310} y={106} width={660} height={508} radius={30} fill="#ffffff" stroke="#d1d5db" strokeWidth={2} layer={1} />
        <VStack id="copy-stack" x={374} y={168} width={532} height={332} gap={22} align="start">
          <Text id="headline" text={vars.headline} width={532} height={92} size={58} color="#111827" layer={3}>
            <Animate prop="opacity" from={0} to={1} start="240ms" duration="320ms" ease="outQuad" />
          </Text>
          <Text id="body" text="A stack gives the agent a content box, fixed gaps, and stable child bounds before anything is rendered." width={520} height={86} size={25} weight="500" color="#4b5563" layer={3} />
          <HStack id="button-row" width={420} height={58} gap={16} align="center">
            <CTAButton id="primary" label="Use stack" width={168} height={54} radius={17} size={21} fill={vars.accent} layer={4} />
            <CTAButton id="secondary" label="Inspect" width={142} height={54} radius={17} size={21} fill="#111827" color="#ffffff" layer={4} />
          </HStack>
        </VStack>
      </Scene>
    );
  }
});`
  },
  {
    id: 'h-stack-layout',
    title: 'Horizontal Row Layout',
    source: `export default defineSpanScene({
  id: "h-stack-layout",
  width: 1280,
  height: 720,
  durationMs: 5200,
  variables: {
    accent: colorVar("#2563eb")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#111827" layer={0} />
        <Text id="title" text="Rows keep cards aligned." x={126} y={92} width={680} height={68} size={56} color="#f9fafb" layer={2} />
        <HStack id="metric-row" x={126} y={226} width={1028} height={242} gap={22} align="stretch">
          <Rect id="card-a" width={328} height={242} radius={26} fill="#eff6ff" stroke="#93c5fd" strokeWidth={2} layer={3} />
          <Rect id="card-b" width={328} height={242} radius={26} fill="#ecfdf5" stroke="#86efac" strokeWidth={2} layer={3} />
          <Rect id="card-c" width={328} height={242} radius={26} fill="#fef2f2" stroke="#fca5a5" strokeWidth={2} layer={3} />
        </HStack>
        <HStack id="label-row" x={166} y={290} width={888} height={92} gap={126} align="center">
          <Text id="label-a" text="brief" width={210} height={58} size={42} color={vars.accent} align="center" layer={4} />
          <Text id="label-b" text="tokens" width={210} height={58} size={42} color="#16a34a" align="center" layer={4} />
          <Text id="label-c" text="render" width={210} height={58} size={42} color="#dc2626" align="center" layer={4} />
        </HStack>
      </Scene>
    );
  }
});`
  },
  {
    id: 'bento-layout',
    title: 'Bento Layout',
    source: `export default defineSpanScene({
  id: "bento-layout",
  width: 1280,
  height: 720,
  durationMs: 5600,
  variables: {
    title: stringVar("Bento templates compose the frame"),
    accent: colorVar("#14b8a6")
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#0f172a" layer={0} />
        <Bento id="main-grid" x={96} y={74} width={1088} height={570} columns={12} rows={6} gap={20}>
          <Cell id="hero-cell" col={1} row={1} colSpan={7} rowSpan={4} padding={34}>
            <Rect id="hero-card" x={0} y={0} width="100%" height="100%" radius={30} fill="#f8fafc" stroke="#bae6fd" strokeWidth={2} layer={2} />
            <VStack id="hero-copy" x={38} y={48} width={502} height={214} gap={18}>
              <Text id="title" text={vars.title} width={500} height={116} size={52} color="#0f172a" layer={4} />
              <Text id="body" text="Cells provide a stable local coordinate space, so details can stay simple." width={430} height={60} size={24} weight="500" color="#475569" layer={4} />
            </VStack>
          </Cell>
          <Cell id="metric-cell" col={8} row={1} colSpan={5} rowSpan={2} padding={28} align="center" justify="center">
            <Rect id="metric-card" x={0} y={0} width="100%" height="100%" radius={26} fill="#ecfeff" stroke="#67e8f9" strokeWidth={2} layer={2} />
            <VStack id="metric-stack" width="76%" height="66%" gap="8%" align="start">
              <Text id="metric" text="0 overlaps" width="100%" height="56%" size={50} color="#0f766e" layer={4} />
              <Text id="metric-label" text="layout computed first" width="100%" height="28%" size={22} weight="600" color="#0e7490" layer={4} />
            </VStack>
          </Cell>
          <Cell id="chart-cell" col={8} row={3} colSpan={5} rowSpan={4} padding={28} align="center" justify="center">
            <Rect id="chart-panel" x={0} y={0} width="100%" height="100%" radius={26} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} layer={2} />
            <DataChart id="mini-chart" title="Spacing quality" values={[76, 138, 188, 252]} width="86%" height="82%" titleSize={26} titleWidth="100%" callout="balanced" calloutColor={vars.accent} layer={4} />
          </Cell>
          <Cell id="cta-cell" col={1} row={5} colSpan={7} rowSpan={2} padding={34} align="center" justify="center">
            <CTAButton id="cta" label="Generate with layout" width={292} height={58} radius={18} size={23} fill={vars.accent} layer={4} />
          </Cell>
        </Bento>
      </Scene>
    );
  }
});`
  },
  {
    id: 'camera-zoom-effect',
    title: 'Camera Zoom Effect',
    source: `export default defineSpanScene({
  id: "camera-zoom-effect",
  width: 1280,
  height: 720,
  durationMs: 5600,
  variables: {
    headline: stringVar("Camera effects are scene-level"),
    accent: colorVar("#2563eb")
  },
  render({ vars }) {
    return (
      <Scene>
        <CameraEffect id="push-in" centerX={796} centerY={368} zoom={1} rotation={0} blur={0}>
          <Animate prop="zoom" from={1} to={1.34} start="1320ms" duration="1180ms" ease="inOutCubic" />
          <Animate prop="blur" from={0} to={1.15} start="1320ms" duration="1180ms" ease="inOutCubic" />
        </CameraEffect>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#f8fafc" layer={0} />
        <Circle id="wash" x={1058} y={124} radius={210} fill="#dbeafe" opacity={0.9} blur={30} layer={1} />
        <BrowserWindow id="effect-window" x={126} y={92} width={1028} height={536} headerHeight={62} radius={28} fill="#ffffff" headerFill="#e2e8f0" stroke="#bfdbfe" strokeWidth={2} layer={2}>
          <Text id="headline" text={vars.headline} x={52} y={102} width={620} height={72} size={52} color="#0f172a" layer={4} />
          <Text id="body" text="The TSX describes a camera move once; the renderer transforms the full GPU frame." x={56} y={184} width={548} height={62} size={24} weight="500" color="#475569" layer={4} />
          <DataChart id="chart" title="Focus target" values={[112, 178, 246, 304, 368]} x={48} y={248} baselineOffset={214} axisWidth={680} barWidth={52} gap={34} titleSize={28} callout="zoom anchors here" calloutColor={vars.accent} layer={4} />
          <Rect id="target-card" x={760} y={202} width={184} height={184} radius={30} fill="#eff6ff" stroke="#60a5fa" strokeWidth={3} layer={5} />
          <Text id="target-value" text="1.34x" x={796} y={250} width={112} height={58} size={46} color={vars.accent} align="center" layer={6} />
          <Text id="target-label" text="camera zoom" x={790} y={322} width={126} height={32} size={20} weight="700" color="#1e40af" align="center" layer={6} />
        </BrowserWindow>
      </Scene>
    );
  }
});`
  },
  {
    id: 'camera-rotate-blur-effect',
    title: 'Camera Rotate Blur Effect',
    source: `export default defineSpanScene({
  id: "camera-rotate-blur-effect",
  width: 1280,
  height: 720,
  durationMs: 5600,
  variables: {
    accent: colorVar("#dc2626")
  },
  render({ vars }) {
    return (
      <Scene>
        <CameraEffect id="tilt-push" centerX={640} centerY={360} zoom={1} rotation={0} blur={0}>
          <Animate prop="zoom" from={1} to={1.18} start="980ms" duration="1460ms" ease="inOutCubic" />
          <Animate prop="rotation" from={0} to={-4.8} start="980ms" duration="1460ms" ease="inOutCubic" />
          <Animate prop="blur" from={0} to={1.8} start="980ms" duration="1460ms" ease="inOutCubic" />
        </CameraEffect>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill="#18181b" layer={0} />
        <Rect id="panel" x={146} y={92} width={988} height={536} radius={34} fill="#fafaf9" stroke="#e7e5e4" strokeWidth={2} layer={1}>
          <Animate prop="opacity" from={0} to={1} start="0ms" duration="320ms" ease="outQuad" />
        </Rect>
        <Text id="headline" text="Rotate, push, blur." x={214} y={154} width={520} height={76} size={62} color="#1c1917" layer={3} />
        <Text id="body" text="One effect node can create a more dramatic b-roll move than animating every object separately." x={218} y={246} width={520} height={72} size={25} weight="500" color="#57534e" layer={3} />
        <Rect id="red-card" x={744} y={156} width={246} height={172} radius={28} fill={vars.accent} layer={3}>
          <Animate prop="scale" from={0.94} to={1} start="520ms" duration="520ms" ease="outCubic" />
        </Rect>
        <Text id="red-label" text="camera effect" x={790} y={222} width={154} height={36} size={25} weight="800" color="#ffffff" align="center" layer={4} />
        <Rect id="timeline" x={218} y={410} width={740} height={64} radius={18} fill="#292524" layer={3} />
        <Rect id="range" x={604} y={422} width={184} height={40} radius={13} fill={vars.accent} opacity={0.78} layer={4} />
        <CTAButton id="apply" label="Apply effect" x={218} y={514} width={164} height={52} radius={16} size={20} fill={vars.accent} layer={4} />
      </Scene>
    );
  }
});`
  }
];

type HyperframesComponentVariant =
  | 'caption-wipe'
  | 'caption-typography'
  | 'caption-neon'
  | 'caption-glitch'
  | 'caption-particle'
  | 'caption-matrix'
  | 'caption-texture'
  | 'effect-shimmer'
  | 'effect-vignette'
  | 'effect-grain'
  | 'transition-grid'
  | 'transition-parallax';

interface HyperframesComponentTemplate {
  name: string;
  title: string;
  category: Exclude<ProgrammaticSpanExampleCategory, 'Mont Presets'>;
  description: string;
  variant: HyperframesComponentVariant;
  text: string;
  accent: string;
  background: string;
}

const HYPERFRAMES_COMPONENT_TEMPLATES: HyperframesComponentTemplate[] = [
  {
    name: 'caption-blend-difference',
    title: 'Blend Difference',
    category: 'Hyperframes Captions',
    description: 'Auto-inverting text treatment adapted to high-contrast GPU blocks.',
    variant: 'caption-typography',
    text: 'Contrast that reads',
    accent: '#f5f5f4',
    background: '#111827'
  },
  {
    name: 'caption-clip-wipe',
    title: 'Clip Wipe',
    category: 'Hyperframes Captions',
    description: 'Left-to-right word reveal translated into animated highlight bars.',
    variant: 'caption-wipe',
    text: 'Reveal each word',
    accent: '#14b8a6',
    background: '#0f172a'
  },
  {
    name: 'caption-editorial-emphasis',
    title: 'Editorial Emphasis',
    category: 'Hyperframes Captions',
    description: 'Dual-scale editorial caption composition.',
    variant: 'caption-typography',
    text: 'Small setup, big claim',
    accent: '#dc2626',
    background: '#fafaf9'
  },
  {
    name: 'caption-emoji-pop',
    title: 'Emoji Pop',
    category: 'Hyperframes Captions',
    description: 'Social caption pop using badges and squeeze-style motion.',
    variant: 'caption-particle',
    text: 'Pop the punchline',
    accent: '#f97316',
    background: '#1e1b4b'
  },
  {
    name: 'caption-glitch-rgb',
    title: 'Glitch RGB',
    category: 'Hyperframes Captions',
    description: 'RGB offset caption treatment.',
    variant: 'caption-glitch',
    text: 'Signal break',
    accent: '#22d3ee',
    background: '#09090b'
  },
  {
    name: 'caption-gradient-fill',
    title: 'Gradient Fill',
    category: 'Hyperframes Captions',
    description: 'Gradient-caption feel approximated with color bands and staggered words.',
    variant: 'caption-wipe',
    text: 'Color fills motion',
    accent: '#f472b6',
    background: '#111827'
  },
  {
    name: 'caption-highlight',
    title: 'Highlight',
    category: 'Hyperframes Captions',
    description: 'TikTok-style active-word highlight.',
    variant: 'caption-wipe',
    text: 'Highlight the active word',
    accent: '#ef4444',
    background: '#18181b'
  },
  {
    name: 'caption-kinetic-slam',
    title: 'Kinetic Slam',
    category: 'Hyperframes Captions',
    description: 'Full-screen kinetic word entrance.',
    variant: 'caption-typography',
    text: 'SLAM CUT',
    accent: '#facc15',
    background: '#0f172a'
  },
  {
    name: 'caption-matrix-decode',
    title: 'Matrix Decode',
    category: 'Hyperframes Captions',
    description: 'Scramble/decode caption translated to deterministic text bars.',
    variant: 'caption-matrix',
    text: 'Decode the message',
    accent: '#22c55e',
    background: '#020617'
  },
  {
    name: 'caption-neon-accent',
    title: 'Neon Accent',
    category: 'Hyperframes Captions',
    description: 'Neon glow caption with accent shapes.',
    variant: 'caption-neon',
    text: 'Neon accent',
    accent: '#a855f7',
    background: '#020617'
  },
  {
    name: 'caption-neon-glow',
    title: 'Neon Glow',
    category: 'Hyperframes Captions',
    description: 'Cyan and magenta glow layers.',
    variant: 'caption-neon',
    text: 'Glow mode',
    accent: '#22d3ee',
    background: '#111827'
  },
  {
    name: 'caption-parallax-layers',
    title: 'Parallax Layers',
    category: 'Hyperframes Captions',
    description: 'Layered caption depth with offset shadows.',
    variant: 'caption-typography',
    text: 'Depth in type',
    accent: '#2563eb',
    background: '#f8fafc'
  },
  {
    name: 'caption-particle-burst',
    title: 'Particle Burst',
    category: 'Hyperframes Captions',
    description: 'Keyword burst recreated with deterministic circles.',
    variant: 'caption-particle',
    text: 'Burst on impact',
    accent: '#f59e0b',
    background: '#111827'
  },
  {
    name: 'caption-pill-karaoke',
    title: 'Pill Karaoke',
    category: 'Hyperframes Captions',
    description: 'Pill-shaped karaoke active word treatment.',
    variant: 'caption-wipe',
    text: 'Karaoke in a pill',
    accent: '#0ea5e9',
    background: '#0f172a'
  },
  {
    name: 'caption-texture',
    title: 'Texture',
    category: 'Hyperframes Captions',
    description: 'Texture-mask caption represented with stripe fills.',
    variant: 'caption-texture',
    text: 'TEXTURE',
    accent: '#a16207',
    background: '#292524'
  },
  {
    name: 'caption-weight-shift',
    title: 'Weight Shift',
    category: 'Hyperframes Captions',
    description: 'Font-weight contrast between caption lines.',
    variant: 'caption-typography',
    text: 'Weight shifts focus',
    accent: '#0f766e',
    background: '#f5f5f4'
  },
  {
    name: 'grain-overlay',
    title: 'Grain Overlay',
    category: 'Hyperframes Effects',
    description: 'Film grain texture approximated with deterministic dot fields.',
    variant: 'effect-grain',
    text: 'Analog layer',
    accent: '#78716c',
    background: '#1c1917'
  },
  {
    name: 'shimmer-sweep',
    title: 'Shimmer Sweep',
    category: 'Hyperframes Effects',
    description: 'Light sweep across text and cards.',
    variant: 'effect-shimmer',
    text: 'Premium sweep',
    accent: '#f8fafc',
    background: '#0f172a'
  },
  {
    name: 'texture-mask-text',
    title: 'Texture Mask Text',
    category: 'Hyperframes Effects',
    description: 'Large masked text style represented with layered stripes.',
    variant: 'caption-texture',
    text: 'MASK',
    accent: '#7c3aed',
    background: '#18181b'
  },
  {
    name: 'vignette',
    title: 'Vignette',
    category: 'Hyperframes Effects',
    description: 'Cinematic edge-darkening overlay.',
    variant: 'effect-vignette',
    text: 'Pull focus',
    accent: '#f97316',
    background: '#262626'
  },
  {
    name: 'grid-pixelate-wipe',
    title: 'Grid Pixelate Wipe',
    category: 'Hyperframes Transitions',
    description: 'Grid tile dissolve translated to GPU rectangles.',
    variant: 'transition-grid',
    text: 'Pixel wipe',
    accent: '#06b6d4',
    background: '#111827'
  },
  {
    name: 'parallax-unzoom',
    title: 'Parallax Unzoom',
    category: 'Hyperframes Transitions',
    description: 'Focus card scales down while siblings slide into view.',
    variant: 'transition-parallax',
    text: 'Unzoom reveal',
    accent: '#16a34a',
    background: '#f8fafc'
  },
  {
    name: 'parallax-zoom',
    title: 'Parallax Zoom',
    category: 'Hyperframes Transitions',
    description: 'Center card zooms while surrounding cards move outward.',
    variant: 'transition-parallax',
    text: 'Zoom into focus',
    accent: '#2563eb',
    background: '#f8fafc'
  }
];

const HYPERFRAMES_COMPONENT_EXAMPLES: ProgrammaticSpanExample[] =
  HYPERFRAMES_COMPONENT_TEMPLATES.map((template) => ({
    id: `hf-${template.name}`,
    title: template.title,
    category: template.category,
    source: createHyperframesComponentExampleSource(template),
    hyperframes: {
      name: template.name,
      url: `https://hyperframes.heygen.com/catalog/components/${template.name}`
    }
  }));

export const PROGRAMMATIC_SPAN_EXAMPLES: ProgrammaticSpanExample[] = [
  ...CORE_PROGRAMMATIC_SPAN_EXAMPLES.map((example) => ({
    ...example,
    category: 'Mont Presets' as const
  })),
  ...HYPERFRAMES_COMPONENT_EXAMPLES
];

export function getProgrammaticSpanExample(id: ProgrammaticSpanExampleId): ProgrammaticSpanExample {
  return PROGRAMMATIC_SPAN_EXAMPLES.find((example) => example.id === id) ?? PROGRAMMATIC_SPAN_EXAMPLES[0];
}

function createHyperframesComponentExampleSource(template: HyperframesComponentTemplate): string {
  const scene = sourceSceneForTemplate(template);
  return `export default defineSpanScene({
  id: ${q(`hf-${template.name}`)},
  width: 1280,
  height: 720,
  durationMs: 5200,
  variables: {
    caption: stringVar(${q(template.text)}),
    accent: colorVar(${q(template.accent)})
  },
  render({ vars }) {
    return (
      <Scene>
${indent(scene, 8)}
      </Scene>
    );
  }
});`;
}

function sourceSceneForTemplate(template: HyperframesComponentTemplate): string {
  switch (template.variant) {
    case 'caption-wipe':
      return captionWipeScene(template);
    case 'caption-typography':
      return captionTypographyScene(template);
    case 'caption-neon':
      return captionNeonScene(template);
    case 'caption-glitch':
      return captionGlitchScene(template);
    case 'caption-particle':
      return captionParticleScene(template);
    case 'caption-matrix':
      return captionMatrixScene(template);
    case 'caption-texture':
      return captionTextureScene(template);
    case 'effect-shimmer':
      return effectShimmerScene(template);
    case 'effect-vignette':
      return effectVignetteScene(template);
    case 'effect-grain':
      return effectGrainScene(template);
    case 'transition-grid':
      return transitionGridScene(template);
    case 'transition-parallax':
      return transitionParallaxScene(template);
  }
}

function captionWipeScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Rect id="caption-pill" x={206} y={296} width={868} height={132} radius={66} fill="#ffffff" opacity={0.1} layer={1} />
<Rect id="active-sweep" x={246} y={328} width={520} height={68} radius={34} fill={vars.accent} opacity={0.86} layer={2}>
  <Animate prop="width" from={0} to={520} start="280ms" duration="1200ms" ease="outCubic" />
  <Animate prop="x" from={246} to={514} start="1700ms" duration="900ms" ease="inOutCubic" />
</Rect>
<Text id="caption" text={vars.caption} x={250} y={318} width={780} height={92} size={58} color="#f8fafc" align="center" layer={3}>
  <Animate prop="opacity" from={0} to={1} start="180ms" duration="260ms" ease="outQuad" />
</Text>
<Text id="template-label" text=${q(template.title)} x={440} y={452} width={400} height={34} size={22} weight="600" color={vars.accent} align="center" layer={3} />`;
}

function captionTypographyScene(template: HyperframesComponentTemplate): string {
  const darkText = template.background === '#f8fafc' || template.background === '#fafaf9' || template.background === '#f5f5f4';
  const primary = darkText ? '#1c1917' : '#f8fafc';
  const secondary = darkText ? '#57534e' : '#a8a29e';
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Text id="shadow" text={vars.caption} x={116} y={202} width={1048} height={146} size={94} weight="900" color={vars.accent} opacity={0.28} align="center" layer={1}>
  <Animate prop="x" from={64} to={116} start="160ms" duration="620ms" ease="outCubic" />
</Text>
<Text id="caption" text={vars.caption} x={116} y={194} width={1048} height={142} size={88} weight="900" color=${q(primary)} align="center" layer={2}>
  <Animate prop="opacity" from={0} to={1} start="160ms" duration="360ms" ease="outQuad" />
  <Animate prop="scale" from={0.92} to={1} start="160ms" duration="620ms" ease="outCubic" />
</Text>
<Rect id="rule" x={444} y={376} width={392} height={8} radius={4} fill={vars.accent} layer={2}>
  <Animate prop="width" from={0} to={392} start="660ms" duration="620ms" ease="outCubic" />
</Rect>
<Text id="description" text=${q(template.description)} x={288} y={426} width={704} height={70} size={24} weight="500" color=${q(secondary)} align="center" layer={2} />`;
}

function captionNeonScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Circle id="glow-left" x={250} y={288} radius={128} fill="#22d3ee" opacity={0.28} blur={26} layer={1}>
  <Animate prop="x" from={224} to={250} start="0ms" duration="900ms" ease="outCubic" />
</Circle>
<Circle id="glow-right" x={1010} y={386} radius={148} fill="#ec4899" opacity={0.26} blur={28} layer={1}>
  <Animate prop="y" from={428} to={386} start="0ms" duration="900ms" ease="outCubic" />
</Circle>
<Text id="cyan-glow" text={vars.caption} x={124} y={262} width={1032} height={122} size={86} weight="900" color="#22d3ee" opacity={0.64} align="center" layer={2}>
  <Animate prop="x" from={98} to={124} start="120ms" duration="520ms" ease="outCubic" />
</Text>
<Text id="magenta-glow" text={vars.caption} x={134} y={272} width={1032} height={122} size={86} weight="900" color="#ec4899" opacity={0.6} align="center" layer={2}>
  <Animate prop="x" from={164} to={134} start="120ms" duration="520ms" ease="outCubic" />
</Text>
<Text id="caption" text={vars.caption} x={128} y={266} width={1024} height={122} size={86} weight="900" color="#f8fafc" align="center" layer={3} />
<Rect id="accent" x={446} y={426} width={388} height={6} radius={3} fill={vars.accent} layer={3}>
  <Animate prop="width" from={0} to={388} start="620ms" duration="720ms" ease="outCubic" />
</Rect>`;
}

function captionGlitchScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Rect id="scan-1" x={0} y={166} width={1280} height={2} fill="#334155" opacity={0.8} layer={1} />
<Rect id="scan-2" x={0} y={358} width={1280} height={2} fill="#334155" opacity={0.55} layer={1} />
<Rect id="scan-3" x={0} y={552} width={1280} height={2} fill="#334155" opacity={0.35} layer={1} />
<Text id="red-offset" text={vars.caption} x={180} y={250} width={920} height={132} size={92} weight="900" color="#f43f5e" opacity={0.72} align="center" layer={2}>
  <Animate prop="x" from={150} to={184} start="0ms" duration="160ms" ease="outQuad" />
  <Animate prop="x" from={184} to={174} start="460ms" duration="140ms" ease="outQuad" />
</Text>
<Text id="blue-offset" text={vars.caption} x={170} y={260} width={920} height={132} size={92} weight="900" color={vars.accent} opacity={0.72} align="center" layer={2}>
  <Animate prop="x" from={206} to={170} start="0ms" duration="160ms" ease="outQuad" />
  <Animate prop="x" from={170} to={190} start="460ms" duration="140ms" ease="outQuad" />
</Text>
<Text id="caption" text={vars.caption} x={176} y={254} width={920} height={132} size={92} weight="900" color="#f8fafc" align="center" layer={3} />`;
}

function captionParticleScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Circle id="particle-a" x={360} y={250} radius={12} fill={vars.accent} layer={1}>
  <Animate prop="x" from={600} to={360} start="520ms" duration="640ms" ease="outCubic" />
  <Animate prop="y" from={360} to={250} start="520ms" duration="640ms" ease="outCubic" />
</Circle>
<Circle id="particle-b" x={880} y={248} radius={16} fill="#22d3ee" layer={1}>
  <Animate prop="x" from={640} to={880} start="520ms" duration="640ms" ease="outCubic" />
  <Animate prop="y" from={360} to={248} start="520ms" duration="640ms" ease="outCubic" />
</Circle>
<Circle id="particle-c" x={430} y={500} radius={18} fill="#facc15" layer={1}>
  <Animate prop="x" from={620} to={430} start="520ms" duration="640ms" ease="outCubic" />
  <Animate prop="y" from={360} to={500} start="520ms" duration="640ms" ease="outCubic" />
</Circle>
<Circle id="particle-d" x={826} y={498} radius={11} fill="#fb7185" layer={1}>
  <Animate prop="x" from={640} to={826} start="520ms" duration="640ms" ease="outCubic" />
  <Animate prop="y" from={360} to={498} start="520ms" duration="640ms" ease="outCubic" />
</Circle>
<Rect id="caption-card" x={246} y={278} width={788} height={164} radius={38} fill="#ffffff" opacity={0.14} layer={2}>
  <Animate prop="scale" from={0.84} to={1} start="160ms" duration="520ms" ease="outCubic" />
</Rect>
<Text id="caption" text={vars.caption} x={284} y={318} width={712} height={86} size={62} weight="900" color="#f8fafc" align="center" layer={3} />`;
}

function captionMatrixScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Text id="code-a" text="010010 101001 110010" x={160} y={116} width={360} height={38} size={26} weight="700" color="#14532d" layer={1} />
<Text id="code-b" text="A7F9 C204 9D11" x={780} y={190} width={340} height={38} size={26} weight="700" color="#14532d" layer={1} />
<Text id="code-c" text="frame.lock.seek()" x={208} y={522} width={360} height={38} size={26} weight="700" color="#14532d" layer={1} />
<Rect id="decode-line" x={318} y={366} width={644} height={5} radius={3} fill={vars.accent} layer={2}>
  <Animate prop="width" from={0} to={644} start="360ms" duration="900ms" ease="outCubic" />
</Rect>
<Text id="caption" text={vars.caption} x={164} y={270} width={952} height={102} size={72} weight="900" color="#bbf7d0" align="center" layer={3}>
  <Animate prop="opacity" from={0} to={1} start="540ms" duration="420ms" ease="outQuad" />
</Text>`;
}

function captionTextureScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Rect id="texture-1" x={210} y={204} width={860} height={54} radius={12} fill={vars.accent} opacity={0.64} layer={1}>
  <Animate prop="x" from={140} to={210} start="80ms" duration="720ms" ease="outCubic" />
</Rect>
<Rect id="texture-2" x={260} y={286} width={760} height={42} radius={10} fill="#fbbf24" opacity={0.56} layer={1}>
  <Animate prop="x" from={340} to={260} start="140ms" duration="720ms" ease="outCubic" />
</Rect>
<Rect id="texture-3" x={232} y={374} width={820} height={50} radius={10} fill="#e7e5e4" opacity={0.32} layer={1}>
  <Animate prop="x" from={170} to={232} start="200ms" duration="720ms" ease="outCubic" />
</Rect>
<Text id="caption" text={vars.caption} x={100} y={230} width={1080} height={182} size={126} weight="900" color="#fafaf9" align="center" layer={3}>
  <Animate prop="opacity" from={0} to={1} start="260ms" duration="420ms" ease="outQuad" />
</Text>`;
}

function effectShimmerScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Rect id="card" x={224} y={218} width={832} height={252} radius={34} fill="#1e293b" stroke="#334155" strokeWidth={2} layer={1} />
<Text id="caption" text={vars.caption} x={286} y={290} width={708} height={92} size={68} weight="900" color="#e2e8f0" align="center" layer={2} />
<Rect id="sweep" x={178} y={206} width={120} height={276} radius={28} fill={vars.accent} opacity={0.28} rotation={-12} layer={3}>
  <Animate prop="x" from={178} to={984} start="420ms" duration="1500ms" ease="inOutCubic" />
</Rect>`;
}

function effectVignetteScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Rect id="photo" x={250} y={126} width={780} height={468} radius={30} fill="#d9f99d" layer={1} />
<Rect id="subject" x={460} y={220} width={360} height={220} radius={32} fill={vars.accent} opacity={0.82} layer={2} />
<Text id="caption" text={vars.caption} x={360} y={466} width={560} height={60} size={44} weight="900" color="#f8fafc" align="center" layer={3} />
<Rect id="top-vignette" x={0} y={0} width={1280} height={160} fill="#000000" opacity={0.48} layer={4} />
<Rect id="bottom-vignette" x={0} y={560} width={1280} height={160} fill="#000000" opacity={0.5} layer={4} />
<Rect id="left-vignette" x={0} y={0} width={170} height={720} fill="#000000" opacity={0.44} layer={4} />
<Rect id="right-vignette" x={1110} y={0} width={170} height={720} fill="#000000" opacity={0.44} layer={4} />`;
}

function effectGrainScene(template: HyperframesComponentTemplate): string {
  const dots = Array.from({ length: 28 }, (_, index) => {
    const x = 72 + ((index * 137) % 1120);
    const y = 78 + ((index * 83) % 560);
    const size = 3 + (index % 4);
    const opacity = (0.08 + (index % 5) * 0.03).toFixed(2);
    return `<Rect id="grain-${index}" x={${x}} y={${y}} width={${size}} height={${size}} fill="#fafaf9" opacity={${opacity}} layer={3} />`;
  }).join('\n');
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Rect id="panel" x={192} y={146} width={896} height={428} radius={32} fill="#292524" layer={1} />
<Text id="caption" text={vars.caption} x={270} y={284} width={740} height={92} size={72} weight="900" color="#f5f5f4" align="center" layer={2} />
<Rect id="warmth" x={192} y={146} width={896} height={428} radius={32} fill={vars.accent} opacity={0.14} layer={2} />
${dots}`;
}

function transitionGridScene(template: HyperframesComponentTemplate): string {
  const tiles = Array.from({ length: 20 }, (_, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const start = 160 + index * 55;
    return `<Rect id="tile-${index}" x={${250 + col * 156}} y={${132 + row * 112}} width={130} height={88} radius={14} fill={${index % 2 === 0 ? 'vars.accent' : q('#f8fafc')}} opacity={0.9} layer={2}>
  <Animate prop="opacity" from={0} to={0.9} start="${start}ms" duration="360ms" ease="outQuad" />
  <Animate prop="scale" from={0.72} to={1} start="${start}ms" duration="480ms" ease="outCubic" />
</Rect>`;
  }).join('\n');
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Text id="caption" text={vars.caption} x={240} y={570} width={800} height={56} size={42} weight="900" color="#f8fafc" align="center" layer={4} />
${tiles}`;
}

function transitionParallaxScene(template: HyperframesComponentTemplate): string {
  return `<Rect id="background" x={0} y={0} width={1280} height={720} fill=${q(template.background)} layer={0} />
<Rect id="card-left" x={136} y={236} width={286} height={210} radius={24} fill="#dbeafe" layer={1}>
  <Animate prop="x" from={220} to={136} start="220ms" duration="860ms" ease="outCubic" />
</Rect>
<Rect id="card-right" x={858} y={236} width={286} height={210} radius={24} fill="#fee2e2" layer={1}>
  <Animate prop="x" from={774} to={858} start="220ms" duration="860ms" ease="outCubic" />
</Rect>
<Rect id="card-main" x={386} y={152} width={508} height={384} radius={32} fill="#ffffff" stroke="#d6d3d1" strokeWidth={2} layer={2}>
  <Animate prop="scale" from={0.86} to={1} start="120ms" duration="880ms" ease="outCubic" />
</Rect>
<Text id="caption" text={vars.caption} x={456} y={286} width={368} height={94} size={62} weight="900" color="#1c1917" align="center" layer={3} />
<CTAButton id="cta" label="Focus frame" x={546} y={430} width={188} height={52} radius={17} fill={vars.accent} size={21} layer={3} />`;
}

function q(value: string): string {
  return JSON.stringify(value);
}

function indent(value: string, spaces: number): string {
  const padding = ' '.repeat(spaces);
  return value.split('\n').map((line) => `${padding}${line}`).join('\n');
}
