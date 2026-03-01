'use client';

import { useEffect, useRef, useState } from 'react';
import { Renderer, Camera, Transform, Texture, Program, Mesh } from 'ogl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import type { CameraAnimation, ParticleMesh } from '../src/lib/cinematic/types';
import { images, perspectives, cylinderConfig, particleConfig, imageConfig } from '../src/lib/cinematic/data';
import {
    drawImageCover,
    getPositionClasses,
    createCylinderGeometry,
    createParticleGeometry,
} from '../src/lib/cinematic/utils';
import { cylinderVertex, cylinderFragment, particleVertex, particleFragment } from '../src/lib/cinematic/shaders';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

interface CinematicHeroProps {
    isMuted: boolean;
    toggleMute: () => void;
    onVideoReady: () => void;
}

export function CinematicHero({ isMuted, toggleMute, onVideoReady }: CinematicHeroProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasScrolled, setHasScrolled] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textRefs = useRef<(HTMLDivElement | null)[]>([]);
    const rendererRef = useRef<Renderer | null>(null);
    const sceneRef = useRef<Transform | null>(null);
    const cameraRef = useRef<Camera | null>(null);
    const cylinderRef = useRef<Mesh | null>(null);
    const cameraAnimRef = useRef<CameraAnimation>({ x: 0, y: 0, z: 8, rotY: 0 });
    const particlesRef = useRef<ParticleMesh[]>([]);
    const lastRotationRef = useRef(0);
    const velocityRef = useRef(0);
    const momentumRef = useRef(0);
    const animFrameRef = useRef<number>(0);
    const mousePosRef = useRef({ x: -1, y: -1 });

    useEffect(() => {
        const handleScroll = () => {
            setHasScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const dpr = Math.min(window.devicePixelRatio, 2);

        const renderer = new Renderer({
            canvas: canvasRef.current,
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: dpr,
            alpha: true,
            antialias: true,
        });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 1);
        gl.disable(gl.CULL_FACE);
        rendererRef.current = renderer;

        const getResponsiveDimensions = () => {
            const width = window.innerWidth;
            const isMobile = width < 768;
            const isTablet = width >= 768 && width < 1024;

            // Adjusted to balance size (not too small) and congestion
            const maxRadius = isMobile ? 1.6 : isTablet ? 2.2 : 2.5;
            const cylinderHeight = isMobile ? 0.9 : isTablet ? 1.0 : 1.2;
            const cameraZ = isMobile ? 6.5 : isTablet ? 7 : 8;
            const fov = isMobile ? 50 : 45; // Restore 50 FOV for mobile

            return {
                cylinderScale: maxRadius / cylinderConfig.radius,
                cylinderHeight,
                cameraZ,
                fov,
                isMobile,
            };
        };

        const dimensions = getResponsiveDimensions();

        const camera = new Camera(gl, { fov: dimensions.fov });
        camera.position.set(0, 0, dimensions.cameraZ);
        cameraRef.current = camera;

        const scene = new Transform();
        sceneRef.current = scene;

        const geometry = createCylinderGeometry(gl, cylinderConfig);

        const hardwareLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        const isMobileDevice = window.innerWidth < 768;
        const safeLimit = isMobileDevice ? 2048 : Math.min(hardwareLimit, 8192);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', {
            willReadFrequently: false,
            alpha: false,
        })!;
        const numImages = images.length;

        const totalWidthOriginal = imageConfig.width * numImages;
        const heightOriginal = imageConfig.height;

        const scale = Math.min(1, safeLimit / totalWidthOriginal);

        canvas.width = Math.floor(totalWidthOriginal * scale);
        canvas.height = Math.floor(heightOriginal * scale);

        let loadedImages = 0;
        const imageElements: HTMLImageElement[] = [];

        const circumference = 2 * Math.PI * cylinderConfig.radius;
        const textureAspectRatio = imageConfig.height / (imageConfig.width * images.length);
        const idealHeight = circumference * textureAspectRatio;
        const heightCorrection = idealHeight / cylinderConfig.height;

        const handleResize = () => {
            if (rendererRef.current && cameraRef.current && cylinderRef.current) {
                const newDimensions = getResponsiveDimensions();

                rendererRef.current.setSize(window.innerWidth, window.innerHeight);

                cameraRef.current.perspective({
                    fov: newDimensions.fov,
                    aspect: window.innerWidth / window.innerHeight,
                });

                cylinderRef.current.scale.set(
                    newDimensions.cylinderScale,
                    newDimensions.cylinderScale * heightCorrection * (newDimensions.isMobile ? 0.75 : 1),
                    newDimensions.cylinderScale
                );

                if (cameraAnimRef.current.z === 8 || cameraAnimRef.current.z === 7 || cameraAnimRef.current.z === 6) {
                    cameraAnimRef.current.z = newDimensions.cameraZ;
                }
            }
        };

        images.forEach((imageSrc, index) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                imageElements[index] = img;
                loadedImages++;

                const totalCanvasWidth = canvas.width;
                const canvasHeight = canvas.height;

                if (loadedImages === numImages) {
                    // Draw all images to canvas
                    imageElements.forEach((img, i) => {
                        const xStartExact = (i / numImages) * totalCanvasWidth;
                        const xEndExact = ((i + 1) / numImages) * totalCanvasWidth;

                        const xPos = Math.floor(xStartExact);
                        const xEnd = Math.floor(xEndExact);

                        const drawWidthActual = xEnd - xPos;
                        drawImageCover(ctx, img, xPos, 0, drawWidthActual, canvasHeight);
                    });

                    const texture = new Texture(gl, {
                        wrapS: gl.CLAMP_TO_EDGE,
                        wrapT: gl.CLAMP_TO_EDGE,
                        minFilter: gl.LINEAR,
                        magFilter: gl.LINEAR,
                        generateMipmaps: false,
                    });

                    texture.image = canvas;
                    texture.needsUpdate = true;

                    const program = new Program(gl, {
                        vertex: cylinderVertex,
                        fragment: cylinderFragment,
                        uniforms: {
                            tMap: { value: texture },
                            uDarkness: { value: 0.3 },
                            uMouse: { value: [-1, -1] },
                            uResolution: { value: [window.innerWidth * dpr, window.innerHeight * dpr] },
                        },
                        cullFace: null,
                    });

                    // Mouse tracking for hover color reveal
                    const handleMouseMove = (e: MouseEvent) => {
                        mousePosRef.current.x = e.clientX / window.innerWidth;
                        mousePosRef.current.y = e.clientY / window.innerHeight;
                    };
                    const handleMouseLeave = () => {
                        mousePosRef.current.x = -1;
                        mousePosRef.current.y = -1;
                    };
                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseleave', handleMouseLeave);

                    const cylinder = new Mesh(gl, { geometry, program });
                    cylinder.setParent(scene);
                    cylinder.rotation.y = 0.5;
                    cylinder.scale.set(dimensions.cylinderScale, dimensions.cylinderScale, dimensions.cylinderScale);
                    cylinderRef.current = cylinder;

                    setIsLoading(false);
                    onVideoReady(); // Signal hero is ready

                    // Scroll-driven camera animation timeline
                    const tl = gsap.timeline({
                        scrollTrigger: {
                            trigger: containerRef.current,
                            start: 'top top',
                            end: 'bottom bottom',
                            scrub: 1,
                        },
                    });

                    tl.to(cameraAnimRef.current, {
                        x: 0,
                        y: 0,
                        z: dimensions.cameraZ,
                        duration: 1,
                        ease: 'power2.inOut',
                    })
                        .to(cameraAnimRef.current, {
                            x: 0,
                            y: 5,
                            z: 5,
                            duration: 1,
                            ease: 'power2.out',
                        })
                        .to(cameraAnimRef.current, {
                            x: 1.5,
                            y: 2,
                            z: 2,
                            duration: 2,
                            ease: 'power1.inOut',
                        })
                        .to(cameraAnimRef.current, {
                            x: 0.5,
                            y: 0,
                            z: 0.8,
                            duration: 3.5,
                            ease: 'power1.inOut',
                        })
                        .to(cameraAnimRef.current, {
                            x: -6,
                            y: -1,
                            z: dimensions.cameraZ,
                            duration: 1,
                            ease: 'power2.inOut',
                        });

                    // Cylinder rotation through scroll
                    tl.to(
                        cylinderRef.current.rotation,
                        {
                            y: '+=28.27',
                            duration: 8.5,
                            ease: 'none',
                        },
                        0
                    );

                    // Text scroll reveal
                    textRefs.current.forEach((textEl, index) => {
                        if (!textEl) return;

                        const sectionDuration = 100 / perspectives.length;
                        const start = index * sectionDuration;
                        const end = (index + 1) * sectionDuration;

                        const textTimeline = gsap.timeline({
                            scrollTrigger: {
                                trigger: containerRef.current,
                                start: `${start}% top`,
                                end: `${end}% top`,
                                scrub: 0.8,
                            },
                        });

                        textTimeline
                            .fromTo(
                                textEl,
                                { opacity: 0 },
                                {
                                    opacity: 1,
                                    duration: 0.2,
                                    ease: 'power2.inOut',
                                }
                            )
                            .to(textEl, {
                                opacity: 1,
                                duration: 0.6,
                                ease: 'none',
                            })
                            .to(textEl, {
                                opacity: 0,
                                duration: 0.2,
                                ease: 'power2.inOut',
                            });
                    });

                    // Particles
                    for (let i = 0; i < particleConfig.numParticles; i++) {
                        const { geometry: lineGeometry, userData } = createParticleGeometry(
                            gl,
                            particleConfig,
                            i,
                            cylinderConfig.height
                        );

                        const lineProgram = new Program(gl, {
                            vertex: particleVertex,
                            fragment: particleFragment,
                            uniforms: {
                                uColor: { value: [1.0, 0.85, 0.55] }, // Gold-tinted particles
                                uOpacity: { value: 0.0 },
                            },
                            transparent: true,
                            depthTest: true,
                        });

                        const particle = new Mesh(gl, {
                            geometry: lineGeometry,
                            program: lineProgram,
                            mode: gl.LINE_STRIP,
                        }) as ParticleMesh;

                        particle.userData = userData;
                        particle.setParent(scene);
                        particlesRef.current.push(particle);
                    }

                    window.addEventListener('resize', handleResize);

                    // Render loop
                    const animate = () => {
                        animFrameRef.current = requestAnimationFrame(animate);

                        camera.position.set(cameraAnimRef.current.x, cameraAnimRef.current.y, cameraAnimRef.current.z);
                        camera.lookAt([0, 0, 0]);

                        // Update mouse uniform for hover color reveal
                        if (cylinderRef.current) {
                            cylinderRef.current.program.uniforms.uMouse.value = [mousePosRef.current.x, mousePosRef.current.y];
                            cylinderRef.current.program.uniforms.uResolution.value = [window.innerWidth * dpr, window.innerHeight * dpr];
                        }

                        if (cylinderRef.current) {
                            const currentRotation = cylinderRef.current.rotation.y;
                            velocityRef.current = currentRotation - lastRotationRef.current;
                            lastRotationRef.current = currentRotation;

                            const inertiaFactor = 0.15;
                            const decayFactor = 0.92;

                            momentumRef.current = momentumRef.current * decayFactor + velocityRef.current * inertiaFactor;

                            const speed = Math.abs(velocityRef.current) * 100;
                            const isRotating = Math.abs(velocityRef.current) > 0.0001;

                            // Update particles
                            particlesRef.current.forEach((particle) => {
                                const userData = particle.userData;

                                const targetOpacity = isRotating ? Math.min(speed * 3, 0.95) : 0;
                                const currentOpacity = particle.program.uniforms.uOpacity.value as number;
                                particle.program.uniforms.uOpacity.value = currentOpacity + (targetOpacity - currentOpacity) * 0.15;

                                if (isRotating) {
                                    const rotationOffset = velocityRef.current * userData.speed * 1.5;
                                    const newBaseAngle = userData.baseAngle + rotationOffset;
                                    userData.baseAngle = newBaseAngle;

                                    const segments = particleConfig.segments;
                                    const positions = particle.geometry.attributes.position.data as Float32Array;

                                    for (let j = 0; j <= segments; j++) {
                                        const t = j / segments;
                                        const angle = newBaseAngle + userData.angleSpan * t;
                                        const radiusWithSpeed = userData.radius;

                                        positions[j * 3] = Math.cos(angle) * radiusWithSpeed;
                                        positions[j * 3 + 1] = userData.baseY;
                                        positions[j * 3 + 2] = Math.sin(angle) * radiusWithSpeed;
                                    }

                                    particle.geometry.attributes.position.needsUpdate = true;
                                }
                            });
                        }

                        renderer.render({ scene, camera });
                    };
                    animate();
                }
            };
            img.onerror = () => {
                console.error('[CinematicHero] Failed to load image:', imageSrc);
                setIsLoading(false);
                onVideoReady();
            };
            img.src = imageSrc;
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', () => { });
            window.removeEventListener('mouseleave', () => { });
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        };
    }, []);

    return (
        <>
            {/* Loader overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-48 h-[1px] bg-white/10 relative overflow-hidden">
                            <div
                                className="absolute inset-0 bg-white/60"
                                style={{
                                    animation: 'loader 1.5s ease-in-out infinite alternate forwards',
                                }}
                            />
                        </div>
                        <span
                            className="text-white/40 text-xs tracking-[0.3em] uppercase"
                            style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                            Loading
                        </span>
                    </div>
                </div>
            )}

            {/* Fixed WebGL canvas */}
            <div className="fixed inset-0 w-full h-screen z-0">
                <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
            </div>

            {/* Fixed text overlays */}
            <div className="fixed inset-0 pointer-events-none z-10 text-white">
                {perspectives.map((perspective, index) => (
                    <div
                        key={index}
                        ref={(el) => {
                            textRefs.current[index] = el;
                        }}
                        className={`absolute text-center opacity-0 max-md:w-full ${getPositionClasses(perspective.position)}`}
                    >
                        <h2
                            className="text-7xl font-light max-md:text-3xl leading-[0.9]"
                            style={{ fontFamily: "'Italiana', serif" }}
                        >
                            {perspective.title}
                        </h2>
                        {perspective.description && (
                            <p
                                className="text-6xl font-light max-md:text-3xl leading-[0.9] mt-4 opacity-80"
                                style={{ fontFamily: "'Italiana', serif" }}
                            >
                                {perspective.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>



            {/* Scroll indicator — Bold & prominent */}
            <div
                className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-500 ${hasScrolled ? 'opacity-0' : 'opacity-100'}`}
            >
                <div className="flex flex-col items-center gap-3 animate-bounce" style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' }}>
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                    >
                        <path d="M12 5v14M19 12l-7 7-7-7" />
                    </svg>
                    <span
                        className="text-sm text-white/80 font-semibold"
                        style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.25em', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}
                    >
                        SCROLL DOWN
                    </span>
                </div>
            </div>

            {/* Scroll container — 350vh driving the scroll animations (reduced from 500vh to prevent users getting stuck) */}
            <div id="film" className="relative z-20">
                <div ref={containerRef} style={{ height: '350vh' }} />
            </div>
        </>
    );
}
