import { AudienceLevel, SceneCategory, SceneId } from '../types/game';

export interface SceneLightingPreset {
  background: string;
  domeTop: string;
  domeBottom: string;
  fogColor: string;
  fogDensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  keyColor: string;
  keyIntensity: number;
  keyPosition: [number, number, number];
  rimColor: string;
  rimIntensity: number;
  fill1Color: string;
  fill1Intensity: number;
  fill2Color: string;
  fill2Intensity: number;
  sparkleColor: string;
  sparkleOpacity: number;
  contactShadowColor: string;
  contactShadowOpacity: number;
}

export interface ScenePlatformConfig {
  style: 'slate-ring' | 'market-timber' | 'urban-concrete' | 'paris-stone' | 'gym-mat' | 'office-oak' | 'bar-walnut' | 'park-deck' | 'living-rug';
  topColor: string;
  baseColor: string;
  floorColor: string;
  ringAccent: string;
  useWoodGrainTex?: boolean;
}

export interface SceneCrowdConfig {
  level: AudienceLevel;
  label: string;
  vipCountHigh: number;
  vipCountLow: number;
  crowdCountHigh: number;
  crowdCountLow: number;
  layout: 'none' | 'stadium-bleachers' | 'plaza-ring' | 'street-sides' | 'intimate-arc';
  culturalMix: 'international' | 'lagos' | 'paris' | 'gym' | 'casual-indoor';
  audioReactionScale: number; // 0 = no crowd noise, 1 = packed stadium roar
  cameraFlashes: boolean;
}

export interface SceneAudioProfile {
  bedLowFreq: number;
  bedHighFreq: number;
  bedBaseGain: number;
  bedGameplayGain: number;
  bedTensionGain: number;
  hasOutdoorBreeze?: boolean;
  hasBirdsong?: boolean;
  hasCityHum?: boolean;
}

export interface GameSceneDefinition {
  id: SceneId;
  name: string;
  location: string;
  atmosphereTag: string;
  timeOfDay: string;
  description: string;
  category: SceneCategory;
  audienceLevel: AudienceLevel;
  accentColor: string;
  previewGradient: [string, string, string];
  isAvailable: boolean;
  isDefault?: boolean;
  lighting: SceneLightingPreset;
  platform: ScenePlatformConfig;
  crowd: SceneCrowdConfig;
  audio: SceneAudioProfile;
}

export const DEFAULT_SCENE_ID: SceneId = 'boxing-ring';

