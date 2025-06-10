
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSRPass } from 'three/examples/jsm/postprocessing/SSRPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { XIcon, PlayIcon, PauseIcon, SquareIcon } from 'lucide-react';

interface OriginalMaterialState {
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  originalEmissive: THREE.Color;
  originalIntensity: number;
}

const initialTextureAnimationSettings = {
  map: {
    name: 'Color/Diffuse',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.01, y: 0.015, z: 0 },
    loop: true
  },
  metalnessMap: {
    name: 'Metallic',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.005, y: 0.002, z: 0 },
    loop: true
  },
  roughnessMap: {
    name: 'Roughness',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.005, y: 0.005, z: 0 },
    loop: true
  },
  normalMap: {
    name: 'Normal',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.02, y: 0.01, z: 0 },
    loop: true
  },
  emissiveMap: {
    name: 'Emission',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.008, y: 0.0, z: 0 },
    loop: true
  },
};

const initialCausticsNewTextureAnimationSettings = {
  map: {
    name: 'Color/Diffuse',
    initialOffset: { x: 0.2, y: 0, z: 0 },
    speed: { x: -0.01, y: 0.002, z: 0 },
    loop: true
  },
  emissiveMap: {
    name: 'Emission',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.01, y: 0.01, z: 0 },
    loop: true
  },
  normalMap: {
    name: 'Normal',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.005, y: 0.005, z: 0 },
    loop: true
  },
  alphaMap: {
    name: 'Alpha',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.0, y: 0.0, z: 0 },
    loop: false
  },
   metalnessMap: {
    name: 'Metallic',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.005, y: 0.002, z: 0 },
    loop: true
  },
  roughnessMap: {
    name: 'Roughness',
    initialOffset: { x: 0, y: 0, z: 0 },
    speed: { x: 0.005, y: 0.005, z: 0 },
    loop: true
  },
};


const cameraWaypoints = [
  {
    position: new THREE.Vector3(0, 0, 30),
    lookAt: new THREE.Vector3(0, -5, 0)
  },
  {
    position: new THREE.Vector3(7, -18, 45),
    lookAt: new THREE.Vector3(-8, -20, 0)
  },
];

const LERP_FACTOR = 0.05;
const FOG_LERP_FACTOR = 0.02;
const HOVER_EMISSIVE_LERP_FACTOR = 0.1;
const HOVER_EMISSIVE_INTENSITY = 0.3;

const globalFogSettings = {
  color: new THREE.Color(0xd6cfc7),
  near: 80,
  far: 200,
};

const waypoint2FogSettings = {
  color: new THREE.Color(0x228B22), // Forest Green
  near: 20,
  far: 80,
};

const plushieFocusOffset = new THREE.Vector3(25, -8, 12);
const plushieLookAtTargetOffset = new THREE.Vector3(22, -10, 0);

const adultFroganaFocusOffset = new THREE.Vector3(-25, -7, 20);
const adultFroganaLookAtTargetOffset = new THREE.Vector3(-35, -5, 0);

const DEFAULT_POND_AMBIENCE_VOLUME = 0.4;
const UNDERWATER_POND_AMBIENCE_VOLUME = 0.2;
const UNDERWATER_SOUND_VOLUME = 0.5;
const UNDERWATER_Y_THRESHOLD = -10;

const LOW_SHELF_FILTER_FREQUENCY = 200;
const MID_PEAKING_FILTER_FREQUENCY = 1000;
const HIGH_SHELF_FILTER_FREQUENCY = 4000;

const LOW_SHELF_FILTER_GAIN_UNDERWATER = 12;
const MID_PEAKING_FILTER_GAIN_UNDERWATER = -6;
const HIGH_SHELF_FILTER_GAIN_UNDERWATER = -12;

const AUDIO_FADE_DURATION = 0.3;

const CURSOR_RIPPLE_ANIMATION_SPEED_MODIFIER = 2.5;

const GearIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 .54 1.11l.12.54a2 2 0 0 1-1.5 2.1l-.62.36a2 2 0 0 0-1.27 1.27l-.12.36a2 2 0 0 0 1.27 2.58l.62.34a2 2 0 0 1 1.55 2.12l-.12.54a2 2 0 0 1-.54 1.11l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-.54-1.11l-.12-.54a2 2 0 0 1 1.5-2.1l.62-.36a2 2 0 0 0 1.27-1.27l-.12-.36a2 2 0 0 0-1.27-2.58l-.62-.34a2 2 0 0 1-1.55-2.12l.12.54a2 2 0 0 1 .54 1.11l.15-.1a2 2 0 0 0 .73 2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const PlaceholderSpinnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="loading-spinner mb-4"
    {...props}
  >
    <path d="M12 2V6" />
    <path d="M12 18V22" />
    <path d="M4.92993 4.92993L7.75993 7.75993" />
    <path d="M16.24 16.24L19.07 19.07" />
    <path d="M2 12H6" />
    <path d="M18 12H22" />
    <path d="M4.92993 19.07L7.75993 16.24" />
    <path d="M16.24 7.75993L19.07 4.92993" />
  </svg>
);

const qualityLevels = ["Performance", "Medium", "Max"];

interface DetailViewTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

type InitialSequenceStep = 'loading' | 'setPerformance' | 'wait' | 'setMedium' | 'done';

function isMeshPartOfGroup(mesh: THREE.Object3D, group: THREE.Object3D | null): boolean {
    if (!group || !mesh) return false;
    let current: THREE.Object3D | null = mesh;
    while (current) {
        if (current === group) return true;
        current = current.parent;
    }
    return false;
}

function drawNoiseOnCanvas(canvas: HTMLCanvasElement, width: number = 256, height: number = 256) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Could not get canvas context for noise texture');
    return;
  }

  const imageData = context.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const randomValue = Math.floor(Math.random() * 128 + 64); // Generate noise around mid-gray (128)
    data[i] = randomValue;
    data[i + 1] = randomValue;
    data[i + 2] = randomValue;
    data[i + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
}

