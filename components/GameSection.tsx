import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, X as XIcon, Target, Flame, Timer } from 'lucide-react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { supabase } from '../src/lib/supabase';
import DOMPurify from 'isomorphic-dompurify';



const WEDDING_CLIENT_ID = 'd4df1eff-0675-42e3-adea-b7d6b129a321';
const GAME_DURATION = 60;
const HOOP_POS = { x: 0, y: 12.0, z: 5.0 };
const RING_RADIUS = 0.75;
const BALL_RADIUS = 0.5;
const PRAISE_PHRASES = ["Perfect!", "Swish!", "On Fire!", "Master!", "Bucket!", "Clean!", "Wow!", "Flawless!"];
const MISS_PHRASES = ["So Close!", "Try Again!", "Next Time!", "Just Missed!", "Keep Going!"];

function createBallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(190, 170, 15, 256, 256, 290);
    grad.addColorStop(0, '#F07825');
    grad.addColorStop(0.55, '#C85500');
    grad.addColorStop(1, '#7A2800');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#1a0400';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(512, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256, 0); ctx.bezierCurveTo(95, 128, 95, 384, 256, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(256, 0); ctx.bezierCurveTo(417, 128, 417, 384, 256, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 256); ctx.bezierCurveTo(128, 95, 384, 95, 512, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 256); ctx.bezierCurveTo(128, 417, 384, 417, 512, 256); ctx.stroke();
    // Subtle grain
    for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
        ctx.beginPath(); ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

function createCourtTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const W = 1024, H = 1024;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0e0e0e';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;
    // Key area - subtle warm tint
    ctx.fillStyle = 'rgba(180,80,20,0.07)';
    ctx.fillRect(cx - 175, 90, 350, 370);
    // Court lines
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 5;
    ctx.strokeRect(cx - 175, 90, 350, 370);
    ctx.beginPath(); ctx.moveTo(cx - 175, 460); ctx.lineTo(cx + 175, 460); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 460, 175, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 200, 420, 0.22, Math.PI - 0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 378, 90); ctx.lineTo(cx - 378, 310); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 378, 90); ctx.lineTo(cx + 378, 310); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 120, 55, 0, Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 120, 35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,140,50,0.85)'; ctx.lineWidth = 5; ctx.stroke();
    // Center court
    ctx.beginPath(); ctx.arc(cx, H - 110, 110, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, H - 110, 40, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3; ctx.stroke();
    // S & S monogram
    ctx.save();
    ctx.font = 'bold italic 68px Georgia, serif';
    ctx.fillStyle = 'rgba(255,180,50,0.1)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('S & S', cx, H - 110);
    ctx.restore();
    return new THREE.CanvasTexture(canvas);
}

const Confetti: React.FC = () => {
    const particles = Array.from({ length: 60 });
    return (
        <div className="fixed inset-0 z-[300] pointer-events-none">
            {particles.map((_, i) => (
                <motion.div key={i}
                    initial={{ x: window.innerWidth / 2, y: window.innerHeight / 2, opacity: 1, scale: 1 }}
                    animate={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0, scale: 0, rotate: Math.random() * 360 }}
                    transition={{ duration: 1.5 + Math.random(), ease: "easeOut" }}
                    className="absolute w-3 h-3 rounded-full"
                    style={{ backgroundColor: ['#FFD700', '#B76E79', '#D4AF37', '#ff8844'][Math.floor(Math.random() * 4)] }}
                />
            ))}
        </div>
    );
};

interface Player { id?: number; name: string; score: number; title: string; side: 'bride' | 'groom' | 'neutral'; }
interface TeamStats { bridePercent: number; groomPercent: number; brideTotal: number; groomTotal: number; bridePlayers: number; groomPlayers: number; }

// --- 3D Canvas Scoreboard Texture Renderer (Realistic LED Arena Board) ---
function renderScoreboardTexture(
    canvas: HTMLCanvasElement,
    teamStats: TeamStats,
    currentScore: number,
    playerSide: 'bride' | 'groom' | null,
    streak: number
) {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;

    // === LAYER 1: Deep matte black background with subtle noise ===
    ctx.clearRect(0, 0, w, h);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0a12');
    bgGrad.addColorStop(0.5, '#060610');
    bgGrad.addColorStop(1, '#04040a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle noise texture
    for (let i = 0; i < 300; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
        ctx.fillRect(nx, ny, 1, 1);
    }

    // === LAYER 2: Inner bezel (recessed screen area) ===
    const bezelInset = 8;
    const screenGrad = ctx.createLinearGradient(0, bezelInset, 0, h - bezelInset);
    screenGrad.addColorStop(0, '#0c0c18');
    screenGrad.addColorStop(1, '#080812');
    ctx.fillStyle = screenGrad;
    ctx.beginPath();
    ctx.roundRect(bezelInset, bezelInset, w - bezelInset * 2, h - bezelInset * 2, 4);
    ctx.fill();

    // Inner shadow (top/left = lighter, bottom/right = darker for 3D depth)
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bezelInset, bezelInset, w - bezelInset * 2, h - bezelInset * 2, 4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bezelInset + 4, bezelInset + 1);
    ctx.lineTo(w - bezelInset - 4, bezelInset + 1);
    ctx.stroke();

    // === LAYER 3: Title bar with metallic gradient ===
    const titleBarH = 44;
    const titleGrad = ctx.createLinearGradient(bezelInset, bezelInset, bezelInset, bezelInset + titleBarH);
    titleGrad.addColorStop(0, 'rgba(255, 180, 0, 0.15)');
    titleGrad.addColorStop(0.5, 'rgba(255, 200, 50, 0.08)');
    titleGrad.addColorStop(1, 'rgba(255, 150, 0, 0.03)');
    ctx.fillStyle = titleGrad;
    ctx.fillRect(bezelInset + 1, bezelInset + 1, w - bezelInset * 2 - 2, titleBarH);

    // Title text with glow
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SANSAM SHOWDOWN', w / 2, bezelInset + 30);
    ctx.restore();

    // Title underline
    const ulGrad = ctx.createLinearGradient(40, 0, w - 40, 0);
    ulGrad.addColorStop(0, 'transparent');
    ulGrad.addColorStop(0.3, 'rgba(255, 215, 0, 0.5)');
    ulGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.8)');
    ulGrad.addColorStop(0.7, 'rgba(255, 215, 0, 0.5)');
    ulGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = ulGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, bezelInset + titleBarH);
    ctx.lineTo(w - 30, bezelInset + titleBarH);
    ctx.stroke();

    // === LAYER 4: Team score panels ===
    const teamY = bezelInset + titleBarH + 12;
    const panelH = 100;
    const panelGap = 8;
    const panelW = (w - bezelInset * 2 - panelGap * 3) / 2;

    // --- Team San panel (left, pink glow) ---
    const sanX = bezelInset + panelGap;
    const sanGrad = ctx.createLinearGradient(sanX, teamY, sanX, teamY + panelH);
    sanGrad.addColorStop(0, 'rgba(255, 80, 130, 0.12)');
    sanGrad.addColorStop(1, 'rgba(180, 50, 90, 0.04)');
    ctx.fillStyle = sanGrad;
    ctx.beginPath(); ctx.roundRect(sanX, teamY, panelW, panelH, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 107, 138, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(sanX, teamY, panelW, panelH, 3); ctx.stroke();

    // Top accent bar
    ctx.fillStyle = '#ff6b8a';
    ctx.fillRect(sanX + 2, teamY, panelW - 4, 2);

    // Team San label
    ctx.save();
    ctx.shadowColor = '#ff6b8a';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ff6b8a';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEAM SAN', sanX + panelW / 2, teamY + 20);
    ctx.restore();

    // Score (large LED digits)
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(teamStats.brideTotal), sanX + panelW / 2, teamY + 72);
    ctx.restore();

    // Player count
    ctx.fillStyle = 'rgba(255, 107, 138, 0.5)';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${teamStats.bridePlayers} player${teamStats.bridePlayers !== 1 ? 's' : ''}`, sanX + panelW / 2, teamY + 92);

    // --- Team Sam panel (right, blue glow) ---
    const samX = sanX + panelW + panelGap;
    const samGrad = ctx.createLinearGradient(samX, teamY, samX, teamY + panelH);
    samGrad.addColorStop(0, 'rgba(80, 140, 255, 0.12)');
    samGrad.addColorStop(1, 'rgba(50, 90, 180, 0.04)');
    ctx.fillStyle = samGrad;
    ctx.beginPath(); ctx.roundRect(samX, teamY, panelW, panelH, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(91, 157, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(samX, teamY, panelW, panelH, 3); ctx.stroke();

    // Top accent bar
    ctx.fillStyle = '#5b9dff';
    ctx.fillRect(samX + 2, teamY, panelW - 4, 2);

    // Team Sam label
    ctx.save();
    ctx.shadowColor = '#5b9dff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#5b9dff';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEAM SAM', samX + panelW / 2, teamY + 20);
    ctx.restore();

    // Score (large LED digits)
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(teamStats.groomTotal), samX + panelW / 2, teamY + 72);
    ctx.restore();

    // Player count
    ctx.fillStyle = 'rgba(91, 157, 255, 0.5)';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${teamStats.groomPlayers} player${teamStats.groomPlayers !== 1 ? 's' : ''}`, samX + panelW / 2, teamY + 92);

    // --- VS indicator (centered between panels) ---
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VS', w / 2, teamY + panelH / 2 + 6);
    ctx.restore();

    // === LAYER 5: Battle bar ===
    const barY = teamY + panelH + 14;
    const barW = w - bezelInset * 2 - panelGap * 2;
    const barH = 12;
    const barX = bezelInset + panelGap;

    // Bar track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 6); ctx.stroke();

    // Pink fill
    const pinkWidth = (teamStats.bridePercent / 100) * barW;
    if (pinkWidth > 0) {
        const pGrad = ctx.createLinearGradient(barX, barY, barX + pinkWidth, barY);
        pGrad.addColorStop(0, '#a83279');
        pGrad.addColorStop(1, '#ff6b8a');
        ctx.fillStyle = pGrad;
        ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(pinkWidth, 6), barH, 6); ctx.fill();
    }
    // Blue fill
    const blueWidth = (teamStats.groomPercent / 100) * barW;
    if (blueWidth > 0) {
        const bGrad = ctx.createLinearGradient(barX + barW - blueWidth, barY, barX + barW, barY);
        bGrad.addColorStop(0, '#5b9dff');
        bGrad.addColorStop(1, '#1d4fbf');
        ctx.fillStyle = bGrad;
        ctx.beginPath(); ctx.roundRect(barX + barW - Math.max(blueWidth, 6), barY, Math.max(blueWidth, 6), barH, 6); ctx.fill();
    }

    // Percentage labels
    ctx.fillStyle = 'rgba(255, 107, 138, 0.7)';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${teamStats.bridePercent}%`, barX, barY + barH + 14);
    ctx.fillStyle = 'rgba(91, 157, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(`${teamStats.groomPercent}%`, barX + barW, barY + barH + 14);

    // === LAYER 6: Current player score section ===
    const scoreY = barY + barH + 30;

    // Divider
    const divGrad = ctx.createLinearGradient(30, 0, w - 30, 0);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, scoreY - 6); ctx.lineTo(w - 30, scoreY - 6); ctx.stroke();

    // YOUR SCORE label
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YOUR SCORE', w / 2, scoreY + 10);

    // Big score number with golden glow
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(currentScore), w / 2, scoreY + 68);
    ctx.restore();

    // Streak fire effect
    if (streak >= 2) {
        ctx.save();
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff8800';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${streak}x STREAK`, w / 2, scoreY + 92);
        ctx.restore();
    }

    // === LAYER 7: LED Scanlines overlay (the key realistic touch) ===
    ctx.globalCompositeOperation = 'overlay';
    for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, y, w, 1);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Subtle CRT vignette
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);
}