export const SCENE_REGISTRY: GameSceneDefinition[] = [
  {
    id: 'boxing-ring',
    name: 'Boxing Ring',
    location: 'TILT Championship Arena',
    atmosphereTag: 'High-stakes spotlight showdown',
    timeOfDay: 'Midnight Arena',
    description:
      'The signature TILT fight-night arena with illuminated ring ropes, overhead rigging, camera flashes, and a roaring international stadium crowd.',
    category: 'Competitive',
    audienceLevel: 'very-large',
    accentColor: '#64E5D2',
    previewGradient: ['#10182B', '#1C2A48', '#2A1D3D'],
    isAvailable: true,
    isDefault: true,
    lighting: {
      background: '#101624',
      domeTop: '#0E1528',
      domeBottom: '#18223A',
      fogColor: '#101624',
      fogDensity: 0.01,
      hemiSky: '#8AA4D6',
      hemiGround: '#161D31',
      hemiIntensity: 0.45,
      keyColor: '#FFF2DF',
      keyIntensity: 2.35,
      keyPosition: [9.5, 17.5, 9.0],
      rimColor: '#7CE7D7',
      rimIntensity: 1.05,
      fill1Color: '#8581FF',
      fill1Intensity: 14,
      fill2Color: '#FF9B65',
      fill2Intensity: 10,
      sparkleColor: '#9ADAD0',
      sparkleOpacity: 0.28,
      contactShadowColor: '#060911',
      contactShadowOpacity: 0.55,
    },
    platform: {
      style: 'slate-ring',
      topColor: '#252E42',
      baseColor: '#121828',
      floorColor: '#0D1220',
      ringAccent: '#54B8AC',
      useWoodGrainTex: true,
    },
    crowd: {
      level: 'very-large',
      label: 'Packed crowd',
      vipCountHigh: 14,
      vipCountLow: 6,
      crowdCountHigh: 185,
      crowdCountLow: 70,
      layout: 'stadium-bleachers',
      culturalMix: 'international',
      audioReactionScale: 1.0,
      cameraFlashes: true,
    },
    audio: {
      bedLowFreq: 620,
      bedHighFreq: 1180,
      bedBaseGain: 0.018,
      bedGameplayGain: 0.075,
      bedTensionGain: 0.025,
    },
  },
  {
    id: 'lagos-market',
    name: 'Lagos Market Square',
    location: 'Balogun, Lagos · Nigeria',
    atmosphereTag: 'Vibrant open-air square & stalls',
    timeOfDay: 'Warm Afternoon',
    description:
      'Sun-drenched Lagos open-air square ringed by colourful Ankara-draped stalls, timber crates, festive canopies, and an energetic local crowd cheering every pull.',
    category: 'City',
    audienceLevel: 'large',
    accentColor: '#FF9B65',
    previewGradient: ['#2E1F16', '#7A4324', '#D98245'],
    isAvailable: true,
    lighting: {
      background: '#5E86B2',
      domeTop: '#4578B0',
      domeBottom: '#F2C994',
      fogColor: '#D6B188',
      fogDensity: 0.0052,
      hemiSky: '#FFF2DA',
      hemiGround: '#8B623D',
      hemiIntensity: 1.04,
      keyColor: '#FFEDC9',
      keyIntensity: 2.85,
      keyPosition: [13, 19, 9],
      rimColor: '#FFC07A',
      rimIntensity: 0.9,
      fill1Color: '#98D8E8',
      fill1Intensity: 7,
      fill2Color: '#FFA45B',
      fill2Intensity: 12,
      sparkleColor: '#FFE0A6',
      sparkleOpacity: 0.16,
      contactShadowColor: '#291A0F',
      contactShadowOpacity: 0.48,
    },
    platform: {
      style: 'market-timber',
      topColor: '#8B5A34',
      baseColor: '#4E311C',
      floorColor: '#6C5A4B',
      ringAccent: '#FF9B65',
    },
    crowd: {
      level: 'large',
      label: 'Large crowd',
      vipCountHigh: 12,
      vipCountLow: 6,
      crowdCountHigh: 46,
      crowdCountLow: 22,
      layout: 'plaza-ring',
      culturalMix: 'lagos',
      audioReactionScale: 0.86,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 540,
      bedHighFreq: 1320,
      bedBaseGain: 0.02,
      bedGameplayGain: 0.085,
      bedTensionGain: 0.032,
      hasOutdoorBreeze: true,
    },
  },
  {
    id: 'lagos-island',
    name: 'Lagos Island Street',
    location: 'Broad Street, Lagos · Nigeria',
    atmosphereTag: 'Bustling urban street & Danfo glow',
    timeOfDay: 'Early Evening',
    description:
      'Electric Lagos Island streetscape with painted asphalt lanes, glowing commercial shopfronts, iconic yellow Danfo silhouettes, streetlights, and lively street-side spectators.',
    category: 'City',
    audienceLevel: 'large',
    accentColor: '#F5D061',
    previewGradient: ['#141A29', '#2E2B3E', '#996429'],
    isAvailable: true,
    lighting: {
      background: '#171C2B',
      domeTop: '#1A2442',
      domeBottom: '#8C5438',
      fogColor: '#1E2334',
      fogDensity: 0.009,
      hemiSky: '#C4A088',
      hemiGround: '#24222D',
      hemiIntensity: 0.62,
      keyColor: '#FFD59E',
      keyIntensity: 2.3,
      keyPosition: [10, 16, 10],
      rimColor: '#F5D061',
      rimIntensity: 0.95,
      fill1Color: '#FF9B65',
      fill1Intensity: 14,
      fill2Color: '#64E5D2',
      fill2Intensity: 10,
      sparkleColor: '#FFE18C',
      sparkleOpacity: 0.22,
      contactShadowColor: '#0A0D16',
      contactShadowOpacity: 0.56,
    },
    platform: {
      style: 'urban-concrete',
      topColor: '#3A404D',
      baseColor: '#232730',
      floorColor: '#262A33',
      ringAccent: '#F5D061',
    },
    crowd: {
      level: 'large',
      label: 'Large crowd',
      vipCountHigh: 10,
      vipCountLow: 5,
      crowdCountHigh: 42,
      crowdCountLow: 18,
      layout: 'street-sides',
      culturalMix: 'lagos',
      audioReactionScale: 0.82,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 380,
      bedHighFreq: 960,
      bedBaseGain: 0.02,
      bedGameplayGain: 0.08,
      bedTensionGain: 0.03,
      hasCityHum: true,
    },
  },
  {
    id: 'paris-eiffel',
    name: 'Eiffel Tower Plaza',
    location: 'Champ de Mars · Paris',
    atmosphereTag: 'Sunlit cobblestones & Iron Lady',
    timeOfDay: 'Crisp Daylight',
    description:
      'Sun-washed Parisian Belgian-block cobblestone plaza framed by Haussmann ashlar limestone facades, climbing autumn ivy, bronze lamps, and the open-lattice Eiffel Tower.',
    category: 'Outdoors',
    audienceLevel: 'medium',
    accentColor: '#F4C983',
    previewGradient: ['#487BB3', '#8BB2D6', '#C9BFA9'],
    isAvailable: true,
    lighting: {
      background: '#7CA7D2',
      domeTop: '#4A7EB8',
      domeBottom: '#DDE7EF',
      fogColor: '#CCD9E6',
      fogDensity: 0.0046,
      hemiSky: '#EAF3FC',
      hemiGround: '#8E8272',
      hemiIntensity: 1.06,
      keyColor: '#FFF6E5',
      keyIntensity: 2.85,
      keyPosition: [-11, 20, 12],
      rimColor: '#CFE4FA',
      rimIntensity: 0.85,
      fill1Color: '#DCE8F7',
      fill1Intensity: 7,
      fill2Color: '#FFE6C4',
      fill2Intensity: 9,
      sparkleColor: '#FFF7E0',
      sparkleOpacity: 0.14,
      contactShadowColor: '#2A231C',
      contactShadowOpacity: 0.46,
    },
    platform: {
      style: 'paris-stone',
      topColor: '#CFC5B6',
      baseColor: '#867C6E',
      floorColor: '#9E9487',
      ringAccent: '#F4C983',
    },
    crowd: {
      level: 'medium',
      label: 'Medium crowd',
      vipCountHigh: 9,
      vipCountLow: 5,
      crowdCountHigh: 22,
      crowdCountLow: 10,
      layout: 'plaza-ring',
      culturalMix: 'paris',
      audioReactionScale: 0.68,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 680,
      bedHighFreq: 1420,
      bedBaseGain: 0.015,
      bedGameplayGain: 0.055,
      bedTensionGain: 0.022,
      hasOutdoorBreeze: true,
    },
  },
  {
    id: 'indoor-gym',
    name: 'Indoor Gym',
    location: 'Athletic Performance Club',
    atmosphereTag: 'Sunlit glass wall & cedar baffles',
    timeOfDay: 'Studio Daylight',
    description:
      'Architectural industrial strength club with floor-to-ceiling greenery windows, board-formed concrete pillars, slatted cedar ceiling, speckled sprint track, and pro racks.',
    category: 'Indoor',
    audienceLevel: 'few',
    accentColor: '#64E5D2',
    previewGradient: ['#232830', '#384048', '#8C5B35'],
    isAvailable: true,
    lighting: {
      background: '#282E35',
      domeTop: '#313840',
      domeBottom: '#22272D',
      fogColor: '#2A3037',
      fogDensity: 0.0052,
      hemiSky: '#ECF3F9',
      hemiGround: '#4A3E33',
      hemiIntensity: 0.96,
      keyColor: '#FFF7EB',
      keyIntensity: 2.65,
      keyPosition: [-14, 14, 9],
      rimColor: '#FFCC92',
      rimIntensity: 0.9,
      fill1Color: '#DCEEFF',
      fill1Intensity: 11,
      fill2Color: '#FFB870',
      fill2Intensity: 13,
      sparkleColor: '#E6F0FA',
      sparkleOpacity: 0.05,
      contactShadowColor: '#0C0E12',
      contactShadowOpacity: 0.52,
    },
    platform: {
      style: 'gym-mat',
      topColor: '#2D323A',
      baseColor: '#1C2026',
      floorColor: '#252A31',
      ringAccent: '#64E5D2',
    },
    crowd: {
      level: 'few',
      label: 'A few spectators',
      vipCountHigh: 6,
      vipCountLow: 4,
      crowdCountHigh: 0,
      crowdCountLow: 0,
      layout: 'intimate-arc',
      culturalMix: 'gym',
      audioReactionScale: 0.36,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 460,
      bedHighFreq: 980,
      bedBaseGain: 0.01,
      bedGameplayGain: 0.028,
      bedTensionGain: 0.014,
    },
  },
  {
    id: 'office-lounge',
    name: 'Office Lounge',
    location: 'Skyline Studio Breakroom',
    atmosphereTag: 'After-work calm & glass partitions',
    timeOfDay: 'Warm Dusk',
    description:
      'Contemporary workspace breakout lounge with timber flooring, sleek glass dividers, indoor plants, pendant lamps, and a few colleagues gathering around on a break.',
    category: 'Indoor',
    audienceLevel: 'few',
    accentColor: '#8581FF',
    previewGradient: ['#1A1D2B', '#282E42', '#3B3448'],
    isAvailable: true,
    lighting: {
      background: '#1C202E',
      domeTop: '#242A3E',
      domeBottom: '#1B1F2B',
      fogColor: '#1C202E',
      fogDensity: 0.01,
      hemiSky: '#FFE8D2',
      hemiGround: '#2A2520',
      hemiIntensity: 0.65,
      keyColor: '#FFF0DC',
      keyIntensity: 2.25,
      keyPosition: [8, 16, 9],
      rimColor: '#8581FF',
      rimIntensity: 0.85,
      fill1Color: '#FFB87A',
      fill1Intensity: 11,
      fill2Color: '#64E5D2',
      fill2Intensity: 7,
      sparkleColor: '#E8D6C0',
      sparkleOpacity: 0.1,
      contactShadowColor: '#0D0E14',
      contactShadowOpacity: 0.5,
    },
    platform: {
      style: 'office-oak',
      topColor: '#9C7A58',
      baseColor: '#363A46',
      floorColor: '#5B493A',
      ringAccent: '#8581FF',
    },
    crowd: {
      level: 'few',
      label: 'A few spectators',
      vipCountHigh: 5,
      vipCountLow: 3,
      crowdCountHigh: 0,
      crowdCountLow: 0,
      layout: 'intimate-arc',
      culturalMix: 'casual-indoor',
      audioReactionScale: 0.32,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 520,
      bedHighFreq: 1050,
      bedBaseGain: 0.008,
      bedGameplayGain: 0.022,
      bedTensionGain: 0.01,
    },
  },
  {
    id: 'neighbourhood-bar',
    name: 'Neighbourhood Bar',
    location: 'Corner Lounge & Bistro',
    atmosphereTag: 'Warm amber evening social',
    timeOfDay: 'Warm Evening',
    description:
      'Intimate timber-and-brick neighbourhood bar lit by glowing amber pendant lamps, backlit shelving, round bistro tables, and a lively evening social crowd.',
    category: 'Social',
    audienceLevel: 'small',
    accentColor: '#FF9B65',
    previewGradient: ['#1C1210', '#3A2117', '#5E3420'],
    isAvailable: true,
    lighting: {
      background: '#19110E',
      domeTop: '#241612',
      domeBottom: '#160E0C',
      fogColor: '#19110E',
      fogDensity: 0.012,
      hemiSky: '#FFBE86',
      hemiGround: '#24150E',
      hemiIntensity: 0.52,
      keyColor: '#FFD6A5',
      keyIntensity: 2.25,
      keyPosition: [7, 15, 8],
      rimColor: '#FF9B65',
      rimIntensity: 0.95,
      fill1Color: '#FF7E47',
      fill1Intensity: 15,
      fill2Color: '#8581FF',
      fill2Intensity: 8,
      sparkleColor: '#FFCA8A',
      sparkleOpacity: 0.2,
      contactShadowColor: '#0A0605',
      contactShadowOpacity: 0.58,
    },
    platform: {
      style: 'bar-walnut',
      topColor: '#5B3A26',
      baseColor: '#2A1A12',
      floorColor: '#362319',
      ringAccent: '#FF9B65',
    },
    crowd: {
      level: 'small',
      label: 'Small crowd',
      vipCountHigh: 8,
      vipCountLow: 5,
      crowdCountHigh: 8,
      crowdCountLow: 4,
      layout: 'intimate-arc',
      culturalMix: 'international',
      audioReactionScale: 0.55,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 560,
      bedHighFreq: 1180,
      bedBaseGain: 0.016,
      bedGameplayGain: 0.052,
      bedTensionGain: 0.024,
    },
  },
  {
    id: 'public-park',
    name: 'Public Park',
    location: 'Greenway Commons',
    atmosphereTag: 'Open daylight & swaying trees',
    timeOfDay: 'Bright Daylight',
    description:
      'Sunlit city park featuring a circular cedar game deck, winding stone paths, wooden benches, swaying shade trees, gentle breeze, and a few relaxed passers-by.',
    category: 'Outdoors',
    audienceLevel: 'few',
    accentColor: '#5CD69A',
    previewGradient: ['#193529', '#2E6248', '#5287A8'],
    isAvailable: true,
    lighting: {
      background: '#3B6E8C',
      domeTop: '#4A89B8',
      domeBottom: '#9BD2DF',
      fogColor: '#76A9B8',
      fogDensity: 0.0065,
      hemiSky: '#D8F1FF',
      hemiGround: '#3E5E36',
      hemiIntensity: 0.95,
      keyColor: '#FFF7E0',
      keyIntensity: 2.75,
      keyPosition: [13, 20, 10],
      rimColor: '#A6F0C6',
      rimIntensity: 0.8,
      fill1Color: '#7CD8FF',
      fill1Intensity: 8,
      fill2Color: '#FFE299',
      fill2Intensity: 9,
      sparkleColor: '#E6FFD8',
      sparkleOpacity: 0.22,
      contactShadowColor: '#162815',
      contactShadowOpacity: 0.46,
    },
    platform: {
      style: 'park-deck',
      topColor: '#9C714A',
      baseColor: '#5D4029',
      floorColor: '#41693C',
      ringAccent: '#5CD69A',
    },
    crowd: {
      level: 'few',
      label: 'A few spectators',
      vipCountHigh: 6,
      vipCountLow: 4,
      crowdCountHigh: 0,
      crowdCountLow: 0,
      layout: 'intimate-arc',
      culturalMix: 'international',
      audioReactionScale: 0.34,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 760,
      bedHighFreq: 1750,
      bedBaseGain: 0.012,
      bedGameplayGain: 0.036,
      bedTensionGain: 0.018,
      hasOutdoorBreeze: true,
      hasBirdsong: true,
    },
  },
  {
    id: 'living-room',
    name: 'Cosy Living Room',
    location: 'Private Residence',
    atmosphereTag: 'Quiet home game · No crowd',
    timeOfDay: 'Cosy Night',
    description:
      'Warm parquet floors, woven rug, plush sofa, floor lamp, and bookshelves. Zero spectators — just pure focus and the quiet sound of sliding wood.',
    category: 'Indoor',
    audienceLevel: 'none',
    accentColor: '#C9B4FF',
    previewGradient: ['#1E1926', '#33283A', '#4F3A38'],
    isAvailable: true,
    lighting: {
      background: '#1C1720',
      domeTop: '#261F2D',
      domeBottom: '#1A141D',
      fogColor: '#1C1720',
      fogDensity: 0.011,
      hemiSky: '#FFE5CC',
      hemiGround: '#2C221E',
      hemiIntensity: 0.6,
      keyColor: '#FFE8C8',
      keyIntensity: 2.2,
      keyPosition: [7, 15, 8],
      rimColor: '#C9B4FF',
      rimIntensity: 0.78,
      fill1Color: '#FFB374',
      fill1Intensity: 13,
      fill2Color: '#8581FF',
      fill2Intensity: 7,
      sparkleColor: '#FFE6C4',
      sparkleOpacity: 0.12,
      contactShadowColor: '#0E0A0E',
      contactShadowOpacity: 0.52,
    },
    platform: {
      style: 'living-rug',
      topColor: '#8E6948',
      baseColor: '#4A3323',
      floorColor: '#4E3829',
      ringAccent: '#C9B4FF',
    },
    crowd: {
      level: 'none',
      label: 'No audience',
      vipCountHigh: 0,
      vipCountLow: 0,
      crowdCountHigh: 0,
      crowdCountLow: 0,
      layout: 'none',
      culturalMix: 'casual-indoor',
      audioReactionScale: 0,
      cameraFlashes: false,
    },
    audio: {
      bedLowFreq: 420,
      bedHighFreq: 860,
      bedBaseGain: 0.004,
      bedGameplayGain: 0.009,
      bedTensionGain: 0.005,
    },
  },
];

export const VALID_SCENE_IDS: SceneId[] = SCENE_REGISTRY.map((s) => s.id);

export function getSceneById(id?: string | null): GameSceneDefinition {
  const found = SCENE_REGISTRY.find((s) => s.id === id);
  return found ?? SCENE_REGISTRY[0];
}