function generateNoiseTexture(width: number = 256, height: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  drawNoiseOnCanvas(canvas, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}


const Scene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mainDirectionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const mousePositionNormalizedRef = useRef({ x: 0, y: 0 });

  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const currentWaypointIndexRef = useRef(currentWaypointIndex);
  const cameraAnimatedLookAtPointRef = useRef(new THREE.Vector3().copy(cameraWaypoints[0].lookAt));

  const [detailViewTarget, setDetailViewTarget] = useState<DetailViewTarget | null>(null);
  const detailViewTargetRef = useRef<DetailViewTarget | null>(detailViewTarget);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const isDetailPanelOpenRef = useRef<boolean>(isDetailPanelOpen);

  const [isAdultFroganaDetailPanelOpen, setIsAdultFroganaDetailPanelOpen] = useState(false);
  const isAdultFroganaDetailPanelOpenRef = useRef(isAdultFroganaDetailPanelOpen);
  const [adultFroganaDetailViewTarget, setAdultFroganaDetailViewTarget] = useState<DetailViewTarget | null>(null);
  const adultFroganaDetailViewTargetRef = useRef<DetailViewTarget | null>(adultFroganaDetailViewTarget);
  const adultFroganaOriginalMaterialsRef = useRef<OriginalMaterialState[]>([]);

  const [parallaxEffectParams, setParallaxEffectParams] = useState({
    enabled: true,
    intensity: 0.2,
  });

  const [hdriTexture1K, setHdriTexture1K] = useState<THREE.Texture | null>(null);
  const [envMap1K, setEnvMap1K] = useState<THREE.Texture | null>(null);
  const [hdri1KLoading, setHdri1KLoading] = useState(true);
  const [hdri1KError, setHdri1KError] = useState<string | null>(null);

  const [hdriTexture4K, setHdriTexture4K] = useState<THREE.Texture | null>(null);
  const [envMap4K, setEnvMap4K] = useState<THREE.Texture | null>(null);
  const [hdri4KLoading, setHdri4KLoading] = useState(true);
  const [hdri4KError, setHdri4KError] = useState<string | null>(null);

  const solidBackgroundRef = useRef(new THREE.Color(0x1a1a1a));

  const modelRef = useRef<THREE.Group | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelPosition, setModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [modelScale, setModelScale] = useState({ x: 1, y: 1, z: 1 });
  const waterPhysicalMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const [waterRefractionParams, setWaterRefractionParams] = useState({
    enabled: true,
    ior: 1.33,
    thickness: 0.5,
  });

  const wallsModelRef = useRef<THREE.Group | null>(null);
  const [wallsModelLoading, setWallsModelLoading] = useState(true);
  const [wallsModelError, setWallsModelError] = useState<string | null>(null);
  const [wallsModelPosition, setWallsModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [wallsModelRotation, setWallsModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [wallsModelScale, setWallsModelScale] = useState({ x: 1, y: 1, z: 1 });
  const wallsMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const wallsClockRef = useRef<THREE.Clock | null>(null);

  const asset1ModelRef = useRef<THREE.Group | null>(null);
  const [asset1ModelLoading, setAsset1ModelLoading] = useState(true);
  const [asset1ModelError, setAsset1ModelError] = useState<string | null>(null);
  const [asset1ModelPosition, setAsset1ModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [asset1ModelRotation, setAsset1ModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [asset1ModelScale, setAsset1ModelScale] = useState({ x: 1, y: 1, z: 1 });

  const plushieDamagedModelRef = useRef<THREE.Group | null>(null);
  const [plushieDamagedModelLoading, setPlushieDamagedModelLoading] = useState(true);
  const [plushieDamagedModelError, setPlushieDamagedModelError] = useState<string | null>(null);
  const [plushieDamagedModelPosition, setPlushieDamagedModelPosition] = useState({ x: 0, y: -13.3, z: 0 });
  const [plushieDamagedModelRotation, setPlushieDamagedModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [plushieDamagedModelScale, setPlushieDamagedModelScale] = useState({ x: 1, y: 1, z: 1 });
  const plushieDamagedMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const plushieDamagedClockRef = useRef<THREE.Clock | null>(null);
  const plushieDamagedOriginalMaterialsRef = useRef<OriginalMaterialState[]>([]);

  const vines1ModelRef = useRef<THREE.Group | null>(null);
  const [vines1ModelLoading, setVines1ModelLoading] = useState(true);
  const [vines1ModelError, setVines1ModelError] = useState<string | null>(null);
  const [vines1ModelPosition, setVines1ModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [vines1ModelRotation, setVines1ModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [vines1ModelScale, setVines1ModelScale] = useState({ x: 1, y: 1, z: 1 });
  const vines1MixerRef = useRef<THREE.AnimationMixer | null>(null);
  const vines1ClockRef = useRef<THREE.Clock | null>(null);

  const vines2ModelRef = useRef<THREE.Group | null>(null);
  const [vines2ModelLoading, setVines2ModelLoading] = useState(true);
  const [vines2ModelError, setVines2ModelError] = useState<string | null>(null);
  const [vines2ModelPosition, setVines2ModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [vines2ModelRotation, setVines2ModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [vines2ModelScale, setVines2ModelScale] = useState({ x: 1, y: 1, z: 1 });
  const vines2MixerRef = useRef<THREE.AnimationMixer | null>(null);
  const vines2ClockRef = useRef<THREE.Clock | null>(null);

  const lilyFrogModelRef = useRef<THREE.Group | null>(null);
  const [lilyFrogModelLoading, setLilyFrogModelLoading] = useState(true);
  const [lilyFrogModelError, setLilyFrogModelError] = useState<string | null>(null);
  const [lilyFrogModelPosition, setLilyFrogModelPosition] = useState({ x: 0, y: -12.5, z: 0 });
  const [lilyFrogModelRotation, setLilyFrogModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [lilyFrogModelScale, setLilyFrogModelScale] = useState({ x: 1, y: 1, z: 1 });
  const lilyFrogMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const lilyFrogClockRef = useRef<THREE.Clock | null>(null);

  const greens1ModelRef = useRef<THREE.Group | null>(null);
  const [greens1ModelLoading, setGreens1ModelLoading] = useState(true);
  const [greens1ModelError, setGreens1ModelError] = useState<string | null>(null);
  const [greens1ModelPosition, setGreens1ModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [greens1ModelRotation, setGreens1ModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [greens1ModelScale, setGreens1ModelScale] = useState({ x: 1, y: 1, z: 1 });
  const greens1MixerRef = useRef<THREE.AnimationMixer | null>(null);
  const greens1ClockRef = useRef<THREE.Clock | null>(null);

  const godRaysModelRef = useRef<THREE.Group | null>(null);
  const [godRaysModelLoading, setGodRaysModelLoading] = useState(true);
  const [godRaysModelError, setGodRaysModelError] = useState<string | null>(null);
  const [godRaysModelPosition, setGodRaysModelPosition] = useState({ x: 0, y: -10, z: 0 });
  const [godRaysModelRotation, setGodRaysModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [godRaysModelScale, setGodRaysModelScale] = useState({ x: 1, y: 1, z: 1 });
  const [godRaysEmissiveIntensity, setGodRaysEmissiveIntensity] = useState(1.0);
  const godRaysEmissiveMaterialsRef = useRef<Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>>([]);

  const adultFroganaModelRef = useRef<THREE.Group | null>(null);
  const [adultFroganaModelLoading, setAdultFroganaModelLoading] = useState(true);
  const [adultFroganaModelError, setAdultFroganaModelError] = useState<string | null>(null);
  const [adultFroganaModelPosition, setAdultFroganaModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [adultFroganaModelRotation, setAdultFroganaModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [adultFroganaModelScale, setAdultFroganaModelScale] = useState({ x: 1, y: 1, z: 1 });
  const adultFroganaMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const adultFroganaClockRef = useRef<THREE.Clock | null>(null);

  const moonModelRef = useRef<THREE.Group | null>(null);
  const [moonModelLoading, setMoonModelLoading] = useState(true);
  const [moonModelError, setMoonModelError] = useState<string | null>(null);
  const [moonModelPosition, setMoonModelPosition] = useState({ x: 0, y: -13, z: 0 });
  const [moonModelRotation, setMoonModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const [moonModelScale, setMoonModelScale] = useState({ x: 1, y: 1, z: 1 });
  const [moonEmissiveIntensity, setMoonEmissiveIntensity] = useState(30.0);
  const moonEmissiveMaterialsRef = useRef<Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>>([]);

  const [textureAnimationConfig, setTextureAnimationConfig] = useState(() => {
    const initialState: { [key: string]: any } = {};
    for (const key in initialTextureAnimationSettings) {
      initialState[key] = {
        ...(initialTextureAnimationSettings as any)[key],
        currentOffset: { ...(initialTextureAnimationSettings as any)[key].initialOffset },
        textureRef: null
      };
    }
    return initialState;
  });

  const [displacementParams, setDisplacementParams] = useState({
    enabled: true,
    speed: 0.05,
    direction: { x: 0.1, y: 0.05 },
    effectScale: 0.15,
    textureScale: 2,
    loop: true,
  });
  const displacementMapRef = useRef<THREE.CanvasTexture | null>(null);
  const displacedMaterialsRef = useRef<Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>>([]);
  const displacementOffsetRef = useRef({ x: 0, y: 0 });

  const composerRef = useRef<EffectComposer | null>(null);
  const ssrPassRef = useRef<SSRPass | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const smaaPassRef = useRef<SMAAPass | null>(null);

  const hoveredInteractiveObjectRef = useRef<THREE.Object3D | null>(null);
  const hoveredSpeedControlModelRef = useRef<THREE.Object3D | null>(null);
  const interactiveAnimationActionsRef = useRef(new Map<THREE.Object3D, THREE.AnimationAction[]>());


  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [graphicsQualityLevel, setGraphicsQualityLevel] = useState(1);

  const [initialSequenceStep, setInitialSequenceStep] = useState<InitialSequenceStep>('loading');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioManuallyPlayedOnce, setAudioManuallyPlayedOnce] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRefUnderwater = useRef<HTMLAudioElement | null>(null);
  const [isUnderwaterAudioPlaying, setIsUnderwaterAudioPlaying] = useState(false);
  const [underwaterAudioLoaded, setUnderwaterAudioLoaded] = useState(false);
  const [underwaterAudioError, setUnderwaterAudioError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const pondAmbienceSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const pondAmbienceGainRef = useRef<GainNode | null>(null);
  const pondAmbienceLowShelfFilterRef = useRef<BiquadFilterNode | null>(null);
  const pondAmbienceMidPeakingFilterRef = useRef<BiquadFilterNode | null>(null);
  const pondAmbienceHighShelfFilterRef = useRef<BiquadFilterNode | null>(null);

  const underwaterSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const underwaterGainRef = useRef<GainNode | null>(null);


  useEffect(() => {
    currentWaypointIndexRef.current = currentWaypointIndex;
  }, [currentWaypointIndex]);

  useEffect(() => {
    detailViewTargetRef.current = detailViewTarget;
  }, [detailViewTarget]);

  useEffect(() => {
    isDetailPanelOpenRef.current = isDetailPanelOpen;
  }, [isDetailPanelOpen]);

  useEffect(() => {
    isAdultFroganaDetailPanelOpenRef.current = isAdultFroganaDetailPanelOpen;
  }, [isAdultFroganaDetailPanelOpen]);

  useEffect(() => {
    adultFroganaDetailViewTargetRef.current = adultFroganaDetailViewTarget;
  }, [adultFroganaDetailViewTarget]);

  useEffect(() => {
    const allModelsAttempted =
      !modelLoading &&
      !wallsModelLoading &&
      !asset1ModelLoading &&
      !plushieDamagedModelLoading &&
      !vines1ModelLoading &&
      !vines2ModelLoading &&
      !lilyFrogModelLoading &&
      !greens1ModelLoading &&
      !godRaysModelLoading &&
      !adultFroganaModelLoading &&
      !moonModelLoading;

    const allHdrisAttempted = !hdri1KLoading && !hdri4KLoading;
    
    let pondAudioAttempted = false;
    if (audioRef.current) { 
        pondAudioAttempted = audioLoaded || audioError !== null;
    }

    let underwaterAudioAttempted = false;
    if (audioRefUnderwater.current) { 
        underwaterAudioAttempted = underwaterAudioLoaded || underwaterAudioError !== null;
    }


    if (initialSequenceStep === 'loading' && allModelsAttempted && allHdrisAttempted && pondAudioAttempted && underwaterAudioAttempted) {
      setInitialSequenceStep('setPerformance');
    }
  }, [
    modelLoading, wallsModelLoading, asset1ModelLoading, plushieDamagedModelLoading,
    vines1ModelLoading, vines2ModelLoading, lilyFrogModelLoading, greens1ModelLoading,
    godRaysModelLoading, adultFroganaModelLoading, moonModelLoading,
    hdri1KLoading, hdri4KLoading,
    audioLoaded, audioError, 
    underwaterAudioLoaded, underwaterAudioError, 
    initialSequenceStep
  ]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined; 

    if (initialSequenceStep === 'setPerformance') {
      setGraphicsQualityLevel(0);
      setInitialSequenceStep('wait');
    } else if (initialSequenceStep === 'wait') {
      timerId = setTimeout(() => {
        setInitialSequenceStep('setMedium');
      }, 1500);
    } else if (initialSequenceStep === 'setMedium') {
      setGraphicsQualityLevel(1);
      setInitialSequenceStep('done');
    } else if (initialSequenceStep === 'done') {
        if (audioRef.current && !audioRef.current.error && audioRef.current.paused && !audioManuallyPlayedOnce && audioLoaded && !audioError) {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              audioRef.current?.play().catch(e => console.warn("Autoplay for NewPondAmbience prevented (after resume):", e));
            }).catch(e => console.error("Error resuming AudioContext for NewPondAmbience autoplay:", e));
          } else if (audioContextRef.current) {
             audioRef.current.play().catch(e => console.warn("Autoplay for NewPondAmbience prevented:", e));
          }
        }
    }

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSequenceStep, audioLoaded, audioError, audioManuallyPlayedOnce]);

  const handleCloseDetailPanel = useCallback(() => {
    setIsDetailPanelOpen(false);
    setDetailViewTarget(null);
    setCurrentWaypointIndex(1);
  }, []);

  const handleCloseAdultFroganaDetailPanel = useCallback(() => {
    setIsAdultFroganaDetailPanelOpen(false);
    setAdultFroganaDetailViewTarget(null);
    setCurrentWaypointIndex(1);
  }, []);

  const applyGraphicsSettings = useCallback((
    level: number,
    scene: THREE.Scene | null,
    renderer: THREE.WebGLRenderer | null,
    ssrPass: SSRPass | null,
    bloomPass: UnrealBloomPass | null,
    smaaPass: SMAAPass | null,
  ) => {
    if (!renderer || !scene || !ssrPass || !bloomPass || !smaaPass || (!hdriTexture1K && !hdri1KError && !hdriTexture4K && !hdri4KError && !solidBackgroundRef.current)) {
      console.warn("applyGraphicsSettings called before all refs are ready or HDRIs/solid background attempted loading.");
      return;
    }

    const allLoadedModels = [
      modelRef.current,
      wallsModelRef.current,
      asset1ModelRef.current,
      plushieDamagedModelRef.current,
      vines1ModelRef.current,
      vines2ModelRef.current,
      lilyFrogModelRef.current,
      greens1ModelRef.current,
      godRaysModelRef.current,
      adultFroganaModelRef.current,
      moonModelRef.current,
    ];

    const newSelects: THREE.Mesh[] = [];
      allLoadedModels.forEach(loadedModel => {
        if (loadedModel) {
          loadedModel.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              newSelects.push(obj);
            }
          });
        }
      });


    switch (level) {
      case 0: // Performance
        renderer.setPixelRatio(1);
        if (smaaPass) smaaPass.enabled = true;
        if (ssrPass) ssrPass.enabled = false;
        if (bloomPass) bloomPass.enabled = false;

        if (hdriTexture1K && !hdri1KError) {
          scene.background = hdriTexture1K;
          scene.environment = envMap1K;
        } else {
          scene.background = solidBackgroundRef.current;
          scene.environment = null;
        }
        scene.environmentIntensity = 1.0;
        if (mainDirectionalLightRef.current) mainDirectionalLightRef.current.castShadow = false;
        renderer.shadowMap.enabled = false;
        break;
      case 1: // Medium
        renderer.setPixelRatio(1);
        if (smaaPass) smaaPass.enabled = true;
        if (ssrPass) ssrPass.enabled = false;

        if (bloomPass) {
            bloomPass.enabled = true;
            bloomPass.strength = 0.1;
            bloomPass.radius = 0.3;
            bloomPass.threshold = 0.5;
        }
        
        if (hdriTexture1K && !hdri1KError) {
          scene.background = hdriTexture1K;
          scene.environment = envMap1K;
        } else if (hdriTexture4K && !hdri4KError) {
          scene.background = hdriTexture4K;
          scene.environment = envMap4K;
        } else {
          scene.background = solidBackgroundRef.current;
          scene.environment = null;
        }
        scene.environmentIntensity = 1.0;
        if (mainDirectionalLightRef.current) mainDirectionalLightRef.current.castShadow = true;
        renderer.shadowMap.enabled = true;
        break;
      case 2: // Max
        renderer.setPixelRatio(window.devicePixelRatio);
        if (smaaPass) smaaPass.enabled = true;

        if (ssrPass) {
          ssrPass.enabled = true;
          ssrPass.opacity = 0.3;
          if (ssrPass.material?.uniforms) {
            if (ssrPass.material.uniforms['uThickness']) ssrPass.material.uniforms['uThickness'].value = 0.01;
            if (ssrPass.material.uniforms['uMaxDistance']) ssrPass.material.uniforms['uMaxDistance'].value = 30;
          }
          ssrPass.selects = newSelects;
        }

        if (bloomPass) {
          bloomPass.enabled = true;
          bloomPass.strength = 0.1;
          bloomPass.radius = 0.3;
          bloomPass.threshold = 0.5;
        }
        
        if (hdriTexture4K && !hdri4KError) {
          scene.background = hdriTexture4K;
          scene.environment = envMap4K;
        } else if (hdriTexture1K && !hdri1KError) {
          scene.background = hdriTexture1K;
          scene.environment = envMap1K;
        } else {
          scene.background = solidBackgroundRef.current;
          scene.environment = null;
        }
        scene.environmentIntensity = 1.0;
        if (mainDirectionalLightRef.current) mainDirectionalLightRef.current.castShadow = true;
        renderer.shadowMap.enabled = true;
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hdriTexture1K, envMap1K, hdri1KError, hdriTexture4K, envMap4K, hdri4KError, solidBackgroundRef]);


  useEffect(() => {
    if (mountRef.current && rendererRef.current && sceneRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current && (!hdri1KLoading || !hdri4KLoading || hdri1KError || hdri4KError)) {
      applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphicsQualityLevel, hdri1KLoading, hdri4KLoading]);


  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    scene.fog = new THREE.Fog();
    if (scene.fog) {
      scene.fog.color.copy(globalFogSettings.color);
      scene.fog.near = globalFogSettings.near;
      scene.fog.far = globalFogSettings.far;
    }

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.copy(cameraWaypoints[0].position);
    camera.lookAt(cameraWaypoints[0].lookAt);
    cameraAnimatedLookAtPointRef.current.copy(cameraWaypoints[0].lookAt);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: false }); // SMAA will handle antialiasing
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    currentMount.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const ssrPass = new SSRPass({
      renderer, scene, camera,
      width: currentMount.clientWidth, height: currentMount.clientHeight,
      groundReflector: null, selects: null,
    });
    ssrPassRef.current = ssrPass;
    composer.addPass(ssrPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight),
      0.5, 0.4, 0.85 // strength, radius, threshold - will be overridden by applyGraphicsSettings
    );
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);

    const smaaPass = new SMAAPass(currentMount.clientWidth * renderer.getPixelRatio(), currentMount.clientHeight * renderer.getPixelRatio());
    smaaPassRef.current = smaaPass;
    composer.addPass(smaaPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(30, 60, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 150;
    directionalLight.shadow.camera.left = -80;
    directionalLight.shadow.camera.right = 80;
    directionalLight.shadow.camera.top = 80;
    directionalLight.shadow.camera.bottom = -80;
    directionalLight.shadow.bias = -0.001;
    scene.add(directionalLight);
    mainDirectionalLightRef.current = directionalLight;


    const rgbeLoader = new RGBELoader();

    setHdri1KLoading(true);
    rgbeLoader.load('/hdri/rogland_clear_night_1k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      setHdriTexture1K(texture);
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      setEnvMap1K(pmremGenerator.fromEquirectangular(texture).texture);
      pmremGenerator.dispose();
      setHdri1KLoading(false);
      setHdri1KError(null);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (error) => {
      console.error('Error loading 1K HDRI:', error);
      setHdri1KError('Could not load 1K HDRI.');
      setHdri1KLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    });

    setHdri4KLoading(true);
    rgbeLoader.load('/hdri/rogland_clear_night_4k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      setHdriTexture4K(texture);
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      setEnvMap4K(pmremGenerator.fromEquirectangular(texture).texture);
      pmremGenerator.dispose();
      setHdri4KLoading(false);
      setHdri4KError(null);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (error) => {
      console.error('Error loading 4K HDRI:', error);
      setHdri4KError('Could not load 4K HDRI.');
      setHdri4KLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    });

    if (!displacementMapRef.current && displacementParams.enabled) {
      const noiseTexture = generateNoiseTexture();
      displacementMapRef.current = noiseTexture;
    }

    const gltfLoader = new GLTFLoader();
    setModelLoading(true);
    waterPhysicalMaterialsRef.current = [];

    gltfLoader.load('/models/WATER_REFRACTED.glb', (gltf) => {
      const model = gltf.scene;
      modelRef.current = model;
      model.position.set(modelPosition.x, modelPosition.y, modelPosition.z);
      model.rotation.set(modelRotation.x, modelRotation.y, modelRotation.z);
      model.scale.set(modelScale.x, modelScale.y, modelScale.z);

      const newTextureConfigState = { ...textureAnimationConfig };
      displacedMaterialsRef.current = [];
      waterPhysicalMaterialsRef.current = [];

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (material instanceof THREE.MeshPhysicalMaterial) {
              if (waterRefractionParams.enabled) {
                material.transmission = 1.0;
                material.ior = waterRefractionParams.ior;
                material.thickness = waterRefractionParams.thickness;
                material.transparent = true;
              } else {
                material.transmission = 0.0;
              }
              if (!waterPhysicalMaterialsRef.current.includes(material)) {
                waterPhysicalMaterialsRef.current.push(material);
              }
              material.needsUpdate = true;
            } else if (material instanceof THREE.MeshStandardMaterial && waterRefractionParams.enabled) {
              material.transparent = true;
              material.opacity = 0.7;
              console.warn("WATER_REFRACTED.glb: MeshStandardMaterial found. For full refraction, use MeshPhysicalMaterial and set transmission properties. Attempting basic transparency.");
              material.needsUpdate = true;
            }

            Object.keys(initialTextureAnimationSettings).forEach(mapKey => {
              const texture = material[mapKey as keyof typeof material] as THREE.Texture | null;
              if (texture && texture instanceof THREE.Texture && newTextureConfigState[mapKey]) {
                newTextureConfigState[mapKey] = {
                  ...newTextureConfigState[mapKey],
                  textureRef: texture,
                };
                texture.offset.set(
                  newTextureConfigState[mapKey].currentOffset.x,
                  newTextureConfigState[mapKey].currentOffset.y
                );
                if (newTextureConfigState[mapKey].loop) {
                  texture.wrapS = THREE.RepeatWrapping;
                  texture.wrapT = THREE.RepeatWrapping;
                } else {
                  texture.wrapS = THREE.ClampToEdgeWrapping;
                  texture.wrapT = THREE.ClampToEdgeWrapping;
                }
                texture.needsUpdate = true;
              }
            });

            if (displacementParams.enabled &&
              (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) {
              if (displacementMapRef.current) {
                material.displacementMap = displacementMapRef.current;
                material.displacementScale = displacementParams.effectScale;
                displacementMapRef.current.repeat.set(displacementParams.textureScale, displacementParams.textureScale);
                if (!displacedMaterialsRef.current.includes(material)) {
                  displacedMaterialsRef.current.push(material);
                }
                material.needsUpdate = true;
              }
            }
          });
        }
      });
      setTextureAnimationConfig(newTextureConfigState);
      scene.add(model);
      setModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading WATER_REFRACTED.glb:', errorEvent);
      setModelError('Could not load WATER_REFRACTED model.');
      setModelLoading(false);
    });

    setWallsModelLoading(true);
    gltfLoader.load('/models/WALLS.glb', (gltf) => {
      const walls = gltf.scene;
      wallsModelRef.current = walls;
      walls.position.set(wallsModelPosition.x, wallsModelPosition.y, wallsModelPosition.z);
      walls.rotation.set(wallsModelRotation.x, wallsModelRotation.y, wallsModelRotation.z);
      walls.scale.set(wallsModelScale.x, wallsModelScale.y, wallsModelScale.z);

      walls.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      if (gltf.animations && gltf.animations.length) {
        wallsClockRef.current = new THREE.Clock();
        wallsMixerRef.current = new THREE.AnimationMixer(walls);
        const action = wallsMixerRef.current.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
        if(interactiveAnimationActionsRef.current.has(walls)){
            interactiveAnimationActionsRef.current.get(walls)!.push(action);
        } else {
            interactiveAnimationActionsRef.current.set(walls, [action]);
        }
      } else {
        console.warn("WALLS.glb loaded, but no animations found in the file.");
      }

      scene.add(walls);
      setWallsModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading WALLS.glb:', errorEvent);
      setWallsModelError('Could not load WALLS model.');
      setWallsModelLoading(false);
    });

    setAsset1ModelLoading(true);
    gltfLoader.load('/models/ASSET_1.glb', (gltf) => {
      const asset1 = gltf.scene;
      asset1ModelRef.current = asset1;
      asset1.position.set(asset1ModelPosition.x, asset1ModelPosition.y, asset1ModelPosition.z);
      asset1.rotation.set(asset1ModelRotation.x, asset1ModelRotation.y, asset1ModelRotation.z);
      asset1.scale.set(asset1ModelScale.x, asset1ModelScale.y, asset1ModelScale.z);

      asset1.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      scene.add(asset1);
      setAsset1ModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading ASSET_1.glb:', errorEvent);
      setAsset1ModelError('Could not load ASSET_1 model.');
      setAsset1ModelLoading(false);
    });

    setPlushieDamagedModelLoading(true);
    plushieDamagedOriginalMaterialsRef.current = [];
    gltfLoader.load('/models/PLUSHIE_DAMAGED.glb', (gltf) => {
      const model = gltf.scene;
      plushieDamagedModelRef.current = model;
      model.position.set(plushieDamagedModelPosition.x, plushieDamagedModelPosition.y, plushieDamagedModelPosition.z);
      model.rotation.set(plushieDamagedModelRotation.x, plushieDamagedModelRotation.y, plushieDamagedModelRotation.z);
      model.scale.set(plushieDamagedModelScale.x, plushieDamagedModelScale.y, plushieDamagedModelScale.z);

      plushieDamagedOriginalMaterialsRef.current = [];
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          if (object.material instanceof THREE.MeshStandardMaterial || object.material instanceof THREE.MeshPhysicalMaterial) {
            plushieDamagedOriginalMaterialsRef.current.push({
              material: object.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
              originalEmissive: (object.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial).emissive.clone(),
              originalIntensity: (object.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial).emissiveIntensity
            });
          }
        }
      });

      if (gltf.animations && gltf.animations.length) {
        plushieDamagedClockRef.current = new THREE.Clock();
        plushieDamagedMixerRef.current = new THREE.AnimationMixer(model);
        const action = plushieDamagedMixerRef.current.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
      } else {
        console.warn("PLUSHIE_DAMAGED.glb loaded, but no animations found in the file.");
      }

      scene.add(model);
      setPlushieDamagedModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading PLUSHIE_DAMAGED.glb:', errorEvent);
      setPlushieDamagedModelError('Could not load PLUSHIE_DAMAGED model.');
      setPlushieDamagedModelLoading(false);
    });

    setVines1ModelLoading(true);
    gltfLoader.load('/models/VINES1.glb', (gltf) => {
      const model = gltf.scene;
      vines1ModelRef.current = model;
      model.position.set(vines1ModelPosition.x, vines1ModelPosition.y, vines1ModelPosition.z);
      model.rotation.set(vines1ModelRotation.x, vines1ModelRotation.y, vines1ModelRotation.z);
      model.scale.set(vines1ModelScale.x, vines1ModelScale.y, vines1ModelScale.z);

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      if (gltf.animations && gltf.animations.length) {
        vines1ClockRef.current = new THREE.Clock();
        vines1MixerRef.current = new THREE.AnimationMixer(model);
        const action = vines1MixerRef.current.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
        if(interactiveAnimationActionsRef.current.has(model)){
            interactiveAnimationActionsRef.current.get(model)!.push(action);
        } else {
            interactiveAnimationActionsRef.current.set(model, [action]);
        }
      } else {
        console.warn("VINES1.glb loaded, but no animations found in the file.");
      }

      scene.add(model);
      setVines1ModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading VINES1.glb:', errorEvent);
      setVines1ModelError('Could not load VINES1 model.');
      setVines1ModelLoading(false);
    });

    setVines2ModelLoading(true);
    gltfLoader.load('/models/VINES2.glb', (gltf) => {
      const model = gltf.scene;
      vines2ModelRef.current = model;
      model.position.set(vines2ModelPosition.x, vines2ModelPosition.y, vines2ModelPosition.z);
      model.rotation.set(vines2ModelRotation.x, vines2ModelRotation.y, vines2ModelRotation.z);
      model.scale.set(vines2ModelScale.x, vines2ModelScale.y, vines2ModelScale.z);

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      if (gltf.animations && gltf.animations.length) {
        vines2ClockRef.current = new THREE.Clock();
        vines2MixerRef.current = new THREE.AnimationMixer(model);
        const action = vines2MixerRef.current.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
        if(interactiveAnimationActionsRef.current.has(model)){
            interactiveAnimationActionsRef.current.get(model)!.push(action);
        } else {
            interactiveAnimationActionsRef.current.set(model, [action]);
        }
      } else {
        console.warn("VINES2.glb loaded, but no animations found in the file.");
      }
      scene.add(model);
      setVines2ModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading VINES2.glb:', errorEvent);
      setVines2ModelError('Could not load VINES2 model.');
      setVines2ModelLoading(false);
    });

    setLilyFrogModelLoading(true);
    gltfLoader.load('/models/LILY_FROG.glb', (gltf) => {
      const model = gltf.scene;
      lilyFrogModelRef.current = model;
      model.position.set(lilyFrogModelPosition.x, lilyFrogModelPosition.y, lilyFrogModelPosition.z);
      model.rotation.set(lilyFrogModelRotation.x, lilyFrogModelRotation.y, lilyFrogModelRotation.z);
      model.scale.set(lilyFrogModelScale.x, lilyFrogModelScale.y, lilyFrogModelScale.z);

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      if (gltf.animations && gltf.animations.length) {
        lilyFrogClockRef.current = new THREE.Clock();
        lilyFrogMixerRef.current = new THREE.AnimationMixer(model);
        const action = lilyFrogMixerRef.current.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
        if(interactiveAnimationActionsRef.current.has(model)){
            interactiveAnimationActionsRef.current.get(model)!.push(action);
        } else {
            interactiveAnimationActionsRef.current.set(model, [action]);
        }
      } else {
        console.warn("LILY_FROG.glb loaded, but no animations found in the file.");
      }

      scene.add(model);
      setLilyFrogModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading LILY_FROG.glb:', errorEvent);
      setLilyFrogModelError('Could not load LILY_FROG model.');
      setLilyFrogModelLoading(false);
    });

    setGreens1ModelLoading(true);
    gltfLoader.load('/models/GREENS1.glb', (gltf) => {
      const model = gltf.scene;
      greens1ModelRef.current = model;
      model.position.set(greens1ModelPosition.x, greens1ModelPosition.y, greens1ModelPosition.z);
      model.rotation.set(greens1ModelRotation.x, greens1ModelRotation.y, greens1ModelRotation.z);
      model.scale.set(greens1ModelScale.x, greens1ModelScale.y, greens1ModelScale.z);

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      if (gltf.animations && gltf.animations.length) {
        greens1ClockRef.current = new THREE.Clock();
        greens1MixerRef.current = new THREE.AnimationMixer(model);
        const action = greens1MixerRef.current.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
        if(interactiveAnimationActionsRef.current.has(model)){
            interactiveAnimationActionsRef.current.get(model)!.push(action);
        } else {
            interactiveAnimationActionsRef.current.set(model, [action]);
        }
      } else {
        console.warn("GREENS1.glb loaded, but no animations found in the file.");
      }

      scene.add(model);
      setGreens1ModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading GREENS1.glb:', errorEvent);
      setGreens1ModelError('Could not load GREENS1 model.');
      setGreens1ModelLoading(false);
    });

    setGodRaysModelLoading(true);
    godRaysEmissiveMaterialsRef.current = [];
    gltfLoader.load('/models/GOD_RAYS.glb', (gltf) => {
      const model = gltf.scene;
      godRaysModelRef.current = model;
      model.position.set(godRaysModelPosition.x, godRaysModelPosition.y, godRaysModelPosition.z);
      model.rotation.set(godRaysModelRotation.x, godRaysModelRotation.y, godRaysModelRotation.z);
      model.scale.set(godRaysModelScale.x, godRaysModelScale.y, godRaysModelScale.z);

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = false;
          object.receiveShadow = false;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if ((material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) && material.emissiveMap) {
              material.emissiveIntensity = godRaysEmissiveIntensity;
              if (!godRaysEmissiveMaterialsRef.current.includes(material)) {
                godRaysEmissiveMaterialsRef.current.push(material);
              }
            }
          });
        }
      });
      scene.add(model);
      setGodRaysModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading GOD_RAYS.glb:', errorEvent);
      setGodRaysModelError('Could not load GOD_RAYS model.');
      setGodRaysModelLoading(false);
    });

    setAdultFroganaModelLoading(true);
    adultFroganaOriginalMaterialsRef.current = [];
    gltfLoader.load('/models/ADULT_FROGANA.glb', (gltf) => {
      const model = gltf.scene;
      adultFroganaModelRef.current = model;
      model.position.set(adultFroganaModelPosition.x, adultFroganaModelPosition.y, adultFroganaModelPosition.z);
      model.rotation.set(adultFroganaModelRotation.x, adultFroganaModelRotation.y, adultFroganaModelRotation.z);
      model.scale.set(adultFroganaModelScale.x, adultFroganaModelScale.y, adultFroganaModelScale.z);

      adultFroganaOriginalMaterialsRef.current = [];
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          if (object.material instanceof THREE.MeshStandardMaterial || object.material instanceof THREE.MeshPhysicalMaterial) {
            adultFroganaOriginalMaterialsRef.current.push({
              material: object.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
              originalEmissive: (object.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial).emissive.clone(),
              originalIntensity: (object.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial).emissiveIntensity
            });
          }
        }
      });

      if (gltf.animations && gltf.animations.length) {
        adultFroganaClockRef.current = new THREE.Clock();
        adultFroganaMixerRef.current = new THREE.AnimationMixer(model);
        const action = adultFroganaMixerRef.current.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopRepeat;
        action.play();
      } else {
        console.warn("ADULT_FROGANA.glb loaded, but no animations found in the file.");
      }

      scene.add(model);
      setAdultFroganaModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading ADULT_FROGANA.glb:', errorEvent);
      setAdultFroganaModelError('Could not load ADULT_FROGANA model.');
      setAdultFroganaModelLoading(false);
    });

    setMoonModelLoading(true);
    moonEmissiveMaterialsRef.current = [];
    gltfLoader.load('/models/MOON.glb', (gltf) => {
      const model = gltf.scene;
      moonModelRef.current = model;
      model.position.set(moonModelPosition.x, moonModelPosition.y, moonModelPosition.z);
      model.rotation.set(moonModelRotation.x, moonModelRotation.y, moonModelRotation.z);
      model.scale.set(moonModelScale.x, moonModelScale.y, moonModelScale.z);

      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if ((material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) && material.emissiveMap) {
              material.emissiveIntensity = moonEmissiveIntensity;
              if (!moonEmissiveMaterialsRef.current.includes(material)) {
                moonEmissiveMaterialsRef.current.push(material);
              }
            }
          });
        }
      });
      scene.add(model);
      setMoonModelLoading(false);
      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    }, undefined, (errorEvent) => {
      console.error('Error loading MOON.glb:', errorEvent);
      setMoonModelError('Could not load MOON model.');
      setMoonModelLoading(false);
    });

    const pondAudioElement = new Audio();
    audioRef.current = pondAudioElement;
    pondAudioElement.loop = true;
    let pondAudioTimeoutId: NodeJS.Timeout | undefined;

    const handlePondAudioCanPlay = () => {
        clearTimeout(pondAudioTimeoutId);
        setAudioLoaded(true);
        setAudioError(null);

        if (!audioContextRef.current && typeof window !== 'undefined' && window.AudioContext) {
            audioContextRef.current = new window.AudioContext();
        }

        if (audioContextRef.current && audioRef.current && !pondAmbienceSourceRef.current) {
            pondAmbienceSourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            
            pondAmbienceLowShelfFilterRef.current = audioContextRef.current.createBiquadFilter();
            pondAmbienceLowShelfFilterRef.current.type = 'lowshelf';
            pondAmbienceLowShelfFilterRef.current.frequency.setValueAtTime(LOW_SHELF_FILTER_FREQUENCY, audioContextRef.current.currentTime);
            pondAmbienceLowShelfFilterRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);

            pondAmbienceMidPeakingFilterRef.current = audioContextRef.current.createBiquadFilter();
            pondAmbienceMidPeakingFilterRef.current.type = 'peaking';
            pondAmbienceMidPeakingFilterRef.current.frequency.setValueAtTime(MID_PEAKING_FILTER_FREQUENCY, audioContextRef.current.currentTime);
            pondAmbienceMidPeakingFilterRef.current.Q.setValueAtTime(1.0, audioContextRef.current.currentTime); 
            pondAmbienceMidPeakingFilterRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);

            pondAmbienceHighShelfFilterRef.current = audioContextRef.current.createBiquadFilter();
            pondAmbienceHighShelfFilterRef.current.type = 'highshelf';
            pondAmbienceHighShelfFilterRef.current.frequency.setValueAtTime(HIGH_SHELF_FILTER_FREQUENCY, audioContextRef.current.currentTime);
            pondAmbienceHighShelfFilterRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
            
            pondAmbienceGainRef.current = audioContextRef.current.createGain();
            pondAmbienceGainRef.current.gain.setValueAtTime(DEFAULT_POND_AMBIENCE_VOLUME, audioContextRef.current.currentTime);
            audioRef.current.volume = 1; 

            pondAmbienceSourceRef.current
                .connect(pondAmbienceLowShelfFilterRef.current)
                .connect(pondAmbienceMidPeakingFilterRef.current)
                .connect(pondAmbienceHighShelfFilterRef.current)
                .connect(pondAmbienceGainRef.current)
                .connect(audioContextRef.current.destination);
        }
    };

    const handlePondAudioError = (e: Event | string) => {
        clearTimeout(pondAudioTimeoutId);
        const target = e instanceof Event ? e.target as HTMLAudioElement : null;
        const currentSrc = target ? target.src : (pondAudioElement?.src || '');


        if (currentSrc.includes('NewPondAmbience.mp3')) {
            console.warn('Failed to load NewPondAmbience.mp3, trying .wav.');
            if (pondAudioElement) {
              pondAudioElement.src = '/audio/NewPondAmbience.wav';
              pondAudioElement.load();
              pondAudioTimeoutId = setTimeout(() => {
                if (!audioLoaded) {
                  console.error('NewPondAmbience.wav also timed out.');
                  setAudioError('Failed to load NewPondAmbience audio (MP3, WAV & Timeout).');
                  setAudioLoaded(true); 
                  pondAudioElement.removeEventListener('canplaythrough', handlePondAudioCanPlay);
                  pondAudioElement.removeEventListener('error', handlePondAudioError);
                }
              }, 10000);
            }
        } else if (currentSrc.includes('NewPondAmbience.wav')) {
            console.error('Failed to load NewPondAmbience.wav as well.', e);
            setAudioError('Failed to load NewPondAmbience audio (MP3 & WAV).');
            setAudioLoaded(true);
        } else {
            console.error('NewPondAmbience audio loading error:', e);
            setAudioError('An unknown error occurred with NewPondAmbience audio.');
            setAudioLoaded(true);
        }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    pondAudioElement.addEventListener('canplaythrough', handlePondAudioCanPlay);
    pondAudioElement.addEventListener('error', handlePondAudioError);
    pondAudioElement.addEventListener('play', handlePlay);
    pondAudioElement.addEventListener('pause', handlePause);

    pondAudioElement.src = '/audio/NewPondAmbience.mp3';
    pondAudioElement.load();
    pondAudioTimeoutId = setTimeout(() => {
      if (!audioLoaded && pondAudioElement) { 
        console.warn('NewPondAmbience.mp3 timed out, trying .wav.');
        pondAudioElement.src = '/audio/NewPondAmbience.wav';
        pondAudioElement.load();
        pondAudioTimeoutId = setTimeout(() => {
          if (!audioLoaded && pondAudioElement) {
            console.error('NewPondAmbience.wav also timed out.');
            setAudioError('Failed to load NewPondAmbience audio (MP3, WAV & Timeout).');
            setAudioLoaded(true); 
            pondAudioElement.removeEventListener('canplaythrough', handlePondAudioCanPlay);
            pondAudioElement.removeEventListener('error', handlePondAudioError);
          }
        }, 10000);
      }
    }, 10000); 


    const underwaterAudioElement = new Audio();
    audioRefUnderwater.current = underwaterAudioElement;
    underwaterAudioElement.loop = true;
    let underwaterAudioTimeoutId: NodeJS.Timeout | undefined;

    const handleUnderwaterAudioCanPlay = () => {
        clearTimeout(underwaterAudioTimeoutId);
        setUnderwaterAudioLoaded(true);
        setUnderwaterAudioError(null);
         if (audioContextRef.current && audioRefUnderwater.current && !underwaterSourceRef.current) {
            underwaterSourceRef.current = audioContextRef.current.createMediaElementSource(audioRefUnderwater.current);
            underwaterGainRef.current = audioContextRef.current.createGain();
            underwaterGainRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime); 
            audioRefUnderwater.current.volume = 1; 

            underwaterSourceRef.current.connect(underwaterGainRef.current);
            underwaterGainRef.current.connect(audioContextRef.current.destination);
        }
    };

     const handleUnderwaterAudioError = (e: Event | string) => {
        clearTimeout(underwaterAudioTimeoutId);
        const target = e instanceof Event ? e.target as HTMLAudioElement : null;
        const currentSrc = target ? target.src : (underwaterAudioElement?.src || '');

        if (currentSrc.includes('UNDERWATER_S.mp3')) {
            console.warn('Failed to load UNDERWATER_S.mp3, trying .wav.');
            if (underwaterAudioElement) {
              underwaterAudioElement.src = '/audio/UNDERWATER_S.wav';
              underwaterAudioElement.load();
              underwaterAudioTimeoutId = setTimeout(() => {
                if (!underwaterAudioLoaded) {
                  console.error('UNDERWATER_S.wav also timed out.');
                  setUnderwaterAudioError('Failed to load UNDERWATER_S audio (MP3, WAV & Timeout).');
                  setUnderwaterAudioLoaded(true);
                  underwaterAudioElement.removeEventListener('canplaythrough', handleUnderwaterAudioCanPlay);
                  underwaterAudioElement.removeEventListener('error', handleUnderwaterAudioError);
                }
              }, 10000);
            }
        } else if (currentSrc.includes('UNDERWATER_S.wav')) {
            console.error('Failed to load UNDERWATER_S.wav as well.', e);
            setUnderwaterAudioError('Failed to load UNDERWATER_S audio (MP3 & WAV).');
            setUnderwaterAudioLoaded(true);
        } else {
            console.error('UNDERWATER_S audio loading error:', e);
            setUnderwaterAudioError('An unknown error occurred with UNDERWATER_S audio.');
            setUnderwaterAudioLoaded(true);
        }
    };
    underwaterAudioElement.addEventListener('canplaythrough', handleUnderwaterAudioCanPlay);
    underwaterAudioElement.addEventListener('error', handleUnderwaterAudioError);

    underwaterAudioElement.src = '/audio/UNDERWATER_S.mp3';
    underwaterAudioElement.load();
    underwaterAudioTimeoutId = setTimeout(() => {
      if (!underwaterAudioLoaded && underwaterAudioElement) {
        console.warn('UNDERWATER_S.mp3 timed out, trying .wav.');
        underwaterAudioElement.src = '/audio/UNDERWATER_S.wav';
        underwaterAudioElement.load();
        underwaterAudioTimeoutId = setTimeout(() => {
          if (!underwaterAudioLoaded && underwaterAudioElement) {
            console.error('UNDERWATER_S.wav also timed out.');
            setUnderwaterAudioError('Failed to load UNDERWATER_S audio (MP3, WAV & Timeout).');
            setUnderwaterAudioLoaded(true);
            underwaterAudioElement.removeEventListener('canplaythrough', handleUnderwaterAudioCanPlay);
            underwaterAudioElement.removeEventListener('error', handleUnderwaterAudioError);
          }
        }, 10000);
      }
    }, 10000);


    const handleResize = () => {
      if (!currentMount || !cameraRef.current || !rendererRef.current || !composerRef.current || !bloomPassRef.current || !ssrPassRef.current || !smaaPassRef.current) return;
      const width = currentMount.clientWidth;
      const height = currentMount.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
      composerRef.current.setSize(width, height);
      if (smaaPassRef.current && rendererRef.current) {
        smaaPassRef.current.setSize(width * rendererRef.current.getPixelRatio(), height * rendererRef.current.getPixelRatio());
      }

      if (sceneRef.current && rendererRef.current && ssrPassRef.current && bloomPassRef.current && smaaPassRef.current) {
        applyGraphicsSettings(graphicsQualityLevel, sceneRef.current, rendererRef.current, ssrPassRef.current, bloomPassRef.current, smaaPassRef.current);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (isDetailPanelOpenRef.current || isAdultFroganaDetailPanelOpenRef.current) return;

      if (event.deltaY > 0) {
        setCurrentWaypointIndex(prev => Math.min(prev + 1, cameraWaypoints.length - 1));
      } else if (event.deltaY < 0) {
        setCurrentWaypointIndex(prev => Math.max(prev - 1, 0));
      }
    };

    const handlePointerMoveObjectInteraction = (event: PointerEvent) => {
        if (!currentMount || !cameraRef.current || !sceneRef.current) return;
    
        pointer.current.x = (event.clientX / currentMount.clientWidth) * 2 - 1;
        pointer.current.y = -(event.clientY / currentMount.clientHeight) * 2 + 1;
        raycaster.current.setFromCamera(pointer.current, cameraRef.current);
    
        let newHoveredEmissiveTarget: THREE.Object3D | null = null;
        let newHoveredSpeedTarget: THREE.Object3D | null = null;
    
        const interactiveModels = [
            plushieDamagedModelRef.current, 
            adultFroganaModelRef.current
        ].filter(Boolean) as THREE.Object3D[];
    
        const speedControlTargets: (THREE.Object3D | null)[] = [
            lilyFrogModelRef.current, 
            vines1ModelRef.current, 
            vines2ModelRef.current,
            greens1ModelRef.current, 
            wallsModelRef.current
        ];
    
        const allRaycastTargets = [...interactiveModels, ...speedControlTargets.filter(Boolean) as THREE.Object3D[]];
        if (allRaycastTargets.length === 0) return;
    
        const intersects = raycaster.current.intersectObjects(allRaycastTargets, true);
    
        if (intersects.length > 0) {
            const intersectedSubMesh = intersects[0].object;
    
            if (isMeshPartOfGroup(intersectedSubMesh, adultFroganaModelRef.current) && !isAdultFroganaDetailPanelOpenRef.current) {
                newHoveredEmissiveTarget = adultFroganaModelRef.current;
            } else if (isMeshPartOfGroup(intersectedSubMesh, plushieDamagedModelRef.current) && !isDetailPanelOpenRef.current) {
                newHoveredEmissiveTarget = plushieDamagedModelRef.current;
            }
    
            speedControlTargets.forEach(model => {
                if (model && isMeshPartOfGroup(intersectedSubMesh, model)) {
                    newHoveredSpeedTarget = model;
                }
            });
        }
    
        if (hoveredInteractiveObjectRef.current !== newHoveredEmissiveTarget) {
            hoveredInteractiveObjectRef.current = newHoveredEmissiveTarget;
        }
    
        if (hoveredSpeedControlModelRef.current !== newHoveredSpeedTarget) {
            if (hoveredSpeedControlModelRef.current) {
                const actions = interactiveAnimationActionsRef.current.get(hoveredSpeedControlModelRef.current);
                if (actions) {
                    actions.forEach(action => action.timeScale = 1.0);
                }
            }
            hoveredSpeedControlModelRef.current = newHoveredSpeedTarget;
            if (hoveredSpeedControlModelRef.current) {
                const actions = interactiveAnimationActionsRef.current.get(hoveredSpeedControlModelRef.current);
                if (actions) {
                    actions.forEach(action => action.timeScale = CURSOR_RIPPLE_ANIMATION_SPEED_MODIFIER);
                }
            }
        }
    };


    const handlePointerMoveParallax = (event: PointerEvent) => {
      if (!mountRef.current || !parallaxEffectParams.enabled) return;
      const rect = mountRef.current.getBoundingClientRect();
      mousePositionNormalizedRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mousePositionNormalizedRef.current.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!currentMount || !cameraRef.current || !sceneRef.current) return;

      pointer.current.x = (event.clientX / currentMount.clientWidth) * 2 - 1;
      pointer.current.y = -(event.clientY / currentMount.clientHeight) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, cameraRef.current);

      let targetModelForClick: THREE.Object3D | null = null;
      const clickCandidates: THREE.Object3D[] = [];

      if (plushieDamagedModelRef.current && !isDetailPanelOpenRef.current) {
          clickCandidates.push(plushieDamagedModelRef.current);
      }
      if (adultFroganaModelRef.current && !isAdultFroganaDetailPanelOpenRef.current) {
          clickCandidates.push(adultFroganaModelRef.current);
      }
      if (clickCandidates.length === 0) return;
      
      const intersects = raycaster.current.intersectObjects(clickCandidates, true);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        if (isMeshPartOfGroup(clickedMesh, adultFroganaModelRef.current)) {
            targetModelForClick = adultFroganaModelRef.current;
        } else if (isMeshPartOfGroup(clickedMesh, plushieDamagedModelRef.current)) {
            targetModelForClick = plushieDamagedModelRef.current;
        }
      }

      if (targetModelForClick === plushieDamagedModelRef.current && plushieDamagedModelRef.current) {
        setIsAdultFroganaDetailPanelOpen(false);
        setAdultFroganaDetailViewTarget(null);

        const plushieWorldPosition = new THREE.Vector3();
        plushieDamagedModelRef.current.getWorldPosition(plushieWorldPosition);

        const newCameraPosition = plushieWorldPosition.clone().add(plushieFocusOffset);
        const targetLookAt = plushieWorldPosition.clone().add(plushieLookAtTargetOffset);

        setDetailViewTarget({ position: newCameraPosition, lookAt: targetLookAt });
        setIsDetailPanelOpen(true);

        if (hoveredInteractiveObjectRef.current === plushieDamagedModelRef.current) {
           hoveredInteractiveObjectRef.current = null;
        }

      } else if (targetModelForClick === adultFroganaModelRef.current && adultFroganaModelRef.current) {
        setIsDetailPanelOpen(false);
        setDetailViewTarget(null);

        const froganaWorldPosition = new THREE.Vector3();
        adultFroganaModelRef.current.getWorldPosition(froganaWorldPosition);

        const newCameraPosition = froganaWorldPosition.clone().add(adultFroganaFocusOffset);
        const targetLookAt = froganaWorldPosition.clone().add(adultFroganaLookAtTargetOffset);

        setAdultFroganaDetailViewTarget({ position: newCameraPosition, lookAt: targetLookAt });
        setIsAdultFroganaDetailPanelOpen(true);

        if (hoveredInteractiveObjectRef.current === adultFroganaModelRef.current) {
          hoveredInteractiveObjectRef.current = null;
        }
      }
    };

    window.addEventListener('wheel', handleWheel);
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMoveObjectInteraction);
    if (currentMount) {
      currentMount.addEventListener('pointermove', handlePointerMoveParallax);
      currentMount.addEventListener('pointerdown', handlePointerDown);
    }

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      let deltaTime = clockRef.current.getDelta();
      deltaTime = Math.min(deltaTime, 0.1);

      // Smooth Hover Effect Logic for PLUSHIE_DAMAGED
      if (plushieDamagedOriginalMaterialsRef.current.length > 0) {
        const isPlushieHovered = hoveredInteractiveObjectRef.current === plushieDamagedModelRef.current && !isDetailPanelOpenRef.current;
        plushieDamagedOriginalMaterialsRef.current.forEach(item => {
          const targetIntensity = isPlushieHovered ? HOVER_EMISSIVE_INTENSITY : item.originalIntensity;
          const targetColor = isPlushieHovered ? new THREE.Color(0xFFFFFF) : item.originalEmissive;

          item.material.emissiveIntensity = THREE.MathUtils.lerp(item.material.emissiveIntensity, targetIntensity, HOVER_EMISSIVE_LERP_FACTOR);
          if (isPlushieHovered || Math.abs(item.material.emissiveIntensity - item.originalIntensity) > 0.01 || item.material.emissive.getHex() !== targetColor.getHex()) {
             item.material.emissive.lerp(targetColor, HOVER_EMISSIVE_LERP_FACTOR);
          }
           if (!isPlushieHovered && Math.abs(item.material.emissiveIntensity - item.originalIntensity) < 0.01) {
             item.material.emissive.copy(item.originalEmissive); 
          }
        });
      }

      // Smooth Hover Effect Logic for ADULT_FROGANA
      if (adultFroganaOriginalMaterialsRef.current.length > 0) {
        const isFroganaHovered = hoveredInteractiveObjectRef.current === adultFroganaModelRef.current && !isAdultFroganaDetailPanelOpenRef.current;
        adultFroganaOriginalMaterialsRef.current.forEach(item => {
          const targetIntensity = isFroganaHovered ? HOVER_EMISSIVE_INTENSITY : item.originalIntensity;
          const targetColor = isFroganaHovered ? new THREE.Color(0x00FF00) : item.originalEmissive;

          item.material.emissiveIntensity = THREE.MathUtils.lerp(item.material.emissiveIntensity, targetIntensity, HOVER_EMISSIVE_LERP_FACTOR);
           if (isFroganaHovered || Math.abs(item.material.emissiveIntensity - item.originalIntensity) > 0.01 || item.material.emissive.getHex() !== targetColor.getHex()) {
            item.material.emissive.lerp(targetColor, HOVER_EMISSIVE_LERP_FACTOR);
          }
          if (!isFroganaHovered && Math.abs(item.material.emissiveIntensity - item.originalIntensity) < 0.01) {
             item.material.emissive.copy(item.originalEmissive); 
          }
        });
      }


      if (cameraRef.current && sceneRef.current) {
        let baseCameraTargetPos = new THREE.Vector3();
        let baseCameraLookAt = new THREE.Vector3();

        if (detailViewTargetRef.current && isDetailPanelOpenRef.current && plushieDamagedModelRef.current) {
          baseCameraTargetPos.copy(detailViewTargetRef.current.position);
          const currentPlushieOrigin = new THREE.Vector3();
          plushieDamagedModelRef.current.getWorldPosition(currentPlushieOrigin);
          baseCameraLookAt.copy(currentPlushieOrigin.clone().add(plushieLookAtTargetOffset));
        } else if (adultFroganaDetailViewTargetRef.current && isAdultFroganaDetailPanelOpenRef.current && adultFroganaModelRef.current) {
          baseCameraTargetPos.copy(adultFroganaDetailViewTargetRef.current.position);
          const currentFroganaOrigin = new THREE.Vector3();
          adultFroganaModelRef.current.getWorldPosition(currentFroganaOrigin);
          baseCameraLookAt.copy(currentFroganaOrigin.clone().add(adultFroganaLookAtTargetOffset));
        } else {
          const targetWaypoint = cameraWaypoints[currentWaypointIndexRef.current];
          if (targetWaypoint) {
            baseCameraTargetPos.copy(targetWaypoint.position);
            baseCameraLookAt.copy(targetWaypoint.lookAt);
          } else {
            baseCameraTargetPos.copy(cameraRef.current.position);
            baseCameraLookAt.copy(cameraAnimatedLookAtPointRef.current);
          }
        }

        cameraRef.current.position.lerp(baseCameraTargetPos, LERP_FACTOR);
        cameraAnimatedLookAtPointRef.current.lerp(baseCameraLookAt, LERP_FACTOR);

        if (parallaxEffectParams.enabled && cameraRef.current && !isDetailPanelOpenRef.current && !isAdultFroganaDetailPanelOpenRef.current) {
          const parallaxAmountX = mousePositionNormalizedRef.current.x * parallaxEffectParams.intensity;
          const parallaxAmountY = mousePositionNormalizedRef.current.y * parallaxEffectParams.intensity;

          const localRight = new THREE.Vector3(1, 0, 0);
          const localUp = new THREE.Vector3(0, 1, 0);

          localRight.applyQuaternion(cameraRef.current.quaternion);
          localUp.applyQuaternion(cameraRef.current.quaternion);

          cameraRef.current.position.addScaledVector(localRight, parallaxAmountX);
          cameraRef.current.position.addScaledVector(localUp, parallaxAmountY);
        }

        cameraRef.current.lookAt(cameraAnimatedLookAtPointRef.current);
        const cameraY = cameraRef.current.position.y;

        if (audioContextRef.current && pondAmbienceGainRef.current && pondAmbienceLowShelfFilterRef.current && pondAmbienceMidPeakingFilterRef.current && pondAmbienceHighShelfFilterRef.current && underwaterGainRef.current && underwaterSourceRef.current) {
            const currentTime = audioContextRef.current.currentTime;
            const isUnderwaterStateActive = currentWaypointIndexRef.current >= 1 &&
                                           !isDetailPanelOpenRef.current &&
                                           !isAdultFroganaDetailPanelOpenRef.current;


            if (isUnderwaterStateActive) {
                pondAmbienceGainRef.current.gain.setTargetAtTime(UNDERWATER_POND_AMBIENCE_VOLUME, currentTime, AUDIO_FADE_DURATION);
                pondAmbienceLowShelfFilterRef.current.gain.setTargetAtTime(LOW_SHELF_FILTER_GAIN_UNDERWATER, currentTime, AUDIO_FADE_DURATION);
                pondAmbienceMidPeakingFilterRef.current.gain.setTargetAtTime(MID_PEAKING_FILTER_GAIN_UNDERWATER, currentTime, AUDIO_FADE_DURATION);
                pondAmbienceHighShelfFilterRef.current.gain.setTargetAtTime(HIGH_SHELF_FILTER_GAIN_UNDERWATER, currentTime, AUDIO_FADE_DURATION);


                if (audioRefUnderwater.current?.paused && underwaterAudioLoaded && !underwaterAudioError && !isUnderwaterAudioPlaying) {
                    if (audioContextRef.current.state === 'suspended') {
                        audioContextRef.current.resume().then(() => {
                            audioRefUnderwater.current?.play().catch(e => console.warn("Underwater audio play prevented (after resume):", e));
                        }).catch(e => console.error("Error resuming AudioContext for underwater audio:", e));
                    } else {
                        audioRefUnderwater.current.play().catch(e => console.warn("Underwater audio play prevented:", e));
                    }
                    setIsUnderwaterAudioPlaying(true);
                }
                underwaterGainRef.current.gain.setTargetAtTime(UNDERWATER_SOUND_VOLUME, currentTime, AUDIO_FADE_DURATION);

            } else {
                pondAmbienceGainRef.current.gain.setTargetAtTime(DEFAULT_POND_AMBIENCE_VOLUME, currentTime, AUDIO_FADE_DURATION);
                pondAmbienceLowShelfFilterRef.current.gain.setTargetAtTime(0, currentTime, AUDIO_FADE_DURATION);
                pondAmbienceMidPeakingFilterRef.current.gain.setTargetAtTime(0, currentTime, AUDIO_FADE_DURATION);
                pondAmbienceHighShelfFilterRef.current.gain.setTargetAtTime(0, currentTime, AUDIO_FADE_DURATION);

                if (!audioRefUnderwater.current?.paused && isUnderwaterAudioPlaying) {
                    audioRefUnderwater.current?.pause();
                    setIsUnderwaterAudioPlaying(false);
                }
                underwaterGainRef.current.gain.setTargetAtTime(0, currentTime, AUDIO_FADE_DURATION);
            }
        }
      }

      setTextureAnimationConfig(prevConfig => {
        const updatedConfigItems: { [key: string]: any } = {};
        let hasChangedOverall = false;
        Object.keys(prevConfig).forEach(key => {
          const configItem = prevConfig[key];
          let itemChanged = false;
          let newCurrentOffsetX = configItem.currentOffset.x;
          let newCurrentOffsetY = configItem.currentOffset.y;
          let newCurrentOffsetZ = configItem.currentOffset.z;

          if (configItem.textureRef && (configItem.speed.x !== 0 || configItem.speed.y !== 0 || configItem.speed.z !== 0)) {
            newCurrentOffsetX += configItem.speed.x * deltaTime;
            newCurrentOffsetY += configItem.speed.y * deltaTime;
            newCurrentOffsetZ += configItem.speed.z * deltaTime;

            if (configItem.loop) {
              newCurrentOffsetX = (newCurrentOffsetX % 1 + 1) % 1;
              newCurrentOffsetY = (newCurrentOffsetY % 1 + 1) % 1;
              newCurrentOffsetZ = (newCurrentOffsetZ % 1 + 1) % 1;
            }
            if (configItem.textureRef.offset) {
              configItem.textureRef.offset.set(newCurrentOffsetX, newCurrentOffsetY);
            }
            itemChanged = true;
            hasChangedOverall = true;
          }
          if (itemChanged) {
            updatedConfigItems[key] = {
              ...configItem,
              currentOffset: { x: newCurrentOffsetX, y: newCurrentOffsetY, z: newCurrentOffsetZ },
            };
          }
        });
        if (hasChangedOverall) {
          return { ...prevConfig, ...updatedConfigItems };
        }
        return prevConfig;
      });


      if (graphicsQualityLevel > 0 && displacementParams.enabled && displacementMapRef.current && displacedMaterialsRef.current.length > 0) {
        let dirX = displacementParams.direction.x;
        let dirY = displacementParams.direction.y;
        const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
        if (magnitude > 0.0001) {
          dirX /= magnitude; dirY /= magnitude;
        } else { dirX = 0; dirY = 0; }

        displacementOffsetRef.current.x += dirX * displacementParams.speed * deltaTime;
        displacementOffsetRef.current.y += dirY * displacementParams.speed * deltaTime;

        if (displacementParams.loop) {
          let currentX = displacementOffsetRef.current.x % 1.0; if (currentX < 0) currentX += 1.0;
          let currentY = displacementOffsetRef.current.y % 1.0; if (currentY < 0) currentY += 1.0;
          displacementOffsetRef.current.x = currentX;
          displacementOffsetRef.current.y = currentY;
        }
        displacementMapRef.current.offset.set(displacementOffsetRef.current.x, displacementOffsetRef.current.y);
        if(displacementMapRef.current) displacementMapRef.current.needsUpdate = true; // Ensure map updates if offset changes
      }

      if (graphicsQualityLevel > 0 && plushieDamagedMixerRef.current && plushieDamagedClockRef.current) {
        let plushieDelta = plushieDamagedClockRef.current.getDelta();
        plushieDelta = Math.min(plushieDelta, 0.1);
        plushieDamagedMixerRef.current.update(plushieDelta);
      }

      if (graphicsQualityLevel > 0 && wallsMixerRef.current && wallsClockRef.current) {
        let wallsDelta = wallsClockRef.current.getDelta();
        wallsDelta = Math.min(wallsDelta, 0.1);
        wallsMixerRef.current.update(wallsDelta);
      }

      if (graphicsQualityLevel > 0 && vines1MixerRef.current && vines1ClockRef.current) {
        let vines1Delta = vines1ClockRef.current.getDelta();
        vines1Delta = Math.min(vines1Delta, 0.1);
        vines1MixerRef.current.update(vines1Delta);
      }

      if (graphicsQualityLevel > 0 && vines2MixerRef.current && vines2ClockRef.current) {
        let vines2Delta = vines2ClockRef.current.getDelta();
        vines2Delta = Math.min(vines2Delta, 0.1);
        vines2MixerRef.current.update(vines2Delta);
      }

      if (graphicsQualityLevel > 0 && lilyFrogMixerRef.current && lilyFrogClockRef.current) {
        let lilyFrogDelta = lilyFrogClockRef.current.getDelta();
        lilyFrogDelta = Math.min(lilyFrogDelta, 0.1);
        lilyFrogMixerRef.current.update(lilyFrogDelta);
      }

      if (graphicsQualityLevel > 0 && greens1MixerRef.current && greens1ClockRef.current) {
        let greens1Delta = greens1ClockRef.current.getDelta();
        greens1Delta = Math.min(greens1Delta, 0.1);
        greens1MixerRef.current.update(greens1Delta);
      }

      if (graphicsQualityLevel > 0 && adultFroganaMixerRef.current && adultFroganaClockRef.current) {
        let adultFroganaDelta = adultFroganaClockRef.current.getDelta();
        adultFroganaDelta = Math.min(adultFroganaDelta, 0.1);
        adultFroganaMixerRef.current.update(adultFroganaDelta);
      }

      if (sceneRef.current?.fog instanceof THREE.Fog) {
        const isDetailViewActive = isDetailPanelOpenRef.current || isAdultFroganaDetailPanelOpenRef.current;
        const targetFogSettings = (currentWaypointIndexRef.current === 1 && !isDetailViewActive) ? waypoint2FogSettings : globalFogSettings;
        sceneRef.current.fog.color.lerp(targetFogSettings.color, FOG_LERP_FACTOR);
        sceneRef.current.fog.near = THREE.MathUtils.lerp(sceneRef.current.fog.near, targetFogSettings.near, FOG_LERP_FACTOR);
        sceneRef.current.fog.far = THREE.MathUtils.lerp(sceneRef.current.fog.far, targetFogSettings.far, FOG_LERP_FACTOR);
      }

      if (composerRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
        composerRef.current.render(deltaTime);
      } else if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointermove', handlePointerMoveObjectInteraction);
      if (currentMount) {
        currentMount.removeEventListener('pointermove', handlePointerMoveParallax);
        currentMount.removeEventListener('pointerdown', handlePointerDown);
      }
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

      if (audioRef.current) {
        audioRef.current.removeEventListener('canplaythrough', handlePondAudioCanPlay);
        audioRef.current.removeEventListener('error', handlePondAudioError);
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.pause();
        audioRef.current.src = '';
      }
       if (audioRefUnderwater.current) {
        audioRefUnderwater.current.removeEventListener('canplaythrough', handleUnderwaterAudioCanPlay);
        audioRefUnderwater.current.removeEventListener('error', handleUnderwaterAudioError);
        audioRefUnderwater.current.pause();
        audioRefUnderwater.current.src = '';
      }

      if (pondAmbienceSourceRef.current) pondAmbienceSourceRef.current.disconnect();
      if (pondAmbienceLowShelfFilterRef.current) pondAmbienceLowShelfFilterRef.current.disconnect();
      if (pondAmbienceMidPeakingFilterRef.current) pondAmbienceMidPeakingFilterRef.current.disconnect();
      if (pondAmbienceHighShelfFilterRef.current) pondAmbienceHighShelfFilterRef.current.disconnect();
      if (pondAmbienceGainRef.current) pondAmbienceGainRef.current.disconnect();

      if (underwaterSourceRef.current) underwaterSourceRef.current.disconnect();
      if (underwaterGainRef.current) underwaterGainRef.current.disconnect();

      audioContextRef.current?.close().catch(e => console.error("Error closing AudioContext:", e));
      audioContextRef.current = null;


      if (modelRef.current && sceneRef.current) { sceneRef.current.remove(modelRef.current); }
      modelRef.current = null;
      if (wallsModelRef.current && sceneRef.current) { sceneRef.current.remove(wallsModelRef.current); }
      wallsModelRef.current = null;
      if (asset1ModelRef.current && sceneRef.current) { sceneRef.current.remove(asset1ModelRef.current); }
      asset1ModelRef.current = null;
      if (plushieDamagedModelRef.current && sceneRef.current) { sceneRef.current.remove(plushieDamagedModelRef.current); }
      plushieDamagedModelRef.current = null;
      plushieDamagedOriginalMaterialsRef.current = [];
      if (vines1ModelRef.current && sceneRef.current) { sceneRef.current.remove(vines1ModelRef.current); }
      vines1ModelRef.current = null;
      if (vines2ModelRef.current && sceneRef.current) { sceneRef.current.remove(vines2ModelRef.current); }
      vines2ModelRef.current = null;
      if (lilyFrogModelRef.current && sceneRef.current) { sceneRef.current.remove(lilyFrogModelRef.current); }
      lilyFrogModelRef.current = null;
      if (greens1ModelRef.current && sceneRef.current) { sceneRef.current.remove(greens1ModelRef.current); }
      greens1ModelRef.current = null;
      if (godRaysModelRef.current && sceneRef.current) { sceneRef.current.remove(godRaysModelRef.current); }
      godRaysModelRef.current = null;
      godRaysEmissiveMaterialsRef.current = [];
      if (adultFroganaModelRef.current && sceneRef.current) { sceneRef.current.remove(adultFroganaModelRef.current); }
      adultFroganaModelRef.current = null;
      adultFroganaOriginalMaterialsRef.current = [];
      if (moonModelRef.current && sceneRef.current) { sceneRef.current.remove(moonModelRef.current); }
      moonModelRef.current = null;
      moonEmissiveMaterialsRef.current = [];
      if (mainDirectionalLightRef.current && sceneRef.current) { sceneRef.current.remove(mainDirectionalLightRef.current); }
      mainDirectionalLightRef.current = null;


      hoveredInteractiveObjectRef.current = null;
      hoveredSpeedControlModelRef.current = null;
      interactiveAnimationActionsRef.current.clear();

      waterPhysicalMaterialsRef.current = [];

      if (hdriTexture1K) hdriTexture1K.dispose();
      if (envMap1K) envMap1K.dispose();
      setHdriTexture1K(null); setEnvMap1K(null);
      if (hdriTexture4K) hdriTexture4K.dispose();
      if (envMap4K) envMap4K.dispose();
      setHdriTexture4K(null); setEnvMap4K(null);

      if (sceneRef.current) {
        sceneRef.current.traverse(object => {
          if (object instanceof THREE.Light && object !== ambientLight) {
             sceneRef.current?.remove(object);
          }
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else if (object.material) {
              object.material.dispose();
            }
          }
        });
        sceneRef.current.environment = null;
        sceneRef.current.background = null;
        if (sceneRef.current.fog) sceneRef.current.fog = null;
      }

      setTextureAnimationConfig(prev => {
        Object.values(prev).forEach((item: any) => {
          if (item.textureRef && typeof item.textureRef.dispose === 'function') {
            item.textureRef.dispose();
            item.textureRef = null;
          }
        });
        return {};
      });

      if (displacementMapRef.current) {
        displacementMapRef.current.dispose();
        displacementMapRef.current = null;
      }
      displacedMaterialsRef.current = [];

      if (composerRef.current) {
        composerRef.current.passes.forEach(pass => {
          if (typeof (pass as any).dispose === 'function') {
            (pass as any).dispose();
          }
        });
      }
      composerRef.current = null;
      ssrPassRef.current = null;
      bloomPassRef.current = null;
      smaaPassRef.current = null;

      plushieDamagedMixerRef.current = null;
      if (plushieDamagedClockRef.current) {
        plushieDamagedClockRef.current = null;
      }
      wallsMixerRef.current = null;
      if (wallsClockRef.current) {
        wallsClockRef.current = null;
      }
      vines1MixerRef.current = null;
      if (vines1ClockRef.current) {
        vines1ClockRef.current = null;
      }
      vines2MixerRef.current = null;
      if (vines2ClockRef.current) {
        vines2ClockRef.current = null;
      }
      lilyFrogMixerRef.current = null;
      if (lilyFrogClockRef.current) {
        lilyFrogClockRef.current = null;
      }
      greens1MixerRef.current = null;
      if (greens1ClockRef.current) {
        greens1ClockRef.current = null;
      }
      adultFroganaMixerRef.current = null;
      if (adultFroganaClockRef.current) {
        adultFroganaClockRef.current = null;
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (currentMount && rendererRef.current.domElement && currentMount.contains(rendererRef.current.domElement)) {
          currentMount.removeChild(rendererRef.current.domElement);
        }
      }
      rendererRef.current = null;

      sceneRef.current = null;
      cameraRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modelRef.current) modelRef.current.position.set(modelPosition.x, modelPosition.y, modelPosition.z);
  }, [modelPosition]);

  useEffect(() => {
    if (modelRef.current) modelRef.current.rotation.set(modelRotation.x, modelRotation.y, modelRotation.z);
  }, [modelRotation]);

  useEffect(() => {
    if (modelRef.current) modelRef.current.scale.set(modelScale.x, modelScale.y, modelScale.z);
  }, [modelScale]);

  useEffect(() => {
    if (godRaysModelRef.current) {
      godRaysEmissiveMaterialsRef.current.forEach(material => {
        material.emissiveIntensity = godRaysEmissiveIntensity;
      });
    }
  }, [godRaysEmissiveIntensity]);

  useEffect(() => {
    if (moonModelRef.current) {
      moonEmissiveMaterialsRef.current.forEach(material => {
        material.emissiveIntensity = moonEmissiveIntensity;
      });
    }
  }, [moonEmissiveIntensity]);

  useEffect(() => {
    if (modelRef.current && displacedMaterialsRef.current.length > 0) {
      displacedMaterialsRef.current.forEach(mat => {
        if (displacementParams.enabled) {
          mat.displacementScale = displacementParams.effectScale;
          if (mat.displacementMap) {
            mat.displacementMap.repeat.set(displacementParams.textureScale, displacementParams.textureScale);
            mat.displacementMap.needsUpdate = true;
          }
        } else {
          mat.displacementScale = 0;
        }
        mat.needsUpdate = true;
      });
    }
  }, [displacementParams.effectScale, displacementParams.textureScale, displacementParams.enabled]);

  useEffect(() => {
    waterPhysicalMaterialsRef.current.forEach(material => {
      if (waterRefractionParams.enabled) {
        material.transmission = 1.0;
        material.ior = waterRefractionParams.ior;
        material.thickness = waterRefractionParams.thickness;
        material.transparent = true;
      } else {
        material.transmission = 0.0;
      }
      material.needsUpdate = true;
    });
  }, [waterRefractionParams]);

  useEffect(() => {
    if (wallsModelRef.current) wallsModelRef.current.position.set(wallsModelPosition.x, wallsModelPosition.y, wallsModelPosition.z);
  }, [wallsModelPosition]);

  useEffect(() => {
    if (wallsModelRef.current) wallsModelRef.current.rotation.set(wallsModelRotation.x, wallsModelRotation.y, wallsModelRotation.z);
  }, [wallsModelRotation]);

  useEffect(() => {
    if (wallsModelRef.current) wallsModelRef.current.scale.set(wallsModelScale.x, wallsModelScale.y, wallsModelScale.z);
  }, [wallsModelScale]);

  useEffect(() => {
    if (asset1ModelRef.current) asset1ModelRef.current.position.set(asset1ModelPosition.x, asset1ModelPosition.y, asset1ModelPosition.z);
  }, [asset1ModelPosition]);

  useEffect(() => {
    if (asset1ModelRef.current) asset1ModelRef.current.rotation.set(asset1ModelRotation.x, asset1ModelRotation.y, asset1ModelRotation.z);
  }, [asset1ModelRotation]);

  useEffect(() => {
    if (asset1ModelRef.current) asset1ModelRef.current.scale.set(asset1ModelScale.x, asset1ModelScale.y, asset1ModelScale.z);
  }, [asset1ModelScale]);

  useEffect(() => {
    if (plushieDamagedModelRef.current) plushieDamagedModelRef.current.position.set(plushieDamagedModelPosition.x, plushieDamagedModelPosition.y, plushieDamagedModelPosition.z);
  }, [plushieDamagedModelPosition]);

  useEffect(() => {
    if (plushieDamagedModelRef.current) plushieDamagedModelRef.current.rotation.set(plushieDamagedModelRotation.x, plushieDamagedModelRotation.y, plushieDamagedModelRotation.z);
  }, [plushieDamagedModelRotation]);

  useEffect(() => {
    if (plushieDamagedModelRef.current) plushieDamagedModelRef.current.scale.set(plushieDamagedModelScale.x, plushieDamagedModelScale.y, plushieDamagedModelScale.z);
  }, [plushieDamagedModelScale]);

  useEffect(() => {
    if (vines1ModelRef.current) vines1ModelRef.current.position.set(vines1ModelPosition.x, vines1ModelPosition.y, vines1ModelPosition.z);
  }, [vines1ModelPosition]);

  useEffect(() => {
    if (vines1ModelRef.current) vines1ModelRef.current.rotation.set(vines1ModelRotation.x, vines1ModelRotation.y, vines1ModelRotation.z);
  }, [vines1ModelRotation]);

  useEffect(() => {
    if (vines1ModelRef.current) vines1ModelRef.current.scale.set(vines1ModelScale.x, vines1ModelScale.y, vines1ModelScale.z);
  }, [vines1ModelScale]);

  useEffect(() => {
    if (vines2ModelRef.current) vines2ModelRef.current.position.set(vines2ModelPosition.x, vines2ModelPosition.y, vines2ModelPosition.z);
  }, [vines2ModelPosition]);

  useEffect(() => {
    if (vines2ModelRef.current) vines2ModelRef.current.rotation.set(vines2ModelRotation.x, vines2ModelRotation.y, vines2ModelRotation.z);
  }, [vines2ModelRotation]);

  useEffect(() => {
    if (vines2ModelRef.current) vines2ModelRef.current.scale.set(vines2ModelScale.x, vines2ModelScale.y, vines2ModelScale.z);
  }, [vines2ModelScale]);

  useEffect(() => {
    if (lilyFrogModelRef.current) lilyFrogModelRef.current.position.set(lilyFrogModelPosition.x, lilyFrogModelPosition.y, lilyFrogModelPosition.z);
  }, [lilyFrogModelPosition]);

  useEffect(() => {
    if (lilyFrogModelRef.current) lilyFrogModelRef.current.rotation.set(lilyFrogModelRotation.x, lilyFrogModelRotation.y, lilyFrogModelRotation.z);
  }, [lilyFrogModelRotation]);

  useEffect(() => {
    if (lilyFrogModelRef.current) lilyFrogModelRef.current.scale.set(lilyFrogModelScale.x, lilyFrogModelScale.y, lilyFrogModelScale.z);
  }, [lilyFrogModelScale]);

  useEffect(() => {
    if (greens1ModelRef.current) greens1ModelRef.current.position.set(greens1ModelPosition.x, greens1ModelPosition.y, greens1ModelPosition.z);
  }, [greens1ModelPosition]);

  useEffect(() => {
    if (greens1ModelRef.current) greens1ModelRef.current.rotation.set(greens1ModelRotation.x, greens1ModelRotation.y, greens1ModelRotation.z);
  }, [greens1ModelRotation]);

  useEffect(() => {
    if (greens1ModelRef.current) greens1ModelRef.current.scale.set(greens1ModelScale.x, greens1ModelScale.y, greens1ModelScale.z);
  }, [greens1ModelScale]);

  useEffect(() => {
    if (godRaysModelRef.current) godRaysModelRef.current.position.set(godRaysModelPosition.x, godRaysModelPosition.y, godRaysModelPosition.z);
  }, [godRaysModelPosition]);

  useEffect(() => {
    if (godRaysModelRef.current) godRaysModelRef.current.rotation.set(godRaysModelRotation.x, godRaysModelRotation.y, godRaysModelRotation.z);
  }, [godRaysModelRotation]);

  useEffect(() => {
    if (godRaysModelRef.current) godRaysModelRef.current.scale.set(godRaysModelScale.x, godRaysModelScale.y, godRaysModelScale.z);
  }, [godRaysModelScale]);

  useEffect(() => {
    if (adultFroganaModelRef.current) adultFroganaModelRef.current.position.set(adultFroganaModelPosition.x, adultFroganaModelPosition.y, adultFroganaModelPosition.z);
  }, [adultFroganaModelPosition]);

  useEffect(() => {
    if (adultFroganaModelRef.current) adultFroganaModelRef.current.rotation.set(adultFroganaModelRotation.x, adultFroganaModelRotation.y, adultFroganaModelRotation.z);
  }, [adultFroganaModelRotation]);

  useEffect(() => {
    if (adultFroganaModelRef.current) adultFroganaModelRef.current.scale.set(adultFroganaModelScale.x, adultFroganaModelScale.y, adultFroganaModelScale.z);
  }, [adultFroganaModelScale]);

  useEffect(() => {
    if (moonModelRef.current) moonModelRef.current.position.set(moonModelPosition.x, moonModelPosition.y, moonModelPosition.z);
  }, [moonModelPosition]);

  useEffect(() => {
    if (moonModelRef.current) moonModelRef.current.rotation.set(moonModelRotation.x, moonModelRotation.y, moonModelRotation.z);
  }, [moonModelRotation]);

  useEffect(() => {
    if (moonModelRef.current) moonModelRef.current.scale.set(moonModelScale.x, moonModelScale.y, moonModelScale.z);
  }, [moonModelScale]);

  const handlePlayPauseAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.error("Error resuming AudioContext:", e));
    }
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(e => console.warn("Play manually prevented (NewPondAmbience):", e));
        setAudioManuallyPlayedOnce(true);
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioManuallyPlayedOnce(true);
    }
  };

  const displayLoading = initialSequenceStep !== 'done';

  let errorMessages: string[] = [];
  if (modelError) errorMessages.push("WATER_REFRACTED: " + modelError);
  if (wallsModelError) errorMessages.push("WALLS: " + wallsModelError);
  if (asset1ModelError) errorMessages.push("ASSET_1: " + asset1ModelError);
  if (plushieDamagedModelError) errorMessages.push("PLUSHIE_DAMAGED: " + plushieDamagedModelError);
  if (vines1ModelError) errorMessages.push("VINES1: " + vines1ModelError);
  if (vines2ModelError) errorMessages.push("VINES2: " + vines2ModelError);
  if (lilyFrogModelError) errorMessages.push("LILY_FROG: " + lilyFrogModelError);
  if (greens1ModelError) errorMessages.push("GREENS1: " + greens1ModelError);
  if (godRaysModelError) errorMessages.push("GOD_RAYS: " + godRaysModelError);
  if (adultFroganaModelError) errorMessages.push("ADULT_FROGANA: " + adultFroganaModelError);
  if (moonModelError) errorMessages.push("MOON: " + moonModelError);
  if (audioError) errorMessages.push("Pond Ambience Audio: " + audioError);
  if (underwaterAudioError) errorMessages.push("Underwater Audio: " + underwaterAudioError);

  if (hdri1KError) {
    if (!errorMessages.some(msg => msg.includes("HDRI 1K"))) {
      errorMessages.push("HDRI 1K: " + hdri1KError);
    }
  }
  if (hdri4KError) {
    if (!errorMessages.some(msg => msg.includes("HDRI 4K"))) {
      errorMessages.push("HDRI 4K: " + hdri4KError);
    }
  }

  const displayError = errorMessages.length > 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#222222' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {displayLoading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(34,34,34,1.0)', color: '#E0E0E0',
          fontFamily: 'var(--font-geist-sans)', fontSize: '1.2rem', zIndex: 100,
          WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale'
        }}>
          <PlaceholderSpinnerIcon />
          ENTERING POND...
        </div>
      )}
      {displayError && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(34,34,34,1.0)', color: '#FF8A80',
          fontFamily: 'var(--font-geist-sans)', fontSize: '1.1rem', zIndex: 101,
          padding: '20px', textAlign: 'center', lineHeight: '1.6',
          WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale'
        }}>
          {errorMessages.map((msg, index) => <p key={index}>{msg}</p>)}
          <p style={{ fontSize: '0.9rem', color: '#B0B0B0', marginTop: '10px' }}>
            Please ensure all assets are in the public folder and paths are correct. You might need to refresh.
          </p>
        </div>
      )}

      {isDetailPanelOpen && (
        <Card className="absolute top-1/2 left-16 -translate-y-1/2 p-4 bg-card/80 text-card-foreground rounded-lg shadow-xl w-80 max-w-sm backdrop-blur-sm z-50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Plushie Insights</span>
              <Button variant="ghost" size="icon" onClick={handleCloseDetailPanel} className="h-6 w-6 p-0">
                <XIcon className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            <p>This plushie seems to have seen better days. Its fabric is worn, and there are signs of minor damage.</p>
            <p className="mt-2">Perhaps it holds a secret or a story waiting to be uncovered?</p>
          </CardContent>
        </Card>
      )}

      {isAdultFroganaDetailPanelOpen && (
        <Card className="absolute top-1/2 left-16 -translate-y-1/2 p-4 bg-card/80 text-card-foreground rounded-lg shadow-xl w-80 max-w-sm backdrop-blur-sm z-50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Adult Frogana Details</span>
              <Button variant="ghost" size="icon" onClick={handleCloseAdultFroganaDetailPanel} className="h-6 w-6 p-0">
                <XIcon className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            <p>This is the majestic Adult Frogana. Observe its vibrant colors and serene posture.</p>
            <p className="mt-2">It seems content in its watery domain.</p>
          </CardContent>
        </Card>
      )}

      <div className="fixed bottom-5 left-5 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
          className="bg-card hover:bg-accent hover:text-accent-foreground"
          aria-label="Open graphics settings"
        >
          <GearIcon className="h-5 w-5" />
        </Button>
      </div>

      {audioLoaded && !audioError && (
        <div className="fixed bottom-5 right-5 z-50 flex space-x-2">
           <Button
            variant="outline"
            size="icon"
            onClick={handlePlayPauseAudio}
            className="bg-card hover:bg-accent hover:text-accent-foreground"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleStopAudio}
            className="bg-card hover:bg-accent hover:text-accent-foreground"
            aria-label="Stop audio"
          >
            <SquareIcon className="h-5 w-5" />
          </Button>
        </div>
      )}


      {isSettingsPanelOpen && (
        <Card className="fixed bottom-20 left-5 z-50 w-72 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Graphics Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="quality-slider" className="text-sm">
                Level: {qualityLevels[graphicsQualityLevel]}
              </Label>
              <Slider
                id="quality-slider"
                min={0}
                max={2}
                step={1}
                value={[graphicsQualityLevel]}
                onValueChange={(value) => setGraphicsQualityLevel(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>Perf</span>
                <span>Medium</span>
                <span>Max</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Scene;