interface BasketballSceneProps {
    onScore: () => void;
    onMiss: () => void;
    gameActive: boolean;
    onStreakUpdate: (streak: number) => void;
    teamStats: TeamStats;
    currentScore: number;
    playerSide: 'bride' | 'groom' | null;
    currentStreak: number;
}

const BasketballScene: React.FC<BasketballSceneProps> = ({ onScore, onMiss, gameActive, onStreakUpdate, teamStats, currentScore, playerSide, currentStreak }) => {
    const { scene, camera, gl } = useThree();
    const worldRef = useRef<CANNON.World | null>(null);
    const currentBallRef = useRef<any>(null);
    const activeBallsRef = useRef<any[]>([]);
    const aimLineRef = useRef<THREE.Line | null>(null);
    const arcPointsRef = useRef<THREE.Points | null>(null);
    const hoopTargetRef = useRef<THREE.Mesh | null>(null);
    const hoopTargetGreenRef = useRef(true);
    const controlsRef = useRef<any>(null);
    const netParticlesRef = useRef<CANNON.Body[]>([]);
    const netLinesGeoRef = useRef<THREE.BufferGeometry | null>(null);
    const physMaterialRef = useRef<CANNON.Material | null>(null);
    const netMaterialRef = useRef<CANNON.Material | null>(null);
    const ringMeshRef = useRef<THREE.Mesh | null>(null);
    const ringFlashRef = useRef(0);
    const particleBurstsRef = useRef<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[]>([]);
    const consecutiveRef = useRef(0);
    const ballLightRef = useRef<THREE.PointLight | null>(null);
    const dustMotesRef = useRef<{ geo: THREE.BufferGeometry; positions: Float32Array; velocities: Float32Array } | null>(null);
    const scoreboardTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const scoreboardCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const scoreboardMeshRef = useRef<THREE.Mesh | null>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const shotTakenRef = useRef(false);
    const isCameraAnimatingRef = useRef(false);
    const cameraTargetPosRef = useRef(new THREE.Vector3());
    const controlsTargetPosRef = useRef(new THREE.Vector3());
    const gameActiveRef = useRef(gameActive);
    useEffect(() => { gameActiveRef.current = gameActive; }, [gameActive]);

    const createPhysicalRing = useCallback((world: CANNON.World, y: number, z: number, radius: number, mat: CANNON.Material) => {
        const segments = 16;
        const step = (Math.PI * 2) / segments;
        for (let i = 0; i < segments; i++) {
            const angle = step * i;
            const b = new CANNON.Body({ mass: 0, material: mat });
            b.addShape(new CANNON.Box(new CANNON.Vec3(0.04, 0.04, 0.1)));
            b.position.set(Math.cos(angle) * radius, y, z + Math.sin(angle) * radius);
            b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
            world.addBody(b);
        }
    }, []);

    const createNet = useCallback((world: CANNON.World, cx: number, cy: number, cz: number, radius: number, netMat: CANNON.Material) => {
        const cols = 14, rows = 6;
        const particles: CANNON.Body[] = [];
        const startRad = radius * 0.95;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const angle = (c / cols) * Math.PI * 2;
                const curRad = startRad - (r * 0.065);
                const mass = (r === 0) ? 0 : 0.03;
                const b = new CANNON.Body({ mass, shape: new CANNON.Sphere(0.08), material: netMat, linearDamping: 0.05 });
                b.position.set(cx + Math.cos(angle) * curRad, cy - (r * 0.25), cz + Math.sin(angle) * curRad);
                b.collisionFilterGroup = 2; b.collisionFilterMask = 1;
                world.addBody(b);
                particles.push(b);
            }
        }
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const body = particles[r * cols + c];
                const right = particles[r * cols + ((c + 1) % cols)];
                world.addConstraint(new CANNON.DistanceConstraint(body, right, body.position.distanceTo(right.position)));
                if (r < rows - 1) {
                    const down = particles[(r + 1) * cols + c];
                    world.addConstraint(new CANNON.DistanceConstraint(body, down, body.position.distanceTo(down.position)));
                }
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rows * cols * 2 * 2 * 3), 3));
        const netMesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xeeeeee, opacity: 0.75, transparent: true }));
        scene.add(netMesh);
        netParticlesRef.current = particles;
        netLinesGeoRef.current = geo;
    }, [scene]);

    const setCameraTarget = useCallback((ballPos: THREE.Vector3) => {
        const dir = new THREE.Vector3().subVectors(new THREE.Vector3(ballPos.x, 0, ballPos.z), new THREE.Vector3(HOOP_POS.x, 0, HOOP_POS.z)).normalize();
        cameraTargetPosRef.current.copy(ballPos).add(dir.multiplyScalar(11));
        cameraTargetPosRef.current.y = ballPos.y + 1.5;
        controlsTargetPosRef.current.set(HOOP_POS.x, HOOP_POS.y - 4, HOOP_POS.z);
        isCameraAnimatingRef.current = true;
    }, []);

    const spawnNewBall = useCallback(() => {
        if (!worldRef.current || !physMaterialRef.current) return;
        const randX = (Math.random() - 0.5) * 12;
        const randY = 8 + Math.random() * 4;
        const randZ = 8 + Math.random() * 6;
        const spawnPos = new THREE.Vector3(randX, randY, randZ);
        const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
        const ballMat = new THREE.MeshStandardMaterial({ map: createBallTexture(), roughness: 0.6, metalness: 0.05 });
        const mesh = new THREE.Mesh(ballGeo, ballMat);
        mesh.castShadow = true;
        const hitMesh = new THREE.Mesh(
            new THREE.SphereGeometry(BALL_RADIUS * 3.0, 16, 16),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
        );
        hitMesh.userData.isHitbox = true;
        mesh.add(hitMesh);
        scene.add(mesh);
        const body = new CANNON.Body({ mass: 0.6, shape: new CANNON.Sphere(BALL_RADIUS), material: physMaterialRef.current });
        body.linearDamping = 0.1;
        body.position.copy(spawnPos as any);
        body.type = CANNON.Body.STATIC;
        body.collisionFilterGroup = 1;
        body.collisionFilterMask = 1 | 2;
        mesh.position.copy(body.position as any);
        worldRef.current.addBody(body);
        currentBallRef.current = { mesh, body, scored: false, enteredRim: false, missedCalled: false };
        shotTakenRef.current = false;
        setCameraTarget(spawnPos);
    }, [scene, setCameraTarget]);

    const throwBall = useCallback((dragVector: { x: number; y: number }) => {
        if (!currentBallRef.current || shotTakenRef.current) return;
        const b = currentBallRef.current;
        b.body.type = CANNON.Body.DYNAMIC;
        b.body.wakeUp();
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0; camDir.normalize();
        const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
        b.body.velocity.set(
            (camDir.x * (6 + dragVector.y * 0.025)) + (camRight.x * dragVector.x * 0.04),
            11 + dragVector.y * 0.030,
            (camDir.z * (6 + dragVector.y * 0.025)) + (camRight.z * dragVector.x * 0.04)
        );
        b.body.angularVelocity.set(-Math.random() * 10, 0, (Math.random() - 0.5) * 5);
        activeBallsRef.current.push(b);
        currentBallRef.current = null;
        shotTakenRef.current = true;
        if (controlsRef.current) controlsRef.current.enabled = true;
        setTimeout(() => { if (gameActiveRef.current) spawnNewBall(); }, 1500);
    }, [camera, spawnNewBall]);

    const spawnBurstParticles = useCallback((pos: THREE.Vector3) => {
        const colors = [0xFFD700, 0xFF8800, 0xFF5500, 0xFFFFFF, 0xB76E79, 0xFFA500, 0xFFEE00];
        for (let i = 0; i < 40; i++) {
            const geo = new THREE.SphereGeometry(0.07 + Math.random() * 0.12, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            scene.add(mesh);
            const speed = 3 + Math.random() * 8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            particleBurstsRef.current.push({
                mesh, life: 1.0,
                vel: new THREE.Vector3(Math.sin(phi) * Math.cos(theta) * speed, Math.random() * 9 + 5, Math.sin(phi) * Math.sin(theta) * speed)
            });
        }
    }, [scene]);

    const checkGoals = useCallback(() => {
        for (const ball of activeBallsRef.current) {
            if (ball.scored) continue;
            const bPos = ball.mesh.position;
            const dist = Math.sqrt((bPos.x - HOOP_POS.x) ** 2 + (bPos.z - HOOP_POS.z) ** 2);
            if (dist < RING_RADIUS * 0.9) {
                if (bPos.y > HOOP_POS.y) ball.enteredRim = true;
                if (bPos.y < HOOP_POS.y && bPos.y > HOOP_POS.y - 1.0 && ball.enteredRim) {
                    ball.scored = true;
                    spawnBurstParticles(new THREE.Vector3(HOOP_POS.x, HOOP_POS.y, HOOP_POS.z));
                    ringFlashRef.current = 1.0;
                    consecutiveRef.current += 1;
                    onStreakUpdate(consecutiveRef.current);
                    setTimeout(() => { onScore(); }, 1000);
                }
            }
            if (!ball.missedCalled && !ball.enteredRim && bPos.y < -0.5 && !ball.scored) {
                ball.missedCalled = true;
                consecutiveRef.current = 0;
                onStreakUpdate(0);
                onMiss();
            }
        }
    }, [onScore, onMiss, onStreakUpdate, spawnBurstParticles]);

    useEffect(() => {
        const world = new CANNON.World();
        world.gravity.set(0, -20, 0);
        world.broadphase = new CANNON.SAPBroadphase(world);
        (world.solver as any).iterations = 50;
        const physMaterial = new CANNON.Material("phys");
        const netMaterial = new CANNON.Material("net");
        world.addContactMaterial(new CANNON.ContactMaterial(physMaterial, physMaterial, { friction: 0.1, restitution: 0.6 }));
        world.addContactMaterial(new CANNON.ContactMaterial(physMaterial, netMaterial, { friction: 0.01, restitution: 0.0 }));
        physMaterialRef.current = physMaterial;
        netMaterialRef.current = netMaterial;
        worldRef.current = world;

        // Outer dark floor
        const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 }));
        floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);

        // Court with markings
        const courtMesh = new THREE.Mesh(new THREE.PlaneGeometry(32, 28), new THREE.MeshStandardMaterial({ map: createCourtTexture(), roughness: 0.88 }));
        courtMesh.rotation.x = -Math.PI / 2;
        courtMesh.position.set(0, 0.008, HOOP_POS.z + 7);
        courtMesh.receiveShadow = true; scene.add(courtMesh);

        const floorBody = new CANNON.Body({ mass: 0, material: physMaterial });
        floorBody.addShape(new CANNON.Plane());
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        world.addBody(floorBody);

        // Glass backboard
        const boardW = 3.6, boardH = 2.6, boardD = 0.08;
        const boardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(boardW, boardH, boardD),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.0, metalness: 0.05, transparent: true, opacity: 0.55 })
        );
        boardMesh.position.set(0, HOOP_POS.y + 1.3, HOOP_POS.z - 1.2);
        boardMesh.castShadow = true; boardMesh.receiveShadow = true; scene.add(boardMesh);

        // Board frame
        const frameGeo = new THREE.BoxGeometry(boardW + 0.1, boardH + 0.1, 0.06);
        const frameMesh = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.2, transparent: true, opacity: 0.8 }));
        frameMesh.position.copy(boardMesh.position);
        frameMesh.position.z -= 0.01;
        scene.add(frameMesh);

        // Target square on board
        const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.01), new THREE.MeshBasicMaterial({ color: 0xff4400, wireframe: true }));
        targetMesh.position.set(0, HOOP_POS.y + 0.5, HOOP_POS.z - 1.12); scene.add(targetMesh);

        const boardBody = new CANNON.Body({ mass: 0, material: physMaterial });
        boardBody.addShape(new CANNON.Box(new CANNON.Vec3(boardW / 2, boardH / 2, boardD / 2)));
        boardBody.position.copy(boardMesh.position as any); world.addBody(boardBody);

        // Support pole
        const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 14, 8), new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.85, roughness: 0.15 }));
        poleMesh.position.set(0, 7, HOOP_POS.z - 1.5); poleMesh.castShadow = true; scene.add(poleMesh);

        // Ring (metallic orange)
        const ringMesh = new THREE.Mesh(
            new THREE.TorusGeometry(RING_RADIUS, 0.055, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.25, metalness: 0.6 })
        );
        ringMesh.position.set(0, HOOP_POS.y, HOOP_POS.z);
        ringMesh.rotation.x = Math.PI / 2; ringMesh.castShadow = true; scene.add(ringMesh);
        ringMeshRef.current = ringMesh;

        // Ring arm (connects board to ring)
        const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 }));
        armMesh.position.set(0, HOOP_POS.y - 0.1, HOOP_POS.z - 0.6);
        armMesh.rotation.x = Math.PI / 2; scene.add(armMesh);

        createPhysicalRing(world, HOOP_POS.y, HOOP_POS.z, RING_RADIUS, physMaterial);
        createNet(world, 0, HOOP_POS.y, HOOP_POS.z, RING_RADIUS, netMaterial);

        // Aim line
        const aimLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
            new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3, depthTest: false, depthWrite: false })
        );
        aimLine.renderOrder = 999; aimLine.visible = false; scene.add(aimLine);
        aimLineRef.current = aimLine;

        // Arc predictor with vertex colors (50 points pre-allocated)
        const MAX_ARC = 50;
        const arcGeo = new THREE.BufferGeometry();
        arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_ARC * 3), 3));
        arcGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_ARC * 3), 3));
        arcGeo.setDrawRange(0, 0);
        const arcPts = new THREE.Points(arcGeo, new THREE.PointsMaterial({ vertexColors: true, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.92, depthTest: false }));
        arcPts.visible = false; arcPts.renderOrder = 998; scene.add(arcPts);
        arcPointsRef.current = arcPts;

        // Hoop target ring (shows while aiming)
        const hoopTarget = new THREE.Mesh(
            new THREE.RingGeometry(0.3, RING_RADIUS * 0.98, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthTest: false })
        );
        hoopTarget.position.set(HOOP_POS.x, HOOP_POS.y + 0.06, HOOP_POS.z);
        hoopTarget.rotation.x = Math.PI / 2;
        hoopTarget.visible = false; hoopTarget.renderOrder = 997; scene.add(hoopTarget);
        hoopTargetRef.current = hoopTarget;

        // Arena main spotlight
        const spotLight = new THREE.SpotLight(0xfff6e8, 6);
        spotLight.position.set(0, 36, HOOP_POS.z);
        spotLight.angle = Math.PI / 7; spotLight.penumbra = 0.3; spotLight.decay = 1.3; spotLight.castShadow = true;
        spotLight.shadow.mapSize.set(1024, 1024);
        scene.add(spotLight);
        const spotTarget = new THREE.Object3D();
        spotTarget.position.set(0, HOOP_POS.y - 2, HOOP_POS.z); scene.add(spotTarget);
        spotLight.target = spotTarget;

        // Side fill spots
        const spotL = new THREE.SpotLight(0xffccdd, 1.8);
        spotL.position.set(-14, 28, HOOP_POS.z + 5); spotL.angle = Math.PI / 8; spotL.penumbra = 0.6; spotL.decay = 1.7;
        scene.add(spotL);
        const sideTarget = new THREE.Object3D(); sideTarget.position.set(0, 0, HOOP_POS.z + 5); scene.add(sideTarget);
        spotL.target = sideTarget;
        const spotR = new THREE.SpotLight(0xccddff, 1.8);
        spotR.position.set(14, 28, HOOP_POS.z + 5); spotR.angle = Math.PI / 8; spotR.penumbra = 0.6; spotR.decay = 1.7;
        scene.add(spotR); spotR.target = sideTarget;

        // Team color atmosphere lights
        const sanLight = new THREE.PointLight(0xff6688, 0.6, 28);
        sanLight.position.set(-16, 6, 12); scene.add(sanLight);
        const samLight = new THREE.PointLight(0x4466ff, 0.6, 28);
        samLight.position.set(16, 6, 12); scene.add(samLight);

        // Hoop glow
        const hoopGlow = new THREE.PointLight(0xff5500, 1.0, 5);
        hoopGlow.position.set(HOOP_POS.x, HOOP_POS.y - 0.3, HOOP_POS.z); scene.add(hoopGlow);

        // Ball follower light
        const ballLight = new THREE.PointLight(0xff8833, 2.0, 16);
        ballLight.position.set(0, 10, 10); scene.add(ballLight);
        ballLightRef.current = ballLight;

        // Dust motes in spotlight beam
        const dustCount = 220;
        const dustPos = new Float32Array(dustCount * 3);
        const dustVel = new Float32Array(dustCount);
        for (let i = 0; i < dustCount; i++) {
            dustPos[i * 3] = (Math.random() - 0.5) * 10;
            dustPos[i * 3 + 1] = Math.random() * 32;
            dustPos[i * 3 + 2] = HOOP_POS.z + (Math.random() - 0.5) * 9;
            dustVel[i] = 0.007 + Math.random() * 0.022;
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xfff8e8, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.25 }));
        scene.add(dustPts);
        dustMotesRef.current = { geo: dustGeo, positions: dustPos, velocities: dustVel };

        // --- 3D Scoreboard Panel (to the right of the backboard) ---
        const sbCanvas = document.createElement('canvas');
        sbCanvas.width = 512;
        sbCanvas.height = 400;
        scoreboardCanvasRef.current = sbCanvas;

        const sbTexture = new THREE.CanvasTexture(sbCanvas);
        sbTexture.minFilter = THREE.LinearFilter;
        sbTexture.magFilter = THREE.LinearFilter;
        scoreboardTextureRef.current = sbTexture;

        // Physical panel — positioned to the right of the backboard
        const panelW = 4.2, panelH = 3.3;
        const panelMesh = new THREE.Mesh(
            new THREE.BoxGeometry(panelW, panelH, 0.12),
            [
                new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.8, metalness: 0.3 }), // right
                new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.8, metalness: 0.3 }), // left
                new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.8, metalness: 0.3 }), // top
                new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.8, metalness: 0.3 }), // bottom
                new THREE.MeshStandardMaterial({ map: sbTexture, emissive: 0xffffff, emissiveMap: sbTexture, emissiveIntensity: 0.6, roughness: 0.5 }), // front face — the LED screen
                new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.9, metalness: 0.2 }), // back
            ]
        );
        panelMesh.position.set(4.8, HOOP_POS.y + 1.3, HOOP_POS.z - 1.2);
        panelMesh.castShadow = true;
        panelMesh.receiveShadow = true;
        scene.add(panelMesh);
        scoreboardMeshRef.current = panelMesh;

        // Frame around the panel
        const sbFrame = new THREE.Mesh(
            new THREE.BoxGeometry(panelW + 0.15, panelH + 0.15, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.8, roughness: 0.15 })
        );
        sbFrame.position.copy(panelMesh.position);
        sbFrame.position.z -= 0.02;
        scene.add(sbFrame);

        // Subtle glow light for the scoreboard
        const sbLight = new THREE.PointLight(0xFFD700, 0.4, 8);
        sbLight.position.set(panelMesh.position.x, panelMesh.position.y, panelMesh.position.z + 0.5);
        scene.add(sbLight);

        // Support bracket
        const bracketMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, panelH + 0.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.2 })
        );
        bracketMesh.position.set(panelMesh.position.x - panelW / 2 - 0.1, panelMesh.position.y, panelMesh.position.z - 0.1);
        scene.add(bracketMesh);

        spawnNewBall();
    }, [scene, createPhysicalRing, createNet, spawnNewBall]);

    useEffect(() => {
        const canvas = gl.domElement;

        // --- Shared coordinate extraction ---
        const getClientXY = (e: MouseEvent | TouchEvent): { clientX: number; clientY: number } | null => {
            if ('touches' in e) {
                if (e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
                if (e.changedTouches.length > 0) return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
                return null;
            }
            return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
        };

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!currentBallRef.current) return;
            const coords = getClientXY(e);
            if (!coords) return;
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
            raycasterRef.current.setFromCamera(mouseRef.current, camera);

            if (isDraggingRef.current) {
                // Prevent page scroll while dragging the ball on mobile
                if ('touches' in e) e.preventDefault();

                const dx = coords.clientX - dragStartRef.current.x;
                const dy = coords.clientY - dragStartRef.current.y;
                const start = currentBallRef.current.mesh.position;
                if (aimLineRef.current) {
                    const pos = aimLineRef.current.geometry.attributes.position.array as Float32Array;
                    pos[0] = start.x; pos[1] = start.y; pos[2] = start.z;
                    pos[3] = start.x + dx * 0.01; pos[4] = start.y - dy * 0.01; pos[5] = start.z;
                    aimLineRef.current.geometry.attributes.position.needsUpdate = true;
                    aimLineRef.current.visible = true;
                }

                if (arcPointsRef.current && dy > 0) {
                    const arcDy = dy;
                    const arcDx = dragStartRef.current.x - coords.clientX;
                    const fwd = 6 + arcDy * 0.025;
                    const up = 11 + arcDy * 0.030;
                    const side = arcDx * 0.04;
                    const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
                    const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

                    let px = start.x, py = start.y, pz = start.z;
                    let vx = camDir.x * fwd + camRight.x * side;
                    let vy = up;
                    let vz = camDir.z * fwd + camRight.z * side;

                    const posArr = arcPointsRef.current.geometry.attributes.position.array as Float32Array;
                    const colorArr = arcPointsRef.current.geometry.attributes.color.array as Float32Array;
                    const dt = 0.055;
                    let count = 0;
                    let nearHoop = false;

                    for (let i = 0; i < 50; i++) {
                        vy += -20 * dt;
                        px += vx * dt; py += vy * dt; pz += vz * dt;
                        if (py < -5) break;
                        posArr[count * 3] = px; posArr[count * 3 + 1] = py; posArr[count * 3 + 2] = pz;
                        const d = Math.sqrt((px - HOOP_POS.x) ** 2 + (pz - HOOP_POS.z) ** 2);
                        const atHoop = d < RING_RADIUS * 1.15 && Math.abs(py - HOOP_POS.y) < 1.0;
                        if (d < RING_RADIUS * 0.95 && Math.abs(py - HOOP_POS.y) < 0.8) nearHoop = true;
                        // Vertex colors: gradient from bright gold → orange, green at hoop
                        const t = i / 49;
                        if (atHoop && nearHoop) {
                            colorArr[count * 3] = 0.1; colorArr[count * 3 + 1] = 1.0; colorArr[count * 3 + 2] = 0.5;
                        } else if (atHoop) {
                            colorArr[count * 3] = 1.0; colorArr[count * 3 + 1] = 0.2; colorArr[count * 3 + 2] = 0.1;
                        } else {
                            colorArr[count * 3] = 1.0; colorArr[count * 3 + 1] = Math.max(0.35, 0.9 - t * 0.55); colorArr[count * 3 + 2] = Math.max(0, 0.35 - t * 0.35);
                        }
                        count++;
                    }

                    (arcPointsRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
                    (arcPointsRef.current.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
                    arcPointsRef.current.geometry.setDrawRange(0, count);
                    arcPointsRef.current.visible = true;

                    if (hoopTargetRef.current) {
                        hoopTargetGreenRef.current = nearHoop;
                        (hoopTargetRef.current.material as THREE.MeshBasicMaterial).color.setHex(nearHoop ? 0x00ff88 : 0xff3311);
                        hoopTargetRef.current.visible = true;
                    }
                } else {
                    if (arcPointsRef.current) arcPointsRef.current.visible = false;
                    if (hoopTargetRef.current) hoopTargetRef.current.visible = false;
                }
            } else {
                // On mobile, auto-detect if touch is on the ball (no hover state)
                const intersects = raycasterRef.current.intersectObject(currentBallRef.current.mesh, true);
                if (intersects.length > 0) {
                    canvas.style.cursor = 'pointer';
                    if (controlsRef.current) controlsRef.current.enabled = false;
                } else {
                    canvas.style.cursor = 'default';
                    if (!isDraggingRef.current && controlsRef.current) controlsRef.current.enabled = true;
                }
            }
        };

        const onDown = (e: MouseEvent | TouchEvent) => {
            // For mouse events, only respond to left click
            if ('button' in e && e.button !== 0) return;

            const coords = getClientXY(e);
            if (!coords) return;

            // For touch events, do a raycast first to check if we're touching the ball
            if ('touches' in e && currentBallRef.current) {
                const rect = canvas.getBoundingClientRect();
                mouseRef.current.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
                mouseRef.current.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
                raycasterRef.current.setFromCamera(mouseRef.current, camera);
                const intersects = raycasterRef.current.intersectObject(currentBallRef.current.mesh, true);
                if (intersects.length > 0) {
                    if (controlsRef.current) controlsRef.current.enabled = false;
                    isDraggingRef.current = true;
                    dragStartRef.current = { x: coords.clientX, y: coords.clientY };
                    canvas.style.cursor = 'grabbing';
                    e.preventDefault(); // Prevent scroll when starting to drag the ball
                }
            } else if (controlsRef.current && controlsRef.current.enabled === false && currentBallRef.current) {
                // Mouse path (hover already disabled controls)
                isDraggingRef.current = true;
                dragStartRef.current = { x: coords.clientX, y: coords.clientY };
                canvas.style.cursor = 'grabbing';
            }
        };

        const onUp = (e: MouseEvent | TouchEvent) => {
            // For mouse events, only respond to left click
            if ('button' in e && (e as MouseEvent).button !== 0) return;

            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                if (aimLineRef.current) aimLineRef.current.visible = false;
                if (arcPointsRef.current) arcPointsRef.current.visible = false;
                if (hoopTargetRef.current) hoopTargetRef.current.visible = false;
                canvas.style.cursor = 'default';

                const coords = getClientXY(e);
                if (coords) {
                    const dy = coords.clientY - dragStartRef.current.y;
                    const dx = dragStartRef.current.x - coords.clientX;
                    if (dy > 0) { throwBall({ x: dx, y: dy }); }
                    else if (controlsRef.current) controlsRef.current.enabled = true;
                } else if (controlsRef.current) {
                    controlsRef.current.enabled = true;
                }
            }
        };

        // Mouse events (desktop)
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mouseup', onUp);

        // Touch events (mobile) — passive: false so we can preventDefault to stop scroll
        canvas.addEventListener('touchstart', onDown, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onUp, { passive: false });
        canvas.addEventListener('touchcancel', onUp, { passive: false });

        return () => {
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mousedown', onDown);
            canvas.removeEventListener('mouseup', onUp);
            canvas.removeEventListener('touchstart', onDown);
            canvas.removeEventListener('touchmove', onMove);
            canvas.removeEventListener('touchend', onUp);
            canvas.removeEventListener('touchcancel', onUp);
        };
    }, [camera, gl, throwBall]);

    const updateNet = useCallback(() => {
        const geo = netLinesGeoRef.current;
        const particles = netParticlesRef.current;
        if (!geo || particles.length === 0) return;
        const cols = 14, rows = 6;
        const pos = geo.attributes.position.array as Float32Array;
        let ptr = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const b = particles[r * cols + c]; const rb = particles[r * cols + ((c + 1) % cols)];
                pos[ptr++] = b.position.x; pos[ptr++] = b.position.y; pos[ptr++] = b.position.z;
                pos[ptr++] = rb.position.x; pos[ptr++] = rb.position.y; pos[ptr++] = rb.position.z;
                if (r < rows - 1) {
                    const db = particles[(r + 1) * cols + c];
                    pos[ptr++] = b.position.x; pos[ptr++] = b.position.y; pos[ptr++] = b.position.z;
                    pos[ptr++] = db.position.x; pos[ptr++] = db.position.y; pos[ptr++] = db.position.z;
                }
            }
        }
        geo.attributes.position.needsUpdate = true;
    }, []);

    useFrame(() => {
        if (!worldRef.current) return;
        worldRef.current.step(1 / 60);

        if (isCameraAnimatingRef.current) {
            camera.position.lerp(cameraTargetPosRef.current, 0.05);
            if (controlsRef.current) { controlsRef.current.target.lerp(controlsTargetPosRef.current, 0.05); controlsRef.current.update(); }
            if (camera.position.distanceTo(cameraTargetPosRef.current) < 0.1) isCameraAnimatingRef.current = false;
        } else if (controlsRef.current) controlsRef.current.update();

        if (currentBallRef.current) {
            currentBallRef.current.mesh.position.copy(currentBallRef.current.body.position);
            if (ballLightRef.current) ballLightRef.current.position.copy(currentBallRef.current.mesh.position);
        }

        for (let i = activeBallsRef.current.length - 1; i >= 0; i--) {
            const b = activeBallsRef.current[i];
            b.mesh.position.copy(b.body.position);
            b.mesh.quaternion.copy(b.body.quaternion);
            if (ballLightRef.current && i === activeBallsRef.current.length - 1) ballLightRef.current.position.copy(b.mesh.position);
            if (b.mesh.position.y < -15) { scene.remove(b.mesh); worldRef.current.removeBody(b.body); activeBallsRef.current.splice(i, 1); }
        }

        for (let i = particleBurstsRef.current.length - 1; i >= 0; i--) {
            const p = particleBurstsRef.current[i];
            p.life -= 0.02; p.vel.y -= 18 / 60; p.mesh.position.addScaledVector(p.vel, 1 / 60);
            (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life);
            if (p.life <= 0) { scene.remove(p.mesh); p.mesh.geometry.dispose(); (p.mesh.material as THREE.MeshBasicMaterial).dispose(); particleBurstsRef.current.splice(i, 1); }
        }

        if (ringFlashRef.current > 0) {
            ringFlashRef.current = Math.max(0, ringFlashRef.current - 0.02);
            if (ringMeshRef.current) { const m = ringMeshRef.current.material as THREE.MeshStandardMaterial; m.emissive.setHex(0xff8800); m.emissiveIntensity = ringFlashRef.current * 6; }
        } else if (ringMeshRef.current) { (ringMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0; }

        if (hoopTargetRef.current?.visible) {
            const t = Date.now() * 0.006;
            const s = 1 + Math.sin(t) * 0.08;
            hoopTargetRef.current.scale.set(s, s, s);
            (hoopTargetRef.current.material as THREE.MeshBasicMaterial).opacity = (hoopTargetGreenRef.current ? 0.35 : 0.22) + Math.sin(t) * 0.14;
        }

        if (dustMotesRef.current) {
            const { geo, positions, velocities } = dustMotesRef.current;
            for (let i = 0; i < velocities.length; i++) { positions[i * 3 + 1] += velocities[i]; if (positions[i * 3 + 1] > 32) positions[i * 3 + 1] = 0; }
            (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }

        checkGoals(); updateNet();
    });

    // Update scoreboard texture only when data changes (not every frame)
    useEffect(() => {
        if (scoreboardCanvasRef.current && scoreboardTextureRef.current) {
            renderScoreboardTexture(scoreboardCanvasRef.current, teamStats, currentScore, playerSide, currentStreak);
            scoreboardTextureRef.current.needsUpdate = true;
        }
    }, [teamStats, currentScore, playerSide, currentStreak]);

    return (
        <>
            <hemisphereLight args={[0x223355, 0x111111, 0.3]} />
            <directionalLight position={[10, 25, 20]} intensity={0.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
            <fog attach="fog" args={[0x080808, 28, 70]} />
            <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={5} maxDistance={50} maxPolarAngle={Math.PI / 2 - 0.05} enablePan={false} mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } as any} />
        </>
    );
};

