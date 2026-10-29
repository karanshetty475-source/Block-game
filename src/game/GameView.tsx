import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  BlockOrientation,
  BlockState,
  Direction,
  getPivotAndAxis,
  checkMove,
  LevelData,
  MoveResult,
  HintStep,
  getOccupiedTiles,
} from './rules';
import { sounds } from './audio';
import confetti from 'canvas-confetti';

interface GameViewProps {
  level: LevelData;
  hints?: HintStep[] | null;
  onMoveChange: (moves: number) => void;
  onCoinCollected: (totalCoins: number, newlyEarned: number) => void;
  onWin: (moves: number) => void;
  onFall: () => void;
  isPaused: boolean;
  onRegisterMoveHandler: (fn: (dir: Direction) => void) => void;
  onRegisterRestartHandler: (fn: () => void) => void;
  onRegisterUndoHandler: (fn: () => void) => void;
  onRegisterGetState?: (fn: () => BlockState) => void;
  canUndoChange: (canUndo: boolean) => void;
}

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  gravity?: number;
  drag?: number;
  wobbleSpeed?: number;
}

export const GameView: React.FC<GameViewProps> = ({
  level,
  hints,
  onMoveChange,
  onCoinCollected,
  onWin,
  onFall,
  isPaused,
  onRegisterMoveHandler,
  onRegisterRestartHandler,
  onRegisterUndoHandler,
  onRegisterGetState,
  canUndoChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef<{
    currentState: BlockState;
    moveHistory: BlockState[];
    movesCount: number;
    collectedCoinIds: Set<string>;
    isRolling: boolean;
    isFalling: boolean;
    isEnteringGoal: boolean;
    hasWon: boolean;
    rollProgress: number;
    rollDuration: number;
    rollPivot: THREE.Vector3;
    rollAxis: THREE.Vector3;
    rollAngle: number;
    fallSpeed: number;
    fallRotSpeed: THREE.Vector3;
    cameraTarget: THREE.Vector3;
    particles: Particle[];
    camShake: number;
  }>({
    currentState: level.start,
    moveHistory: [],
    movesCount: 0,
    collectedCoinIds: new Set<string>(),
    isRolling: false,
    isFalling: false,
    isEnteringGoal: false,
    hasWon: false,
    rollProgress: 0,
    rollDuration: 0.18,
    rollPivot: new THREE.Vector3(),
    rollAxis: new THREE.Vector3(),
    rollAngle: Math.PI / 2,
    fallSpeed: 0,
    fallRotSpeed: new THREE.Vector3(),
    cameraTarget: new THREE.Vector3(level.start.x, 0, level.start.z),
    particles: [],
    camShake: 0,
  });

  const hintsGroupRef = useRef<THREE.Group | null>(null);

  const propsRef = useRef({
    level,
    hints,
    onMoveChange,
    onCoinCollected,
    onWin,
    onFall,
    isPaused,
    onRegisterMoveHandler,
    onRegisterRestartHandler,
    onRegisterUndoHandler,
    onRegisterGetState,
    canUndoChange,
  });
  useEffect(() => {
    propsRef.current = {
      level,
      hints,
      onMoveChange,
      onCoinCollected,
      onWin,
      onFall,
      isPaused,
      onRegisterMoveHandler,
      onRegisterRestartHandler,
      onRegisterUndoHandler,
      onRegisterGetState,
      canUndoChange,
    };
  }, [
    level,
    hints,
    onMoveChange,
    onCoinCollected,
    onWin,
    onFall,
    isPaused,
    onRegisterMoveHandler,
    onRegisterRestartHandler,
    onRegisterUndoHandler,
    onRegisterGetState,
    canUndoChange,
  ]);

  // Rebuild 3D visual hints whenever hint steps change
  useEffect(() => {
    const hintsGroup = hintsGroupRef.current;
    if (!hintsGroup) return;

    while (hintsGroup.children.length > 0) {
      const obj = hintsGroup.children[0];
      hintsGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }

    if (!hints || hints.length === 0) return;

    const stepColors = [
      { hex: 0xf59e0b, emissive: 0xb45309, opacity: 0.8 }, // Step 1: Warm Amber Gold
      { hex: 0x06b6d4, emissive: 0x0e7490, opacity: 0.65 }, // Step 2: Bright Cyan
      { hex: 0xf43f5e, emissive: 0xbe123c, opacity: 0.55 }, // Step 3: Rose Pink
    ];

    hints.forEach((hint) => {
      const colorDef = stepColors[(hint.stepNumber - 1) % stepColors.length];
      const occupied = getOccupiedTiles(hint.resultingState);

      occupied.forEach((tile) => {
        // Glowing foot marker plate
        const plateGeo = new THREE.PlaneGeometry(0.88, 0.88);
        const plateMat = new THREE.MeshBasicMaterial({
          color: colorDef.hex,
          transparent: true,
          opacity: colorDef.opacity * 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.rotation.x = -Math.PI / 2;
        plate.position.set(tile.x, 0.035, tile.z);
        hintsGroup.add(plate);

        // Outer outline ring
        const ringGeo = new THREE.RingGeometry(0.34, 0.42, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorDef.hex,
          transparent: true,
          opacity: colorDef.opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(tile.x, 0.04, tile.z);
        hintsGroup.add(ring);
      });

      // Floating step badge cylinder indicating step 1, 2, 3
      const avgX = occupied.reduce((acc, t) => acc + t.x, 0) / occupied.length;
      const avgZ = occupied.reduce((acc, t) => acc + t.z, 0) / occupied.length;

      const badgeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16);
      const badgeMat = new THREE.MeshStandardMaterial({
        color: colorDef.hex,
        emissive: colorDef.emissive,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      });
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.set(avgX, 0.18 + hint.stepNumber * 0.03, avgZ);
      hintsGroup.add(badge);
    });
  }, [hints]);

  useEffect(() => {
    stateRef.current.currentState = level.start;
    stateRef.current.moveHistory = [];
    stateRef.current.movesCount = 0;
    stateRef.current.collectedCoinIds = new Set<string>();
    stateRef.current.isRolling = false;
    stateRef.current.isFalling = false;
    stateRef.current.isEnteringGoal = false;
    stateRef.current.hasWon = false;
    stateRef.current.cameraTarget.set(level.start.x, 0, level.start.z);
    propsRef.current.onMoveChange(0);
    propsRef.current.canUndoChange(false);
  }, [level]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(0x32bfa0);
    scene.background = bgColor;
    // Set fog further away so white tiles remain clean and unwashed
    scene.fog = new THREE.Fog(bgColor, 50, 120);

    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 13;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      200
    );

    const isoDist = 30;
    camera.position.set(isoDist, isoDist * 1.25, isoDist);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e3a5f, 0.65);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(18, 32, 14);
    if (!isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 80;
      const d = 16;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xa7f3d0, 0.45);
    rimLight.position.set(-15, 12, -15);
    scene.add(rimLight);

    const tilesGroup = new THREE.Group();
    const coinsGroup = new THREE.Group();
    const hintsGroup = new THREE.Group();
    const particlePointsGroup = new THREE.Group();
    scene.add(tilesGroup);
    scene.add(coinsGroup);
    scene.add(hintsGroup);
    scene.add(particlePointsGroup);
    hintsGroupRef.current = hintsGroup;

    // Pure brilliant white top surface material
    const whiteTileTopMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.02,
    });

    // Colorful vibrant palette for tile sides
    const colorfulSideColors = [
      0x8b5cf6, // vivid violet
      0xec4899, // hot pink
      0x3b82f6, // bright cobalt blue
      0x06b6d4, // electric cyan
      0xa855f7, // purple
      0xf43f5e, // coral rose
      0xf59e0b, // warm amber
      0x10b981, // emerald
    ];
    const sideMaterials = colorfulSideColors.map(
      (col) =>
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.35,
          metalness: 0.15,
        })
    );

    const tileEdgeMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      linewidth: 1,
    });

    const targetTileMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.3,
    });

    const fragileTileMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88,
    });

    const startTileMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.02,
    });

    // Pink rectangular block (user requested pink color)
    const blockGeo = new THREE.BoxGeometry(0.92, 1.92, 0.92);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // vibrant stylish rose pink
      roughness: 0.16,
      metalness: 0.12,
    });

    const blockEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(blockGeo),
      new THREE.LineBasicMaterial({ color: 0xbe123c, linewidth: 2 })
    );

    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
    blockMesh.castShadow = !isSoftwareGl;
    blockMesh.receiveShadow = !isSoftwareGl;
    blockMesh.add(blockEdges);

    // Glossy pastel pink top cap
    const capGeo = new THREE.BoxGeometry(0.78, 0.06, 0.78);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xfce7f3, // soft pastel pink cap
      roughness: 0.08,
      metalness: 0.08,
    });
    const topCap = new THREE.Mesh(capGeo, capMat);
    topCap.position.y = 0.94;
    blockMesh.add(topCap);

    const rollPivotGroup = new THREE.Group();
    scene.add(rollPivotGroup);
    scene.add(blockMesh);

    // Ghost Replica Block (Light glowing holographic replica that animates hint moves toward goal)
    const replicaMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9, // luminous light cyan
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
    });
    const replicaEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(blockGeo),
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    const replicaMesh = new THREE.Mesh(blockGeo, replicaMat);
    replicaMesh.add(replicaEdges);

    const replicaTopCap = new THREE.Mesh(
      capGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.05,
        transparent: true,
        opacity: 0.9,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.9,
      })
    );
    replicaTopCap.position.y = 0.94;
    replicaMesh.add(replicaTopCap);
    replicaMesh.visible = false;

    const replicaPivotGroup = new THREE.Group();
    scene.add(replicaPivotGroup);
    scene.add(replicaMesh);

    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
    grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.18)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);

    const targetRingGeo = new THREE.RingGeometry(0.2, 0.38, 32);
    const targetRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.position.y = 0.03;
    scene.add(targetRing);

    const particleCount = 500;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    // Crisp luminous particle texture with soft bloom falloff
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
    pGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.35)');
    pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);
    const pTex = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.42,
      map: pTex,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    particleSystem.frustumCulled = false;
    particleSystem.renderOrder = 999;
    particlePointsGroup.add(particleSystem);

    // ----------------------------------------------------
    // Victory Visuals: Expanding 3D Shockwaves & Beacon Beam
    // ----------------------------------------------------
    const victoryGroup = new THREE.Group();
    scene.add(victoryGroup);

    // Shockwave Ring 1 (Radiant Golden Amber)
    const shockwave1Geo = new THREE.RingGeometry(0.18, 0.45, 40);
    const shockwave1Mat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shockwave1Mesh = new THREE.Mesh(shockwave1Geo, shockwave1Mat);
    shockwave1Mesh.rotation.x = -Math.PI / 2;
    shockwave1Mesh.position.y = 0.04;
    shockwave1Mesh.visible = false;
    victoryGroup.add(shockwave1Mesh);

    // Shockwave Ring 2 (Electric Cyan)
    const shockwave2Geo = new THREE.RingGeometry(0.24, 0.52, 40);
    const shockwave2Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shockwave2Mesh = new THREE.Mesh(shockwave2Geo, shockwave2Mat);
    shockwave2Mesh.rotation.x = -Math.PI / 2;
    shockwave2Mesh.position.y = 0.045;
    shockwave2Mesh.visible = false;
    victoryGroup.add(shockwave2Mesh);

    // Vertical Victory Light Beacon Cylinder (Soft ethereal column of light)
    const beaconGeo = new THREE.CylinderGeometry(0.35, 0.35, 7.0, 24, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.y = 3.5;
    beaconMesh.visible = false;
    victoryGroup.add(beaconMesh);

    // Inner White Core of Beacon
    const beaconCoreGeo = new THREE.CylinderGeometry(0.14, 0.14, 7.5, 16, 1, true);
    const beaconCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beaconCoreMesh = new THREE.Mesh(beaconCoreGeo, beaconCoreMat);
    beaconCoreMesh.position.y = 3.75;
    beaconCoreMesh.visible = false;
    victoryGroup.add(beaconCoreMesh);

    const victoryAnim = {
      active: false,
      progress: 0,
      targetX: 0,
      targetZ: 0,
    };

    function spawnDust(x: number, z: number, color = 0xffffff, count = 10) {
      for (let i = 0; i < count; i++) {
        if (stateRef.current.particles.length >= particleCount) {
          stateRef.current.particles.shift();
        }
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.5;
        stateRef.current.particles.push({
          pos: new THREE.Vector3(x + (Math.random() - 0.5) * 0.4, 0.08, z + (Math.random() - 0.5) * 0.4),
          vel: new THREE.Vector3(Math.cos(angle) * speed, 0.5 + Math.random() * 1.2, Math.sin(angle) * speed),
          color: new THREE.Color(color),
          size: 0.15 + Math.random() * 0.15,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.2,
          gravity: 3.5,
        });
      }
    }

    function spawnGoalDust(x: number, z: number) {
      for (let i = 0; i < 4; i++) {
        const edge = Math.floor(Math.random() * 4);
        let px = x;
        let pz = z;
        const spread = (Math.random() - 0.5) * 0.8;
        if (edge === 0) { px += spread; pz += 0.45; }
        else if (edge === 1) { px += spread; pz -= 0.45; }
        else if (edge === 2) { px += 0.45; pz += spread; }
        else { px -= 0.45; pz += spread; }

        if (stateRef.current.particles.length >= particleCount) {
          stateRef.current.particles.shift();
        }
        stateRef.current.particles.push({
          pos: new THREE.Vector3(px, 0.05, pz),
          vel: new THREE.Vector3((px - x) * 0.6, 1.2 + Math.random() * 1.6, (pz - z) * 0.6),
          color: new THREE.Color(Math.random() > 0.4 ? 0x38bdf8 : 0xf43f5e),
          size: 0.14 + Math.random() * 0.12,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
          gravity: 3.5,
        });
      }
    }

    // High-satisfaction celebratory particle effect when landing in the goal state
    function spawnGoalVictoryCelebration(gx: number, gz: number) {
      victoryAnim.active = true;
      victoryAnim.progress = 0;
      victoryAnim.targetX = gx;
      victoryAnim.targetZ = gz;

      shockwave1Mesh.position.set(gx, 0.04, gz);
      shockwave1Mesh.scale.set(1, 1, 1);
      shockwave1Mat.opacity = 1;
      shockwave1Mesh.visible = true;

      shockwave2Mesh.position.set(gx, 0.045, gz);
      shockwave2Mesh.scale.set(0.7, 0.7, 1);
      shockwave2Mat.opacity = 0.95;
      shockwave2Mesh.visible = true;

      beaconMesh.position.set(gx, 3.5, gz);
      beaconCoreMesh.position.set(gx, 3.75, gz);
      beaconMat.opacity = 0.45;
      beaconCoreMat.opacity = 0.55;
      beaconMesh.visible = true;
      beaconCoreMesh.visible = true;

      stateRef.current.camShake = 0.16;

      // 1. Radial Fountain Explosion of Victory Sparks (180 particles)
      const colors = [
        0xfbbf24, // Gold
        0xf59e0b, // Amber
        0x38bdf8, // Electric Cyan
        0x06b6d4, // Cyan
        0xf43f5e, // Hot Coral Pink
        0xfb7185, // Rose Pink
        0x34d399, // Emerald Mint
        0xffffff, // White starlight
      ];

      for (let i = 0; i < 180; i++) {
        if (stateRef.current.particles.length >= particleCount) {
          stateRef.current.particles.shift();
        }
        const angle = Math.random() * Math.PI * 2;
        const horizSpeed = 1.4 + Math.random() * 4.2;
        const vertSpeed = 4.2 + Math.random() * 6.2;
        const col = colors[Math.floor(Math.random() * colors.length)];

        stateRef.current.particles.push({
          pos: new THREE.Vector3(
            gx + (Math.random() - 0.5) * 0.35,
            0.05,
            gz + (Math.random() - 0.5) * 0.35
          ),
          vel: new THREE.Vector3(
            Math.cos(angle) * horizSpeed,
            vertSpeed,
            Math.sin(angle) * horizSpeed
          ),
          color: new THREE.Color(col),
          size: 0.28 + Math.random() * 0.25,
          life: 0,
          maxLife: 0.85 + Math.random() * 0.55,
          gravity: 7.5,
          drag: 0.985,
        });
      }

      // 2. Rising Ethereal Star Sparkles (50 particles)
      for (let i = 0; i < 50; i++) {
        if (stateRef.current.particles.length >= particleCount) {
          stateRef.current.particles.shift();
        }
        const angle = Math.random() * Math.PI * 2;
        const horizSpeed = 0.2 + Math.random() * 0.8;
        const vertSpeed = 2.4 + Math.random() * 3.6;
        const col = Math.random() > 0.4 ? 0xfef08a : 0x67e8f9;

        stateRef.current.particles.push({
          pos: new THREE.Vector3(
            gx + (Math.random() - 0.5) * 0.4,
            0.1 + Math.random() * 0.2,
            gz + (Math.random() - 0.5) * 0.4
          ),
          vel: new THREE.Vector3(
            Math.cos(angle) * horizSpeed,
            vertSpeed,
            Math.sin(angle) * horizSpeed
          ),
          color: new THREE.Color(col),
          size: 0.22 + Math.random() * 0.18,
          life: 0,
          maxLife: 1.2 + Math.random() * 0.6,
          gravity: 0.8,
          wobbleSpeed: 1.0 + Math.random() * 2.0,
        });
      }
    }

    function syncBlockMesh(state: BlockState) {
      const { x, z, orientation } = state;
      blockMesh.rotation.set(0, 0, 0);
      (contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.4;

      const isAtTarget =
        state.x === propsRef.current.level.target.x &&
        state.z === propsRef.current.level.target.z &&
        state.orientation === BlockOrientation.UPRIGHT;

      if (isAtTarget || stateRef.current.isEnteringGoal || stateRef.current.hasWon) {
        contactShadow.visible = false;
      } else {
        contactShadow.visible = true;
      }

      switch (orientation) {
        case BlockOrientation.UPRIGHT:
          blockMesh.scale.set(1, 1, 1);
          blockMesh.position.set(x, 0.96, z);
          contactShadow.scale.set(1, 1, 1);
          contactShadow.position.set(x, 0.02, z);
          break;
        case BlockOrientation.HORIZONTAL_X:
          blockMesh.scale.set(1, 1, 1);
          blockMesh.rotation.z = Math.PI / 2;
          blockMesh.position.set(x + 0.5, 0.46, z);
          contactShadow.scale.set(1.6, 1, 1);
          contactShadow.position.set(x + 0.5, 0.02, z);
          break;
        case BlockOrientation.HORIZONTAL_Z:
          blockMesh.scale.set(1, 1, 1);
          blockMesh.rotation.x = Math.PI / 2;
          blockMesh.position.set(x, 0.46, z + 0.5);
          contactShadow.scale.set(1, 1.6, 1);
          contactShadow.position.set(x, 0.02, z + 0.5);
          break;
      }
    }

    function syncReplicaMesh(state: BlockState) {
      const { x, z, orientation } = state;
      replicaMesh.rotation.set(0, 0, 0);
      switch (orientation) {
        case BlockOrientation.UPRIGHT:
          replicaMesh.scale.set(1, 1, 1);
          replicaMesh.position.set(x, 0.96, z);
          break;
        case BlockOrientation.HORIZONTAL_X:
          replicaMesh.scale.set(1, 1, 1);
          replicaMesh.rotation.z = Math.PI / 2;
          replicaMesh.position.set(x + 0.5, 0.46, z);
          break;
        case BlockOrientation.HORIZONTAL_Z:
          replicaMesh.scale.set(1, 1, 1);
          replicaMesh.rotation.x = Math.PI / 2;
          replicaMesh.position.set(x, 0.46, z + 0.5);
          break;
      }
    }

    const coinMeshes = new Map<string, THREE.Group>();
    const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 18);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.2,
    });
    const coinInnerGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.09, 18);
    const coinInnerMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      metalness: 0.6,
      roughness: 0.15,
    });

    function rebuildLevelObjects(curLevel: LevelData) {
      while (tilesGroup.children.length > 0) {
        const obj = tilesGroup.children[0];
        tilesGroup.remove(obj);
      }
      while (coinsGroup.children.length > 0) {
        const obj = coinsGroup.children[0];
        coinsGroup.remove(obj);
      }
      coinMeshes.clear();
      shockwave1Mesh.visible = false;
      shockwave2Mesh.visible = false;
      beaconMesh.visible = false;
      beaconCoreMesh.visible = false;
      victoryAnim.active = false;

      const tileBoxGeo = new THREE.BoxGeometry(0.96, 0.25, 0.96);
      const tileEdgesGeo = new THREE.EdgesGeometry(tileBoxGeo);

      curLevel.tiles.forEach((t) => {
        const sideMat = sideMaterials[Math.abs(t.x * 3 + t.z * 5) % sideMaterials.length];

        if (t.type === 'TARGET') {
          // Hollow goal socket tile: aperture matching the 0.92 block footprint
          const goalGroup = new THREE.Group();
          goalGroup.position.set(t.x, 0, t.z);

          // 1. Outer perimeter rim frame (outer 0.98 x 0.98, height 0.25, inner hole opening 0.92 x 0.92)
          // No black rectangle or dark shadow underneath: inner walls match the clean colorful tile sides
          const rimN = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.25, 0.04), [
            sideMat, sideMat, whiteTileTopMat, sideMat, sideMat, sideMat,
          ]);
          rimN.position.set(0, -0.125, -0.47);
          rimN.receiveShadow = !isSoftwareGl;
          rimN.castShadow = !isSoftwareGl;
          goalGroup.add(rimN);

          const rimS = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.25, 0.04), [
            sideMat, sideMat, whiteTileTopMat, sideMat, sideMat, sideMat,
          ]);
          rimS.position.set(0, -0.125, 0.47);
          rimS.receiveShadow = !isSoftwareGl;
          rimS.castShadow = !isSoftwareGl;
          goalGroup.add(rimS);

          const rimW = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.90), [
            sideMat, sideMat, whiteTileTopMat, sideMat, sideMat, sideMat,
          ]);
          rimW.position.set(-0.47, -0.125, 0);
          rimW.receiveShadow = !isSoftwareGl;
          rimW.castShadow = !isSoftwareGl;
          goalGroup.add(rimW);

          const rimE = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.90), [
            sideMat, sideMat, whiteTileTopMat, sideMat, sideMat, sideMat,
          ]);
          rimE.position.set(0.47, -0.125, 0);
          rimE.receiveShadow = !isSoftwareGl;
          rimE.castShadow = !isSoftwareGl;
          goalGroup.add(rimE);

          // 2. Glowing cyan aperture rim outline (clean fit into goal state)
          const rimLinePoints = [
            new THREE.Vector3(-0.46, 0.005, -0.46),
            new THREE.Vector3(0.46, 0.005, -0.46),
            new THREE.Vector3(0.46, 0.005, 0.46),
            new THREE.Vector3(-0.46, 0.005, 0.46),
            new THREE.Vector3(-0.46, 0.005, -0.46),
          ];
          const rimLineGeo = new THREE.BufferGeometry().setFromPoints(rimLinePoints);
          const rimLineMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            linewidth: 2,
          });
          const rimLine = new THREE.Line(rimLineGeo, rimLineMat);
          goalGroup.add(rimLine);

          tilesGroup.add(goalGroup);
        } else {
          let topMat = whiteTileTopMat;
          if (t.type === 'FRAGILE') topMat = fragileTileMat;
          else if (t.type === 'START') topMat = startTileMat;

          const tileMesh = new THREE.Mesh(tileBoxGeo, [
            sideMat, // right (+x)
            sideMat, // left (-x)
            topMat,  // top (+y)
            sideMat, // bottom (-y)
            sideMat, // front (+z)
            sideMat, // back (-z)
          ]);
          tileMesh.position.set(t.x, -0.125, t.z);
          tileMesh.receiveShadow = !isSoftwareGl;
          tileMesh.castShadow = !isSoftwareGl;

          const edges = new THREE.LineSegments(tileEdgesGeo, tileEdgeMat);
          tileMesh.add(edges);

          tilesGroup.add(tileMesh);
        }
      });

      targetRing.position.set(curLevel.target.x, 0.03, curLevel.target.z);

      if (curLevel.coins) {
        curLevel.coins.forEach((c) => {
          if (!stateRef.current.collectedCoinIds.has(c.id)) {
            const coinGroup = new THREE.Group();
            const outer = new THREE.Mesh(coinGeo, coinMat);
            const inner = new THREE.Mesh(coinInnerGeo, coinInnerMat);
            outer.castShadow = !isSoftwareGl;
            inner.castShadow = !isSoftwareGl;
            coinGroup.add(outer);
            coinGroup.add(inner);
            coinGroup.position.set(c.x, 0.45, c.z);
            coinGroup.rotation.x = Math.PI / 2;
            coinsGroup.add(coinGroup);
            coinMeshes.set(c.id, coinGroup);
          }
        });
      }

      syncBlockMesh(stateRef.current.currentState);
    }

    rebuildLevelObjects(propsRef.current.level);
    syncBlockMesh(stateRef.current.currentState);

    const handleMove = (dir: Direction) => {
      const s = stateRef.current;
      if (s.isRolling || s.isFalling || s.isEnteringGoal || s.hasWon || propsRef.current.isPaused) return;

      const currentLvl = propsRef.current.level;
      const moveRes = checkMove(s.currentState, dir, currentLvl, s.collectedCoinIds);

      s.moveHistory.push({ ...s.currentState });
      propsRef.current.canUndoChange(true);

      s.movesCount += 1;
      propsRef.current.onMoveChange(s.movesCount);

      const { pivot, axis, angle } = getPivotAndAxis(s.currentState, dir);

      s.rollPivot.set(pivot[0], pivot[1], pivot[2]);
      s.rollAxis.set(axis[0], axis[1], axis[2]);
      s.rollAngle = angle;
      s.rollProgress = 0;
      s.isRolling = true;

      syncBlockMesh(s.currentState);
      rollPivotGroup.position.copy(s.rollPivot);
      rollPivotGroup.rotation.set(0, 0, 0);

      blockMesh.position.sub(s.rollPivot);
      rollPivotGroup.add(blockMesh);

      sounds.playRoll(moveRes.nextState.orientation === BlockOrientation.UPRIGHT);
      // Pink dust sparks
      spawnDust(pivot[0], pivot[2], 0xf43f5e, 8);

      if (moveRes.collectedCoinIds.length > 0) {
        moveRes.collectedCoinIds.forEach((id) => {
          s.collectedCoinIds.add(id);
          const cMesh = coinMeshes.get(id);
          if (cMesh) {
            coinsGroup.remove(cMesh);
            coinMeshes.delete(id);
            sounds.playCoin();
            spawnDust(cMesh.position.x, cMesh.position.z, 0xfacc15, 14);
          }
        });
        propsRef.current.onCoinCollected(s.collectedCoinIds.size, moveRes.collectedCoinIds.length);
      }

      (s as unknown as { pendingResult: MoveResult }).pendingResult = moveRes;
    };

    const handleRestart = () => {
      const s = stateRef.current;
      s.currentState = propsRef.current.level.start;
      s.moveHistory = [];
      s.movesCount = 0;
      s.isRolling = false;
      s.isFalling = false;
      s.isEnteringGoal = false;
      s.hasWon = false;
      s.fallSpeed = 0;
      s.fallRotSpeed.set(0, 0, 0);

      if (blockMesh.parent === rollPivotGroup) {
        rollPivotGroup.remove(blockMesh);
        scene.add(blockMesh);
      }
      blockMesh.rotation.set(0, 0, 0);
      rollPivotGroup.rotation.set(0, 0, 0);

      syncBlockMesh(s.currentState);
      s.cameraTarget.set(s.currentState.x, 0, s.currentState.z);
      propsRef.current.onMoveChange(0);
      propsRef.current.canUndoChange(false);
      rebuildLevelObjects(propsRef.current.level);
      sounds.playClick();
    };

    const handleUndo = () => {
      const s = stateRef.current;
      if (s.isRolling || s.isFalling || s.isEnteringGoal || s.hasWon || s.moveHistory.length === 0) return;

      const previousState = s.moveHistory.pop()!;
      s.currentState = previousState;
      s.movesCount = Math.max(0, s.movesCount - 1);
      propsRef.current.onMoveChange(s.movesCount);
      propsRef.current.canUndoChange(s.moveHistory.length > 0);

      if (blockMesh.parent === rollPivotGroup) {
        rollPivotGroup.remove(blockMesh);
        scene.add(blockMesh);
      }
      syncBlockMesh(s.currentState);
      sounds.playClick();
    };

    propsRef.current.onRegisterMoveHandler(handleMove);
    propsRef.current.onRegisterRestartHandler(handleRestart);
    propsRef.current.onRegisterUndoHandler(handleUndo);
    if (propsRef.current.onRegisterGetState) {
      propsRef.current.onRegisterGetState(() => stateRef.current.currentState);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (propsRef.current.isPaused) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove('RIGHT');
          break;
        case 'r':
        case 'R':
          handleRestart();
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            handleUndo();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const minSwipe = 28;

        if (Math.abs(dx) > minSwipe || Math.abs(dy) > minSwipe) {
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) handleMove('RIGHT');
            else handleMove('LEFT');
          } else {
            if (dy > 0) handleMove('DOWN');
            else handleMove('UP');
          }
        }
      }
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvasEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    let animId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          animId = window.setTimeout(cb, 60);
        }
      };
      animId = window.setTimeout(poll, 5);
    }

    // Ghost replica animation state for hint demonstration
    const replicaState = {
      currentState: { ...stateRef.current.currentState },
      stepIndex: 0,
      isRolling: false,
      rollProgress: 0,
      rollPivot: new THREE.Vector3(),
      rollAxis: new THREE.Vector3(),
      rollAngle: Math.PI / 2,
      isEnteringGoal: false,
      fallSpeed: 0,
      pauseTimer: 0.25,
    };
    let lastPlayerStateKey = '';

    const tick = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const s = stateRef.current;

      if (s.isRolling) {
        s.rollProgress += dt / s.rollDuration;
        if (s.rollProgress >= 1) {
          s.rollProgress = 1;
          s.isRolling = false;

          rollPivotGroup.remove(blockMesh);
          scene.add(blockMesh);

          const pending = (s as unknown as { pendingResult: MoveResult }).pendingResult;
          if (pending) {
            s.currentState = pending.nextState;
            syncBlockMesh(s.currentState);
            s.cameraTarget.set(s.currentState.x, 0, s.currentState.z);

            if (pending.isWin) {
              // Instead of placing it in a static goal state, fit it into the exact tile socket where it goes!
              s.isEnteringGoal = true;
              s.fallSpeed = 0;
              contactShadow.visible = false;
              blockMesh.position.set(s.currentState.x, 0.96, s.currentState.z);
              blockMesh.rotation.set(0, 0, 0);
              sounds.playGoalDrop();
              spawnGoalDust(s.currentState.x, s.currentState.z);
            } else if (pending.isFragileBreak) {
              sounds.playFragileBreak();
              sounds.playFall();
              s.isFalling = true;
              s.fallSpeed = 0;
              s.fallRotSpeed.set(Math.random() * 4 - 2, Math.random() * 2, Math.random() * 4 - 2);
              spawnDust(s.currentState.x, s.currentState.z, 0xf97316, 20);
              propsRef.current.onFall();
              setTimeout(() => {
                handleRestart();
              }, 950);
            } else if (pending.isOffGrid) {
              sounds.playFall();
              s.isFalling = true;
              s.fallSpeed = 0;
              s.fallRotSpeed.set(
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 6
              );
              propsRef.current.onFall();
              setTimeout(() => {
                handleRestart();
              }, 950);
            }
          }
        } else {
          const p = s.rollProgress;
          const ease = 1 - Math.pow(1 - p, 3);
          rollPivotGroup.setRotationFromAxisAngle(s.rollAxis, s.rollAngle * ease);
        }
      }

      if (s.isFalling) {
        s.fallSpeed += 18 * dt;
        blockMesh.position.y -= s.fallSpeed * dt;
        blockMesh.rotation.x += s.fallRotSpeed.x * dt;
        blockMesh.rotation.y += s.fallRotSpeed.y * dt;
        blockMesh.rotation.z += s.fallRotSpeed.z * dt;
        contactShadow.material.opacity = Math.max(0, 0.4 - s.fallSpeed * 0.08);
      }

      if (s.isEnteringGoal) {
        // Completely remove any black shadow quad underneath the tile in the goal state
        contactShadow.visible = false;

        // Use the same fall acceleration as falling down, dropping smoothly straight into the goal hole!
        s.fallSpeed += 18 * dt;
        blockMesh.position.y -= s.fallSpeed * dt;
        blockMesh.rotation.set(0, 0, 0); // locked upright so it slips directly inside the square socket sleeve

        if (Math.random() < 0.65) {
          spawnGoalDust(propsRef.current.level.target.x, propsRef.current.level.target.z);
        }

        // Once the block has fallen deep inside the goal socket (y <= -2.1):
        if (blockMesh.position.y <= -2.1 && !s.hasWon) {
          s.hasWon = true;
          s.isEnteringGoal = false;
          sounds.playWin();

          // Trigger the 3D particle celebration: radial spark blast, beacon light beam, and expanding shockwave rings
          spawnGoalVictoryCelebration(propsRef.current.level.target.x, propsRef.current.level.target.z);

          confetti({
            particleCount: 120,
            spread: 85,
            origin: { y: 0.6 },
            colors: ['#f43f5e', '#fbbf24', '#38bdf8', '#34d399', '#ec4899', '#a855f7'],
          });
          setTimeout(() => {
            propsRef.current.onWin(s.movesCount);
          }, 750);
        }
      }

      // ----------------------------------------------------
      // Replica Hint Demonstration Animation
      // When user clicks hints, the user's block does NOT move;
      // instead, a replica of the rectangular box moves in a light glowing color,
      // demonstrating the exact moves towards and fitting into the goal state!
      // ----------------------------------------------------
      const currentHints = propsRef.current.hints;
      if (currentHints && currentHints.length > 0 && !s.isEnteringGoal && !s.hasWon) {
        replicaMesh.visible = true;

        const playerKey = `${s.currentState.x},${s.currentState.z},${s.currentState.orientation},${currentHints.length}`;
        if (playerKey !== lastPlayerStateKey) {
          lastPlayerStateKey = playerKey;
          if (replicaMesh.parent === replicaPivotGroup) {
            replicaPivotGroup.remove(replicaMesh);
            scene.add(replicaMesh);
          }
          replicaState.currentState = { ...s.currentState };
          replicaState.stepIndex = 0;
          replicaState.isRolling = false;
          replicaState.isEnteringGoal = false;
          replicaState.fallSpeed = 0;
          replicaState.pauseTimer = 0.25;
          syncReplicaMesh(replicaState.currentState);
        }

        if (replicaState.pauseTimer > 0) {
          replicaState.pauseTimer -= dt;
          if (replicaState.pauseTimer <= 0) {
            // If sequence or goal reached, loop back smoothly
            if (
              replicaState.stepIndex >= currentHints.length ||
              replicaState.isEnteringGoal
            ) {
              if (replicaMesh.parent === replicaPivotGroup) {
                replicaPivotGroup.remove(replicaMesh);
                scene.add(replicaMesh);
              }
              replicaState.currentState = { ...s.currentState };
              replicaState.stepIndex = 0;
              replicaState.isRolling = false;
              replicaState.isEnteringGoal = false;
              replicaState.fallSpeed = 0;
              replicaState.pauseTimer = 0.25;
              syncReplicaMesh(replicaState.currentState);
            } else {
              // Initiate roll for current hint step
              const step = currentHints[replicaState.stepIndex];
              const { pivot, axis, angle } = getPivotAndAxis(replicaState.currentState, step.direction);
              replicaState.rollPivot.set(pivot[0], pivot[1], pivot[2]);
              replicaState.rollAxis.set(axis[0], axis[1], axis[2]);
              replicaState.rollAngle = angle;
              replicaState.rollProgress = 0;
              replicaState.isRolling = true;

              syncReplicaMesh(replicaState.currentState);
              replicaPivotGroup.position.copy(replicaState.rollPivot);
              replicaPivotGroup.rotation.set(0, 0, 0);

              replicaMesh.position.sub(replicaState.rollPivot);
              replicaPivotGroup.add(replicaMesh);
            }
          }
        } else if (replicaState.isRolling) {
          replicaState.rollProgress += dt / 0.38;
          if (replicaState.rollProgress >= 1) {
            replicaState.rollProgress = 1;
            replicaState.isRolling = false;

            replicaPivotGroup.remove(replicaMesh);
            scene.add(replicaMesh);

            const step = currentHints[replicaState.stepIndex];
            replicaState.currentState = step.resultingState;
            syncReplicaMesh(replicaState.currentState);
            replicaState.stepIndex++;

            const isTarget =
              replicaState.currentState.x === propsRef.current.level.target.x &&
              replicaState.currentState.z === propsRef.current.level.target.z &&
              replicaState.currentState.orientation === BlockOrientation.UPRIGHT;

            if (isTarget) {
              // In goal state, animate replica fitting into the goal socket!
              replicaState.isEnteringGoal = true;
              replicaState.fallSpeed = 0;
            } else if (replicaState.stepIndex >= currentHints.length) {
              replicaState.pauseTimer = 1.3;
            } else {
              replicaState.pauseTimer = 0.25;
            }
          } else {
            const ease = 1 - Math.pow(1 - replicaState.rollProgress, 3);
            replicaPivotGroup.setRotationFromAxisAngle(
              replicaState.rollAxis,
              replicaState.rollAngle * ease
            );
          }
        } else if (replicaState.isEnteringGoal) {
          // Replica drops cleanly inside the socket without any black shadow
          replicaState.fallSpeed += 14 * dt;
          replicaMesh.position.y -= replicaState.fallSpeed * dt;
          replicaMesh.rotation.set(0, 0, 0);

          if (replicaMesh.position.y <= -1.8) {
            replicaState.pauseTimer = 1.3;
          }
        }
      } else {
        if (replicaMesh.visible) {
          replicaMesh.visible = false;
          if (replicaMesh.parent === replicaPivotGroup) {
            replicaPivotGroup.remove(replicaMesh);
            scene.add(replicaMesh);
          }
          replicaState.isRolling = false;
          replicaState.isEnteringGoal = false;
          lastPlayerStateKey = '';
        }
      }

      coinMeshes.forEach((mesh) => {
        mesh.rotation.z += 2.2 * dt;
        mesh.position.y = 0.45 + Math.sin(now * 0.004 + mesh.position.x) * 0.06;
      });

      targetRing.scale.setScalar(1 + Math.sin(now * 0.005) * 0.08);
      (targetRing.material as THREE.MeshBasicMaterial).opacity =
        0.5 + Math.sin(now * 0.005) * 0.3;

      // Update particles with physics (gravity, drag, wobble)
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          s.particles.splice(i, 1);
        } else {
          p.pos.addScaledVector(p.vel, dt);
          const grav = p.gravity !== undefined ? p.gravity : 3.5;
          p.vel.y -= grav * dt;
          if (p.drag) {
            p.vel.x *= Math.pow(p.drag, dt * 60);
            p.vel.z *= Math.pow(p.drag, dt * 60);
          }
          if (p.wobbleSpeed) {
            p.pos.x += Math.sin(now * 0.005 * p.wobbleSpeed) * 0.012;
            p.pos.z += Math.cos(now * 0.005 * p.wobbleSpeed) * 0.012;
          }
        }
      }

      // Animate 3D goal celebration shockwaves and beacon light pillar
      if (victoryAnim.active) {
        victoryAnim.progress += dt / 0.85;
        const p = Math.min(1, victoryAnim.progress);

        // Ring 1 (Gold shockwave): rapid expansion from 1.0 to 4.5
        const scale1 = 1.0 + Math.pow(p, 0.65) * 3.8;
        shockwave1Mesh.scale.set(scale1, scale1, 1);
        shockwave1Mat.opacity = Math.max(0, 1.0 - p * 1.15);

        // Ring 2 (Cyan shockwave): delayed expansion from 0.7 to 5.2
        const p2 = Math.max(0, (p - 0.08) / 0.92);
        const scale2 = 0.7 + Math.pow(p2, 0.65) * 4.5;
        shockwave2Mesh.scale.set(scale2, scale2, 1);
        shockwave2Mat.opacity = Math.max(0, 0.95 * (1.0 - p2 * 1.1));

        // Light beacon vertical pillar: expands slightly and dissolves
        const bScale = 1.0 + p * 0.35;
        beaconMesh.scale.set(bScale, 1, bScale);
        beaconCoreMesh.scale.set(bScale, 1, bScale);
        beaconMat.opacity = Math.max(0, 0.45 * (1.0 - Math.pow(p, 1.2)));
        beaconCoreMat.opacity = Math.max(0, 0.55 * (1.0 - Math.pow(p, 1.5)));

        if (p >= 1) {
          victoryAnim.active = false;
          shockwave1Mat.opacity = 0;
          shockwave2Mat.opacity = 0;
          beaconMat.opacity = 0;
          beaconCoreMat.opacity = 0;
          shockwave1Mesh.visible = false;
          shockwave2Mesh.visible = false;
          beaconMesh.visible = false;
          beaconCoreMesh.visible = false;
        }
      }

      const count = Math.min(s.particles.length, particleCount);
      for (let i = 0; i < count; i++) {
        const p = s.particles[i];
        particlePositions[i * 3] = p.pos.x;
        particlePositions[i * 3 + 1] = p.pos.y;
        particlePositions[i * 3 + 2] = p.pos.z;
        particleColors[i * 3] = p.color.r;
        particleColors[i * 3 + 1] = p.color.g;
        particleColors[i * 3 + 2] = p.color.b;
        particleSizes[i] = p.size * (1 - p.life / p.maxLife);
      }
      for (let i = count; i < particleCount; i++) {
        particleSizes[i] = 0;
      }
      particleGeo.attributes.position.needsUpdate = true;
      particleGeo.attributes.color.needsUpdate = true;
      particleGeo.attributes.size.needsUpdate = true;

      const desiredCamX = s.cameraTarget.x + isoDist;
      const desiredCamY = s.cameraTarget.y + isoDist * 1.25;
      const desiredCamZ = s.cameraTarget.z + isoDist;

      const camDamp = 1 - Math.exp(-6 * dt);
      camera.position.x += (desiredCamX - camera.position.x) * camDamp;
      camera.position.y += (desiredCamY - camera.position.y) * camDamp;
      camera.position.z += (desiredCamZ - camera.position.z) * camDamp;

      // Subtle camera micro-shake on goal landing for tactile physical weight
      if (s.camShake > 0.001) {
        camera.position.x += (Math.random() - 0.5) * s.camShake;
        camera.position.y += (Math.random() - 0.5) * s.camShake * 0.7;
        camera.position.z += (Math.random() - 0.5) * s.camShake;
        s.camShake *= Math.exp(-10 * dt);
      }

      const currentLookAt = new THREE.Vector3(
        camera.position.x - isoDist,
        camera.position.y - isoDist * 1.25,
        camera.position.z - isoDist
      );
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        animId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      animId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const newAspect = w / h;
      camera.left = (-frustumSize * newAspect) / 2;
      camera.right = (frustumSize * newAspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('touchstart', handleTouchStart);
      canvasEl.removeEventListener('touchend', handleTouchEnd);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      blockGeo.dispose();
      blockMat.dispose();
      whiteTileTopMat.dispose();
      sideMaterials.forEach((m) => m.dispose());
      shadowGeo.dispose();
      shadowMat.dispose();
      targetRingGeo.dispose();
      targetRingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      replicaMat.dispose();
      shockwave1Geo.dispose();
      shockwave1Mat.dispose();
      shockwave2Geo.dispose();
      shockwave2Mat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      beaconCoreGeo.dispose();
      beaconCoreMat.dispose();
      hintsGroupRef.current = null;
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full relative select-none touch-none" data-testid="game-canvas" />;
};
