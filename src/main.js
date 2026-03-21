import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './style.css';

gsap.registerPlugin(ScrollTrigger);

// --- CONFIGURATION ---
const TEXTURES = {
    sun: '/textures/sun.jpg',
    mercury: '/textures/mercury.jpg',
    venus: '/textures/venus.jpg',
    earth: '/textures/earth_day.jpg',
    earthNight: '/textures/earth_night.jpg',
    mars: '/textures/mars.jpg',
    jupiter: '/textures/jupiter.jpg',
    saturn: '/textures/saturn.jpg',
    saturnRing: '/textures/saturn_ring.png',
    uranus: '/textures/uranus.jpg',
    neptune: '/textures/neptune.jpg',
    moon: '/textures/moon.jpg',
    stars: '/textures/stars.jpg'
};

const PLANETS_DATA = [
    { name: 'Mercury', size: 1.2, distance: 30, rotation: 0.005, color: 0xA5A5A5, type: 'Terrestrial', realRadius: '2,439 km', realDistance: '57.9M km', orbitalPeriod: '88 Days', day: '58.6 days', desc: 'The smallest planet in our solar system and closest to the Sun.' },
    { name: 'Venus', size: 1.8, distance: 45, rotation: -0.002, color: 0xE3BB76, type: 'Terrestrial', realRadius: '6,051 km', realDistance: '108.2M km', orbitalPeriod: '225 Days', day: '243 days', desc: 'Spinning slowly in the opposite direction from most planets.' },
    { name: 'Earth', size: 2.0, distance: 65, rotation: 0.02, color: 0x2233FF, type: 'Terrestrial', realRadius: '6,371 km', realDistance: '149.6M km', orbitalPeriod: '365 Days', day: '24 hours', desc: 'The only place we know of so far that’s inhabited by living things.' },
    { name: 'Mars', size: 1.5, distance: 85, rotation: 0.019, color: 0xE27B58, type: 'Terrestrial', realRadius: '3,389 km', realDistance: '227.9M km', orbitalPeriod: '687 Days', day: '24.6 hours', desc: 'A dusty, cold, desert world with a very thin atmosphere.' },
    { name: 'Jupiter', size: 6.0, distance: 135, rotation: 0.05, color: 0xD39C7E, type: 'Gas Giant', realRadius: '69,911 km', realDistance: '778.6M km', orbitalPeriod: '4,333 Days', day: '9.9 hours', desc: 'The largest planet in our solar system and the first of the gas giants.' },
    { name: 'Saturn', size: 5.0, distance: 190, rotation: 0.045, color: 0xC5AB6E, type: 'Gas Giant', realRadius: '58,232 km', realDistance: '1.4B km', orbitalPeriod: '10,759 Days', day: '10.7 hours', desc: 'Adorned with a dazzling, complex system of icy rings.', hasRings: true },
    { name: 'Uranus', size: 3.5, distance: 240, rotation: -0.03, color: 0xB5E3E3, type: 'Ice Giant', realRadius: '25,362 km', realDistance: '2.9B km', orbitalPeriod: '30,687 Days', day: '17.2 hours', desc: 'Uranus is an ice giant and rotates at a nearly 90-degree angle.' },
    { name: 'Neptune', size: 3.3, distance: 290, rotation: 0.032, color: 0x6081FF, type: 'Ice Giant', realRadius: '24,622 km', realDistance: '4.5B km', orbitalPeriod: '60,190 Days', day: '16.1 hours', desc: 'Dark, cold, and whipped by supersonic winds, Neptune is the last planet.' }
];

class SolarSystemApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 10000);
        this.camera.position.set(0, 1000, 3000); // Start far for the intro animation

        this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true; // Enable shadow mapping
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft cinematic shadows
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 5000;
        this.controls.minDistance = 2;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.focusedObject = null;
        this.hoveredObject = null;
        this.simulationSpeed = 1;
        this.cinematicMode = false;
        this.isStoryMode = false;

        this.planets = [];
        this.sun = null;
        this.clock = new THREE.Clock();

        this.init();
    }

    async init() {
        this.setupBackground();
        this.setupLights();
        this.createSun();
        this.createPlanets();
        this.setupPostProcessing();
        this.setupEventListeners();
        this.createPlanetPanel(); //s

        // Staggered Entry Animation
        this.initPlanetsEntry();

        this.animate();
    }

    setupBackground() {
        this.particleGroups = [];
        this.createStarfield();
        this.createSpaceDust();
        this.createGalaxy();
        this.animateShootingStars();

        THREE.DefaultLoadingManager.onLoad = () => {
            gsap.to('#loading-screen', {
                opacity: 0, duration: 1.5, delay: 0.5, onComplete: () => {
                    document.getElementById('loading-screen').style.display = 'none';
                    this.initIntroAnimation();
                }
            });
        };
    }

    createStarfield() {
        const particleCount = 4000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const phases = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 8000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 8000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 8000;
            phases[i] = Math.random() * Math.PI * 2;
            sizes[i] = Math.random() * 2 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        this.starMat = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                uniform float time;
                attribute float phase;
                attribute float size;
                varying float vAlpha;
                void main() {
                    vAlpha = 0.5 + 0.5 * sin(time * 2.0 + phase); // Twinkling effect
                    
                    // Add organic, sweeping cosmic drift
                    vec3 pos = position;
                    pos.x += sin(time * 0.05 + phase) * 400.0;
                    pos.y += cos(time * 0.03 + phase) * 400.0;
                    pos.z += sin(time * 0.04 - phase) * 400.0;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard; // Smooth circular point
                    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * (1.0 - dist*2.0));
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.starfield = new THREE.Points(geometry, this.starMat);
        this.scene.add(this.starfield);
        this.particleGroups.push(this.starfield);
    }

    createSpaceDust() {
        const dustCount = 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(dustCount * 3);
        const phases = new Float32Array(dustCount);

        for (let i = 0; i < dustCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 3000; // Tighter cluster
            positions[i * 3 + 1] = (Math.random() - 0.5) * 3000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 3000;
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        this.dustMat = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                uniform float time;
                attribute float phase;
                void main() {
                    vec3 pos = position;
                    // Faster swirling motion for inner dust
                    pos.x += sin(time * 0.15 + phase) * 250.0;
                    pos.y += cos(time * 0.12 + phase) * 250.0;
                    pos.z += sin(time * 0.18 - phase) * 250.0;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = 4.0 * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    // 0x88bbff equivalent roughly vec4(0.53, 0.73, 1.0)
                    gl_FragColor = vec4(0.53, 0.73, 1.0, 0.15 * (1.0 - dist*2.0)); 
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.spaceDust = new THREE.Points(geometry, this.dustMat);
        this.scene.add(this.spaceDust);
        this.particleGroups.push(this.spaceDust);
    }

    createGalaxy() {
        const particleCount = 20000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        // Core to Edge color gradient
        const colorInside = new THREE.Color(0xffaa88);
        const colorOutside = new THREE.Color(0x4466ff);

        const params = { radius: 4000, spin: 1, randomness: 0.2, randomnessPower: 3, branches: 4 };

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = Math.random() * params.radius;
            const spinAngle = radius * params.spin;
            const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;

            const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius * 0.2; // Flattened Y
            const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;

            positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
            positions[i3 + 1] = randomY - 800; // Place below the planetary orbital plane
            positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

            const mixColor = colorInside.clone().lerp(colorOutside, radius / params.radius);
            colors[i3] = mixColor.r;
            colors[i3 + 1] = mixColor.g;
            colors[i3 + 2] = mixColor.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 8,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            transparent: true,
            opacity: 0.4
        });

        this.galaxy = new THREE.Points(geometry, material);
        this.galaxy.rotation.x = 0.2; // Slight tilt
        this.scene.add(this.galaxy);
        this.particleGroups.push(this.galaxy);
    }

    animateShootingStars() {
        const spawnShootingStar = () => {
            if (Math.random() > 0.4) {
                setTimeout(spawnShootingStar, Math.random() * 4000 + 1000);
                return;
            }

            const geometry = new THREE.BufferGeometry();
            const startPos = new THREE.Vector3(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 1000 + 800,
                (Math.random() - 0.5) * 2000
            );

            const endPos = startPos.clone().add(new THREE.Vector3(Math.random() * 1000 - 500, -Math.random() * 500 - 300, Math.random() * 1000 - 500));
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([startPos.x, startPos.y, startPos.z, startPos.x, startPos.y, startPos.z], 3));

            const material = new THREE.LineBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending
            });
            const streak = new THREE.Line(geometry, material);
            this.scene.add(streak);

            gsap.to(material, { opacity: 0.8, duration: 0.2, yoyo: true, repeat: 1 });

            const positionArray = streak.geometry.attributes.position.array;
            gsap.to(positionArray, {
                3: endPos.x, 4: endPos.y, 5: endPos.z,
                duration: 0.4,
                ease: "power1.in",
                onUpdate: () => streak.geometry.attributes.position.needsUpdate = true,
                onComplete: () => {
                    this.scene.remove(streak);
                    geometry.dispose();
                    material.dispose();
                }
            });

            setTimeout(spawnShootingStar, Math.random() * 4000 + 2000);
        };
        spawnShootingStar();
    }

    setupLights() {
        // Subtle ambient light ensures the "dark sides" of planets and rings are faintly visible
        this.ambientLight = new THREE.AmbientLight(0x222233, 0.4);
        this.scene.add(this.ambientLight);

        // Sun PointLight for illumination
        // Decay = 0 guarantees long-distance light doesn't diminish to black
        this.defaultLightIntensity = 3.5;
        this.sunLight = new THREE.PointLight(0xffddaa, this.defaultLightIntensity, 4000, 0);
        this.sunLight.position.set(0, 0, 0);
        this.sunLight.castShadow = true;

        // High-quality shadow map for cinematic feel
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 4000;
        this.sunLight.shadow.bias = -0.0005; // Prevent shadow acne

        this.scene.add(this.sunLight);
    }

    createSun() {
        const loader = new THREE.TextureLoader();
        const sunTexture = loader.load(TEXTURES.sun);

        const sunGeo = new THREE.SphereGeometry(14, 64, 64);
        const sunMat = new THREE.MeshStandardMaterial({
            map: sunTexture,
            emissive: 0xffddaa, // Self-illumination color matching light
            emissiveIntensity: 1.5, // Strong glow for bloom
            emissiveMap: sunTexture, // Use texture for detailed glow
            roughness: 1,
            metalness: 0
        });

        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        // Optional: Keep the subtle corona glow if desired for edge softening
        const coronaGeo = new THREE.SphereGeometry(14.8, 64, 64);

        const coronaMat = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.BackSide,
            uniforms: { uColor: { value: new THREE.Color(0xff8800) } },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                uniform vec3 uColor;
                void main() {
                    float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                    gl_FragColor = vec4(uColor, intensity);
                }
            `
        });
        this.sunGlow = new THREE.Mesh(coronaGeo, coronaMat);
        this.scene.add(this.sunGlow);
    }

    createPlanet(data) {
        const loader = new THREE.TextureLoader();
        const orbitPivot = new THREE.Object3D();
        this.scene.add(orbitPivot);

        const axialHolder = new THREE.Object3D();
        axialHolder.position.set(data.distance, 0, 0);
        axialHolder.scale.set(0, 0, 0); // Start for entry animation
        orbitPivot.add(axialHolder);

        // Kepler-Inspired Circular Velocity (v ∝ 1 / sqrt(r))
        const orbitalSpeedBase = 12;
        data.calculatedSpeed = orbitalSpeedBase * (1.0 / Math.sqrt(data.distance));

        // Dynamic orbit paths (rings)
        const orbitPoints = [];
        for (let i = 0; i <= 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(Math.cos(angle) * data.distance, 0, Math.sin(angle) * data.distance));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitCircle = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }));
        this.scene.add(orbitCircle);

        const texture = loader.load(TEXTURES[data.name.toLowerCase()]);
        const matParams = { map: texture, metalness: 0, roughness: 1 };

        if (data.name === 'Earth') {
            matParams.emissiveMap = loader.load(TEXTURES.earthNight);
            matParams.emissive = new THREE.Color(0xffffff);
            matParams.emissiveIntensity = 0.5;
        }

        const geometry = new THREE.SphereGeometry(data.size, 64, 64);
        const material = new THREE.MeshStandardMaterial(matParams);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        axialHolder.add(mesh); // Attach directly into its specific zeroed axial pivot

        mesh.userData = { ...data, type: 'planet' };

        if (data.hasRings) {
            const ringGeo = new THREE.RingGeometry(data.size * 1.6, data.size * 2.8, 64);
            const ringTex = loader.load(TEXTURES.saturnRing);
            const ringMat = new THREE.MeshStandardMaterial({
                map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.9, roughness: 1, metalness: 0
            });
            const rings = new THREE.Mesh(ringGeo, ringMat);
            // Rings mathematically tilted around X, cleanly detached from the inner spinning core mesh
            rings.rotation.x = -Math.PI / 2.3;
            rings.castShadow = true;
            rings.receiveShadow = true;
            axialHolder.add(rings);
        }

        const planetObj = { mesh, pivot: orbitPivot, container: axialHolder, orbit: orbitCircle, data };
        this.planets.push(planetObj);
        return planetObj;
    }

    createMoon(earthInfo) {
        const loader = new THREE.TextureLoader();

        // Parent moon pivot directly into Earth's non-spinning translational holder
        const moonOrbitPivot = new THREE.Object3D();
        earthInfo.container.add(moonOrbitPivot);

        const moonData = {
            name: 'Moon',
            size: earthInfo.data.size * 0.27, // Real Earth/Moon ratio approx
            distance: 4.5, // Scaled visual distance from Earth
            speed: 0.15, // Speed around Earth
            rotation: 0.01 // Axial spin
        };

        const texture = loader.load(TEXTURES.moon);
        const geometry = new THREE.SphereGeometry(moonData.size, 32, 32);
        const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
        const moonMesh = new THREE.Mesh(geometry, material);

        // Slight orbital tilt (approx 5 degrees)
        moonOrbitPivot.rotation.x = Math.PI / 36;

        moonMesh.position.set(moonData.distance, 0, 0);
        moonMesh.castShadow = true;
        moonMesh.receiveShadow = true;

        // The Moon mesh must be placed in an axial holder so its rotation doesn't wobble
        const moonAxialHolder = new THREE.Object3D();
        moonAxialHolder.position.copy(moonMesh.position);
        moonMesh.position.set(0, 0, 0); // Zero out relative to axial holder
        moonAxialHolder.add(moonMesh);
        moonOrbitPivot.add(moonAxialHolder);

        // Orbital track for the Moon
        const orbitPoints = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(Math.cos(angle) * moonData.distance, 0, Math.sin(angle) * moonData.distance));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitCircle = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }));
        moonOrbitPivot.add(orbitCircle);

        this.moon = {
            mesh: moonMesh,
            pivot: moonOrbitPivot,
            axial: moonAxialHolder,
            orbit: orbitCircle,
            data: moonData
        };
    }

    createPlanets() {
        PLANETS_DATA.forEach(data => {
            const planetInfo = this.createPlanet(data);
            if (data.name === 'Earth') {
                this.createMoon(planetInfo);
            }
        });
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        // Cinematic bloom configuring: subtle highlights, strong sun glow
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 1.2, 0.5, 0.4);
        this.composer.addPass(bloomPass);
    }

    // --- ANIMATIONS ---

    initIntroAnimation() {
        const tl = gsap.timeline();
        tl.to(this.camera.position, {
            x: 0, y: 180, z: 450,
            duration: 3,
            ease: "power3.inOut"
        });
        tl.to(this.controls.target, {
            x: 0, y: 0, z: 0,
            duration: 3,
            ease: "power3.inOut"
        }, 0);

        this.animateIntroLighting();
    }

    animateIntroLighting() {
        // Start dark
        this.sunLight.intensity = 0;
        this.renderer.toneMappingExposure = 0.3;

        // Fade in cinematically
        gsap.to(this.sunLight, { intensity: this.defaultLightIntensity, duration: 3, ease: "power2.inOut" });
        gsap.to(this.renderer, { toneMappingExposure: 1.0, duration: 3, ease: "power2.inOut" });
    }

    initPlanetsEntry() {
        this.planets.forEach((p, index) => {
            gsap.to(p.container.scale, {
                x: 1, y: 1, z: 1,
                duration: 1.5,
                delay: 2 + (index * 0.2),
                ease: "back.out(1.7)"
            });
        });
    }

    updateLightingWithCamera() {
        if (!this.sunLight || !this.sun) return;

        // Skip dynamic updates if focusing on a planet (handled by GSAP)
        if (this.focusedObject) return;

        const dist = this.camera.position.length();
        const normalizedDist = THREE.MathUtils.clamp(1.0 - (dist - 200) / 4000, 0, 1);

        // Because decay=0, we don't need wild intensity boosts. Subtle tweaks.
        const targetIntensity = this.defaultLightIntensity * (0.9 + normalizedDist * 0.2);
        this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, targetIntensity, 0.05);

        // Adjust exposure smoothly
        const targetExposure = 0.8 + normalizedDist * 0.3;
        this.renderer.toneMappingExposure = THREE.MathUtils.lerp(this.renderer.toneMappingExposure, targetExposure, 0.05);

        // Light follow effect: subtly offset light toward camera to illuminate dark sides just a bit (cinematic trick)
        const dirToCamera = this.camera.position.clone().normalize();
        const lightOffset = dirToCamera.multiplyScalar(4);
        this.sunLight.position.lerp(lightOffset, 0.05);
    }

    focusPlanetLighting(obj, isSun) {
        if (isSun) {
            gsap.to(this.sunLight, { intensity: this.defaultLightIntensity * 1.2, duration: 3, ease: "power3.inOut" });
            gsap.to(this.renderer, { toneMappingExposure: 1.1, duration: 3, ease: "power3.inOut" });
            gsap.to(this.sunLight.position, { x: 0, y: 0, z: 0, duration: 3, ease: "power3.inOut" });
            return;
        }

        const targetPos = new THREE.Vector3();
        obj.getWorldPosition(targetPos);

        // Dim scene slightly to pop the focused planet
        gsap.to(this.renderer, { toneMappingExposure: 0.85, duration: 3, ease: "power3.inOut" });
        gsap.to(this.sunLight, { intensity: this.defaultLightIntensity * 0.9, duration: 3, ease: "power3.inOut" });

        // Offset light towards the planet and slightly towards camera for optimal highlights
        const lightTarget = targetPos.clone().normalize().multiplyScalar(12);

        // Add vertical variation for dynamic shadow casting
        lightTarget.y += 2;

        gsap.to(this.sunLight.position, {
            x: lightTarget.x, y: lightTarget.y, z: lightTarget.z,
            duration: 3, ease: "power3.inOut"
        });
    }

    focusPlanet(obj) {
        this.focusedObject = obj;
        const isSun = obj === this.sun;
        const data = isSun ? { name: 'Sun', type: 'Star', realRadius: '696,340 km', realDistance: '0 km', orbitalPeriod: 'N/A: Galactic Center', day: '25-35 days', desc: 'The bright star at the center of our solar system.' } : obj.userData;

        document.getElementById('info-name').textContent = data.name;
        document.getElementById('info-radius').textContent = data.realRadius || '-';
        document.getElementById('info-distance').textContent = data.realDistance || '-';
        document.getElementById('info-orbit').textContent = data.orbitalPeriod || '-';
        document.getElementById('info-day').textContent = data.day;
        document.getElementById('info-desc').textContent = data.desc;
        document.getElementById('planet-info').classList.remove('hidden');
        this.updateActivePlanetUI();

        // Cinematic background dimming & time dilation
        gsap.to(this.ambientLight, { intensity: 0.05, duration: 3, ease: "power3.inOut" });
        gsap.to(this, { simulationSpeed: 0.05, duration: 3, ease: "power3.inOut" });

        // Enable slow cinematic orbit around the focused target
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.8;

        const targetPos = new THREE.Vector3();
        obj.getWorldPosition(targetPos);
        const radius = isSun ? 14 : data.size;

        // Calculate cinematic offset angle
        const dirFromSun = targetPos.clone().normalize();
        if (isSun) dirFromSun.set(1, 0.5, 1).normalize();

        const offsetDist = radius * 5;
        const camPos = targetPos.clone().add(dirFromSun.multiplyScalar(offsetDist));
        // Add slightly up and precise offset for dramatic angle
        camPos.y += radius * 1.5;
        camPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8);

        gsap.to(this.camera.position, {
            x: camPos.x, y: camPos.y, z: camPos.z,
            duration: 3, ease: "power3.inOut"
        });
        gsap.to(this.controls.target, {
            x: targetPos.x, y: targetPos.y, z: targetPos.z,
            duration: 3, ease: "power3.inOut"
        });

        this.focusPlanetLighting(obj, isSun);
    }

    toggleCinematicMode(enabled) {
        this.cinematicMode = enabled;
        if (enabled) {
            this.focusedObject = null;
            document.getElementById('planet-info').classList.add('hidden');
            gsap.to(this.camera.position, { y: 200, z: 600, duration: 2 });
            gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 2 });
        }
    }

    resetView() {
        this.focusedObject = null;
        this.controls.autoRotate = false; // Disable individual object panning
        document.getElementById('planet-info').classList.add('hidden');
        this.updateActivePlanetUI();

        // Recover original distances and lighting
        gsap.to(this.camera.position, { x: 0, y: 180, z: 450, duration: 3, ease: "power3.inOut" });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 3, ease: "power3.inOut" });
        gsap.to(this.ambientLight, { intensity: 0.4, duration: 3, ease: "power3.inOut" });
        gsap.to(this.renderer, { toneMappingExposure: 1.0, duration: 3, ease: "power3.inOut" });

        // Restore appropriate simulation speed based on current UI toggle state
        const activeBtn = document.querySelector('.speed-btn.active');
        const targetSpeed = activeBtn ? parseFloat(activeBtn.dataset.speed) : 1.0;
        gsap.to(this, { simulationSpeed: targetSpeed, duration: 3, ease: "power3.inOut" });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.handleHover();
        });

        window.addEventListener('click', () => {
            if (this.hoveredObject) this.focusPlanet(this.hoveredObject);
        });

        const toggleCinematic = document.getElementById('toggle-cinematic');
        toggleCinematic.addEventListener('change', (e) => this.toggleCinematicMode(e.target.checked));

        document.getElementById('toggle-orbits').addEventListener('change', (e) => {
            this.planets.forEach(p => p.orbit.visible = e.target.checked);
            if (this.moon && this.moon.orbit) this.moon.orbit.visible = e.target.checked;
        });

        document.getElementById('close-info').addEventListener('click', () => this.resetView());

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (!this.focusedObject) { // Prevents overriding the cinematic slow-down if a planet is actively focused
                    this.simulationSpeed = parseFloat(btn.dataset.speed);
                }
            });
        });
    }

    createPlanetPanel() {
        const container = document.getElementById('planet-selector');
        if (!container) return;

        PLANETS_DATA.forEach(data => {
            const btn = document.createElement('button');
            btn.className = 'planet-btn';
            btn.dataset.planet = data.name;

            const hexColor = '#' + data.color.toString(16).padStart(6, '0');

            btn.innerHTML = `
                <span class="planet-icon" style="background: ${hexColor}; box-shadow: 0 0 5px ${hexColor}"></span>
                ${data.name}
            `;

            btn.addEventListener('click', () => this.handlePlanetClick(data.name));
            container.appendChild(btn);
        });
    }

    handlePlanetClick(name) {
        if (this.cinematicMode) return;
        const targetObj = this.planets.find(p => p.data.name === name)?.mesh;
        if (targetObj) this.focusPlanet(targetObj);
    }

    updateActivePlanetUI() {
        document.querySelectorAll('.planet-btn').forEach(btn => {
            if (this.focusedObject && this.focusedObject.userData && this.focusedObject.userData.name === btn.dataset.planet) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    handleHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const meshes = [this.sun, ...this.planets.map(p => p.mesh)];
        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (this.hoveredObject !== obj) {
                if (this.hoveredObject) gsap.to(this.hoveredObject.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                this.hoveredObject = obj;
                gsap.to(obj.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.3, ease: "power1.out" });
                this.showTooltip(obj === this.sun ? 'Sun' : obj.userData.name);
            }
            document.body.style.cursor = 'pointer';
        } else {
            if (this.hoveredObject) {
                gsap.to(this.hoveredObject.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                this.hoveredObject = null;
            }
            this.hideTooltip();
            document.body.style.cursor = 'default';
        }
    }

    showTooltip(text) {
        const tooltip = document.getElementById('tooltip');
        document.getElementById('tooltip-text').textContent = text;
        tooltip.style.opacity = '1';
        tooltip.style.left = `${(this.mouse.x + 1) * window.innerWidth / 2 + 20}px`;
        tooltip.style.top = `${-(this.mouse.y - 1) * window.innerHeight / 2 - 20}px`;
    }

    hideTooltip() {
        document.getElementById('tooltip').style.opacity = '0';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta() * this.simulationSpeed;

        // Keplerian Orbit Evaluation
        const maxDelta = Math.min(delta, 0.1);

        this.planets.forEach(p => {
            // Apply Kepler's law calculated travel around the sun
            p.pivot.rotation.y -= p.data.calculatedSpeed * maxDelta * 0.1;

            // Apply unique axial rotation (Spinning very clearly to visualize day/night)
            p.mesh.rotation.y += p.data.rotation * maxDelta * 50;
        });

        // Ensure clearly visible sun spin
        if (this.sun) this.sun.rotation.y += 0.5 * delta;

        // Moon hierarchical animation
        if (this.moon) {
            // Moon orbits Earth (independent of Earth's spin because it's attached to the axialHolder, not the Earth mesh)
            this.moon.pivot.rotation.y -= this.moon.data.speed * maxDelta;
            // Moon spins on its own axis
            this.moon.mesh.rotation.y += this.moon.data.rotation * maxDelta * 50;
        }

        // Follow focused object
        if (this.focusedObject) {
            const worldPos = new THREE.Vector3();
            this.focusedObject.getWorldPosition(worldPos);
            this.controls.target.lerp(worldPos, 0.1);
        }

        // Cinematic mode
        if (this.cinematicMode && !this.focusedObject) {
            const time = Date.now() * 0.0002;
            this.camera.position.x = Math.sin(time) * 600;
            this.camera.position.z = Math.cos(time) * 600;
            this.camera.position.y = 200 + Math.sin(time * 0.5) * 50;
            this.camera.lookAt(0, 0, 0);
        }

        if (!this.focusedObject) {
            this.updateLightingWithCamera();
        }

        // Particle System Dynamics (Twinkling, Drifting, and Mouse Parallax)
        if (this.starMat) this.starMat.uniforms.time.value += delta;
        if (this.dustMat) this.dustMat.uniforms.time.value += delta;

        const parallaxX = this.mouse.x * 30;
        const parallaxY = this.mouse.y * 30;

        if (this.particleGroups) {
            this.particleGroups.forEach((group, index) => {
                const depthFactor = (index + 1) * 0.15;
                // Parallax easing
                group.position.x += (parallaxX * depthFactor - group.position.x) * 0.05;
                group.position.y += (parallaxY * depthFactor - group.position.y) * 0.05;
                // Subtle global spin based on depth
                group.rotation.y -= 0.00005 * (index + 1);
            });
        }

        this.controls.update();
        this.composer.render();
    }
}

new SolarSystemApp();