export const GameSection: React.FC = () => {
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
    const [playerName, setPlayerName] = useState('');
    const [playerSide, setPlayerSide] = useState<'bride' | 'groom' | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [leaderboard, setLeaderboard] = useState<Player[]>([]);
    const [allLeaderboard, setAllLeaderboard] = useState<Player[]>([]);
    const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
    const [isLoadingAllLeaderboard, setIsLoadingAllLeaderboard] = useState(false);
    const [teamStats, setTeamStats] = useState<TeamStats>({ bridePercent: 50, groomPercent: 50, brideTotal: 0, groomTotal: 0, bridePlayers: 0, groomPlayers: 0 });
    const [showConfetti, setShowConfetti] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackType, setFeedbackType] = useState<'score' | 'miss' | null>(null);
    const isSavingRef = useRef(false);
    const scoreRef = useRef(0);

    useEffect(() => { fetchLeaderboard(); fetchTeamStats(); }, []);

    const fetchLeaderboard = async () => {
        const { data } = await supabase.from('leaderboard').select('*').eq('client_id', WEDDING_CLIENT_ID).order('score', { ascending: false }).limit(5);
        if (data) setLeaderboard(data);
    };

    const fetchTeamStats = async () => {
        const { data } = await supabase.from('leaderboard').select('score, side').eq('client_id', WEDDING_CLIENT_ID);
        if (data && data.length > 0) {
            const bride = data.filter(p => p.side === 'bride');
            const groom = data.filter(p => p.side === 'groom');
            const brideTotal = bride.reduce((s, p) => s + p.score, 0);
            const groomTotal = groom.reduce((s, p) => s + p.score, 0);
            const total = brideTotal + groomTotal;
            setTeamStats({ bridePercent: total > 0 ? Math.round((brideTotal / total) * 100) : 50, groomPercent: total > 0 ? Math.round((groomTotal / total) * 100) : 50, brideTotal, groomTotal, bridePlayers: bride.length, groomPlayers: groom.length });
        }
    };

    // Game timer
    useEffect(() => {
        if (gameState !== 'playing') return;
        const id = setInterval(() => {
            setTimeRemaining(t => {
                if (t <= 1) { clearInterval(id); setTimeout(() => setGameState('gameover'), 600); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [gameState]);

    const startGame = () => {
        if (!playerName.trim() || !playerSide) return;
        setGameState('playing');
        setScore(0); scoreRef.current = 0;
        setStreak(0);
        setTimeRemaining(GAME_DURATION);
        isSavingRef.current = false;
    };

    const handleScore = useCallback(() => {
        setScore(prev => { scoreRef.current = prev + 1; return prev + 1; });
        setShowConfetti(true);
        setFeedbackText(PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)]);
        setFeedbackType('score');
        setTimeout(() => { setShowConfetti(false); setFeedbackText(''); setFeedbackType(null); }, 1400);
    }, []);

    const handleMiss = useCallback(() => {
        setFeedbackText(MISS_PHRASES[Math.floor(Math.random() * MISS_PHRASES.length)]);
        setFeedbackType('miss');
        setTimeout(() => { setFeedbackText(''); setFeedbackType(null); }, 1200);
    }, []);

    const handleStreakUpdate = useCallback((s: number) => { setStreak(s); }, []);

    useEffect(() => {
        if (gameState === 'gameover' && !isSavingRef.current) saveScore();
    }, [gameState]);

    const saveScore = async () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        const sanitizedName = DOMPurify.sanitize(playerName.trim(), { ALLOWED_TAGS: [] });
        const title = playerSide === 'bride' ? 'Team San' : 'Team Sam';
        const { error } = await supabase.from('leaderboard').insert([{ name: sanitizedName, score: scoreRef.current, title, side: playerSide || 'neutral', client_id: WEDDING_CLIENT_ID }]);
        if (!error) {
            await fetchLeaderboard();
            await fetchTeamStats();
        } else {
            console.error("Error saving score to leaderboard:", error);
            alert("Failed to save score. Please try again.");
        }
    };

    const loadAllScorers = async () => {
        if (isLoadingAllLeaderboard) return;
        setIsLoadingAllLeaderboard(true);
        const { data } = await supabase.from('leaderboard').select('*').eq('client_id', WEDDING_CLIENT_ID).order('score', { ascending: false });
        if (data) { setAllLeaderboard(data); setShowAllLeaderboard(true); }
        setIsLoadingAllLeaderboard(false);
    };

    const resetGame = () => {
        setGameState('intro'); setPlayerName(''); setPlayerSide(null);
        setScore(0); scoreRef.current = 0; setStreak(0); setTimeRemaining(GAME_DURATION);
        isSavingRef.current = false;
    };

    const timerColor = timeRemaining <= 10 ? 'text-red-400' : timeRemaining <= 20 ? 'text-orange-400' : 'text-white';
    const timePulse = timeRemaining <= 10;

    return (
        <section className="relative min-h-screen bg-[#050505] py-12 md:py-20 overflow-hidden">
            {showConfetti && <Confetti />}

            <AnimatePresence>
                {feedbackText && (
                    <motion.div initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1.2, y: 0 }} exit={{ opacity: 0, scale: 0.5 }}
                        className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
                        <span className={`text-5xl md:text-7xl font-bold drop-shadow-lg ${feedbackType === 'score' ? 'text-[#FFD700]' : 'text-[#B76E79]'}`}
                            style={{ textShadow: '0 0 20px rgba(0,0,0,0.9), 4px 4px 0px #000' }}>
                            {feedbackText}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-20 text-center pointer-events-none mb-6 md:mb-8 lg:mb-10 px-4">
                <span className="font-sans text-[9px] md:text-[10px] tracking-[0.5em] uppercase text-[#FFD700] block mb-2">Shoot Your Shot</span>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-white">SanSam Showdown</h2>
            </div>

            <AnimatePresence mode="wait">
                {/* ---- INTRO ---- */}
                {gameState === 'intro' && (
                    <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-30 w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6 px-4">

                        {/* Left: Game Setup */}
                        <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="w-14 h-14 rounded-full bg-[#FFD700]/10 flex items-center justify-center mb-5 text-[#FFD700] border border-[#FFD700]/20 relative z-10">
                                <Target size={24} />
                            </div>
                            <h3 className="font-display text-2xl md:text-3xl text-white mb-2 relative z-10">Basketball Challenge</h3>
                            <p className="font-serif italic text-sm text-white/50 mb-2 max-w-xs relative z-10">Score as many baskets as you can in 60 seconds!</p>
                            <div className="flex items-center gap-2 mb-6 text-[#FFD700]/70 relative z-10">
                                <Timer size={14} />
                                <span className="font-sans text-[10px] tracking-widest uppercase">60 Second Challenge</span>
                            </div>
                            <input type="text" placeholder="Enter Your Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15}
                                className="relative z-10 w-full max-w-xs bg-black/40 border border-white/20 rounded-sm py-3 px-5 text-center text-white font-display text-lg focus:outline-none focus:border-[#FFD700] transition-colors mb-4 placeholder:text-white/20 min-h-[44px]" />
                            <div className="flex gap-3 mb-5 w-full max-w-xs">
                                <button onClick={() => setPlayerSide('bride')}
                                    className={`flex-1 py-3 border rounded-sm transition-all text-[10px] tracking-widest uppercase min-h-[44px] ${playerSide === 'bride' ? 'bg-pink-500/20 border-pink-400 text-pink-300 font-bold' : 'border-white/15 text-white/50 hover:border-pink-400/50 hover:text-pink-300/70'}`}>
                                    🌸 Team San
                                </button>
                                <button onClick={() => setPlayerSide('groom')}
                                    className={`flex-1 py-3 border rounded-sm transition-all text-[10px] tracking-widest uppercase min-h-[44px] ${playerSide === 'groom' ? 'bg-blue-500/20 border-blue-400 text-blue-300 font-bold' : 'border-white/15 text-white/50 hover:border-blue-400/50 hover:text-blue-300/70'}`}>
                                    💙 Team Sam
                                </button>
                            </div>
                            <button onClick={startGame} disabled={!playerName.trim() || !playerSide}
                                className="relative z-10 w-full max-w-xs py-4 bg-[#FFD700] text-black font-sans text-xs font-bold tracking-[0.2em] uppercase hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]">
                                Start Game
                            </button>
                        </div>

                        {/* Right: Team Scoreboard */}
                        <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 flex flex-col shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <Trophy size={18} className="text-[#FFD700]" />
                                    <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-white/70">Live Scoreboard</span>
                                </div>
                                <span className="text-[9px] text-white/30 uppercase tracking-wider">SanSam Showdown</span>
                            </div>

                            {/* Team battle cards */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-gradient-to-br from-pink-500/15 to-pink-900/10 border border-pink-500/30 rounded-sm p-4 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent" />
                                    <span className="text-pink-400 font-sans text-[9px] tracking-[0.25em] uppercase block mb-1">🌸 Team San</span>
                                    <span className="text-3xl md:text-4xl font-mono font-bold text-white block">{teamStats.brideTotal}</span>
                                    <span className="text-pink-400/60 font-sans text-[9px] uppercase tracking-wider block">baskets</span>
                                    <span className="text-white/25 text-[9px] mt-1 block">{teamStats.bridePlayers} player{teamStats.bridePlayers !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500/15 to-blue-900/10 border border-blue-500/30 rounded-sm p-4 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
                                    <span className="text-blue-400 font-sans text-[9px] tracking-[0.25em] uppercase block mb-1">💙 Team Sam</span>
                                    <span className="text-3xl md:text-4xl font-mono font-bold text-white block">{teamStats.groomTotal}</span>
                                    <span className="text-blue-400/60 font-sans text-[9px] uppercase tracking-wider block">baskets</span>
                                    <span className="text-white/25 text-[9px] mt-1 block">{teamStats.groomPlayers} player{teamStats.groomPlayers !== 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            {/* Battle bar */}
                            <div className="mb-5">
                                <div className="flex justify-between text-[9px] uppercase tracking-wider mb-1.5">
                                    <span className="text-pink-400">{teamStats.bridePercent}%</span>
                                    <span className="text-white/30">vs</span>
                                    <span className="text-blue-400">{teamStats.groomPercent}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-0">
                                    <motion.div className="h-full bg-gradient-to-r from-pink-700 to-pink-400" animate={{ width: `${teamStats.bridePercent}%` }} transition={{ duration: 1.2, ease: "easeInOut" }} />
                                    <motion.div className="h-full bg-gradient-to-l from-blue-700 to-blue-400" animate={{ width: `${teamStats.groomPercent}%` }} transition={{ duration: 1.2, ease: "easeInOut" }} />
                                </div>
                                {teamStats.bridePercent !== teamStats.groomPercent && (
                                    <p className="text-center text-[9px] text-white/30 mt-1.5 uppercase tracking-wider">
                                        {teamStats.bridePercent > teamStats.groomPercent ? '🌸 Team San leads' : '💙 Team Sam leads'}
                                    </p>
                                )}
                            </div>

                            {/* Top players */}
                            <div className="flex-1 space-y-2 overflow-y-auto">
                                {leaderboard.length === 0 ? (
                                    <div className="text-center text-white/30 py-6"><p className="font-serif italic text-sm">Be the first to play!</p></div>
                                ) : (
                                    leaderboard.map((p, i) => (
                                        <div key={p.id || `lb-${i}`} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 hover:border-white/15 transition-all">
                                            <div className="flex items-center gap-3">
                                                <span className={`font-mono text-sm font-bold w-5 text-center ${i === 0 ? 'text-[#FFD700]' : 'text-white/30'}`}>{i === 0 ? '🏆' : `${i + 1}`}</span>
                                                <div>
                                                    <span className="text-white font-sans text-sm block">{p.name}</span>
                                                    <span className={`text-[9px] uppercase tracking-wider ${p.side === 'bride' ? 'text-pink-400' : 'text-blue-400'}`}>
                                                        {p.side === 'bride' ? '🌸 Team San' : '💙 Team Sam'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[#FFD700] font-mono font-bold text-lg block">{p.score}</span>
                                                <span className="text-white/25 text-[9px]">baskets</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={loadAllScorers} disabled={isLoadingAllLeaderboard}
                                className="w-full mt-4 py-3 border border-white/10 text-white/40 font-sans text-[9px] tracking-[0.2em] uppercase hover:bg-white/5 hover:text-white/70 hover:border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30">
                                {isLoadingAllLeaderboard ? 'Loading...' : 'View All Players'}
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {/* ---- PLAYING ---- */}
                {gameState === 'playing' && (
                    <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-30 w-full max-w-6xl mx-auto px-4">
                        {/* HUD */}
                        <div className="flex justify-between items-center mb-3 px-1">
                            <div className="bg-black/70 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-sm min-w-[80px]">
                                <span className="text-white/50 font-sans text-[8px] tracking-widest uppercase block">Baskets</span>
                                <span className="text-[#FFD700] font-mono text-2xl font-bold leading-none">{score}</span>
                            </div>

                            {/* Central timer */}
                            <motion.div
                                animate={timePulse ? { scale: [1, 1.06, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                                className={`bg-black/80 backdrop-blur-sm border px-6 py-2 rounded-sm text-center ${timePulse ? 'border-red-500/60' : 'border-white/10'}`}>
                                <span className="text-white/50 font-sans text-[8px] tracking-widest uppercase block">Time</span>
                                <span className={`font-mono text-3xl font-bold leading-none tabular-nums ${timerColor}`}>
                                    0:{timeRemaining.toString().padStart(2, '0')}
                                </span>
                            </motion.div>

                            <div className="flex items-center gap-2">
                                <AnimatePresence>
                                    {streak >= 2 && (
                                        <motion.div key={`streak-${streak}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                            className="bg-black/70 backdrop-blur-sm border border-orange-500/40 px-3 py-2 rounded-sm flex items-center gap-1.5">
                                            <Flame size={14} className="text-orange-400" />
                                            <span className="text-orange-400 font-mono text-xl font-bold">{streak}x</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="bg-black/70 backdrop-blur-sm border border-white/10 px-3 py-2 rounded-sm min-w-[70px] text-right">
                                    <span className="text-white/50 font-sans text-[8px] tracking-widest uppercase block">{playerSide === 'bride' ? '🌸 San' : '💙 Sam'}</span>
                                    <span className={`font-sans text-[9px] font-bold ${playerSide === 'bride' ? 'text-pink-400' : 'text-blue-400'}`}>{playerName}</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-[420px] md:h-[560px] rounded-sm overflow-hidden border border-white/8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <Canvas shadows camera={{ position: [0, 10, 25], fov: 60 }} gl={{ antialias: true }} style={{ background: '#060606' }}>
                                <BasketballScene onScore={handleScore} onMiss={handleMiss} gameActive={timeRemaining > 0} onStreakUpdate={handleStreakUpdate} teamStats={teamStats} currentScore={score} playerSide={playerSide} currentStreak={streak} />
                            </Canvas>
                        </div>

                        <div className="mt-3 text-center">
                            <p className="text-white/40 text-xs font-sans uppercase tracking-wider hidden md:block">
                                <span className="text-[#FFD700]/80">Hover ball</span> → drag down → release to shoot
                            </p>
                            <p className="text-white/40 text-xs font-sans uppercase tracking-wider md:hidden">
                                <span className="text-[#FFD700]/80">Tap ball</span> → swipe down → release to shoot
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ---- GAME OVER ---- */}
                {gameState === 'gameover' && (
                    <motion.div key="gameover" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-30 w-full max-w-lg mx-auto px-4 text-center">
                        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.2 }}>
                            <Trophy size={70} className="mx-auto mb-5 text-[#FFD700]" />
                        </motion.div>
                        <h2 className="font-display text-4xl md:text-5xl text-white mb-2">
                            {score >= 15 ? 'Legendary!' : score >= 10 ? 'On Fire!' : score >= 5 ? 'Well Played!' : 'Nice Try!'}
                        </h2>
                        <p className="font-serif italic text-white/50 mb-8">Great game, {playerName}! Playing for {playerSide === 'bride' ? '🌸 Team San' : '💙 Team Sam'}</p>

                        <div className="bg-white/8 backdrop-blur-xl border border-white/15 p-10 rounded-sm shadow-2xl mb-6">
                            <span className="block text-white/40 font-sans text-[10px] tracking-[0.3em] uppercase mb-3">Final Score</span>
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.4 }}>
                                <span className="text-[#FFD700] font-mono text-7xl font-bold">{score}</span>
                                <span className="text-white/30 font-sans text-lg ml-2">baskets</span>
                            </motion.div>
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <span className="text-white/30 text-sm font-sans">in 60 seconds</span>
                                {score > 0 && <span className="text-white/20 text-xs font-sans block mt-1">~{(score / 1).toFixed(0)} baskets / min</span>}
                            </div>
                        </div>

                        {/* Team contribution */}
                        <div className={`mb-6 p-4 rounded-sm border ${playerSide === 'bride' ? 'bg-pink-500/10 border-pink-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                            <span className={`font-sans text-[9px] tracking-widest uppercase ${playerSide === 'bride' ? 'text-pink-400' : 'text-blue-400'}`}>
                                {playerSide === 'bride' ? '🌸 Team San' : '💙 Team Sam'} contribution
                            </span>
                            <p className="text-white/60 text-xs mt-1 font-sans">Your score has been added to the team total!</p>
                        </div>

                        <button onClick={resetGame} className="w-full py-4 bg-[#FFD700] text-black font-sans text-xs font-bold tracking-[0.2em] uppercase hover:bg-white transition-colors">
                            Play Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* All scorers modal */}
            <AnimatePresence>
                {showAllLeaderboard && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-md p-4"
                        onClick={() => setShowAllLeaderboard(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#080808] border border-white/20 rounded-sm w-full max-w-2xl max-h-[80vh] flex flex-col">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Crown size={18} className="text-[#FFD700]" />
                                    <h3 className="font-display text-xl text-white">All Players</h3>
                                </div>
                                <div className="flex items-center gap-4 mr-4">
                                    <span className="text-pink-400 text-xs">🌸 San: {teamStats.brideTotal}</span>
                                    <span className="text-blue-400 text-xs">💙 Sam: {teamStats.groomTotal}</span>
                                </div>
                                <button onClick={() => setShowAllLeaderboard(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                                    <XIcon size={14} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {allLeaderboard.map((p, i) => (
                                    <div key={p.id || `all-${i}`} className="flex items-center justify-between p-3 bg-white/4 border border-white/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-white/30 w-7 text-sm">#{i + 1}</span>
                                            <div>
                                                <span className="font-sans text-white text-sm">{p.name}</span>
                                                <span className={`text-[9px] ml-2 uppercase tracking-wider ${p.side === 'bride' ? 'text-pink-400' : 'text-blue-400'}`}>
                                                    {p.side === 'bride' ? '🌸 San' : '💙 Sam'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-mono text-[#FFD700] font-bold">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
