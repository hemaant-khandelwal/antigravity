// WebGL Starfield Background — Three.js (uses global THREE from CDN)
console.log('⭐ Starfield initializing...');


const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.pointerEvents = 'none';
renderer.domElement.id = 'starfield-canvas';
document.body.prepend(renderer.domElement);

// --- Circular glow texture ---
function createGlowTexture(innerColor, outerColor) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, innerColor);
    g.addColorStop(0.08, innerColor);
    g.addColorStop(0.3, 'rgba(255,255,255,0.3)');
    g.addColorStop(0.6, outerColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
}

const starTexture = createGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
const accentTexture = createGlowTexture('rgba(0,229,255,1)', 'rgba(0,229,255,0)');

// --- Main starfield (1200 stars, visible through camera frustum) ---
const STAR_COUNT = 1200;
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(STAR_COUNT * 3);
const starColors = new Float32Array(STAR_COUNT * 3);

const accentColor = new THREE.Color('#00E5FF');
const whiteColor = new THREE.Color('#ffffff');
const warmColor = new THREE.Color('#ffeacc');

// Camera at z=5, fov=60 → visible x: ±2.9, y: ±1.6 at z=0
// Spread stars: x ±4, y ±3, z -2 to 7
for (let i = 0; i < STAR_COUNT; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 8;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 9 + 1;

    const rand = Math.random();
    let color;
    if (rand < 0.06) {
        color = accentColor.clone().multiplyScalar(0.5 + Math.random() * 0.5);
    } else if (rand < 0.15) {
        color = warmColor.clone().multiplyScalar(0.5 + Math.random() * 0.5);
    } else {
        color = whiteColor.clone().multiplyScalar(0.4 + Math.random() * 0.6);
    }
    starColors[i * 3] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;
}

starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

const starMat = new THREE.PointsMaterial({
    size: 0.12,
    map: starTexture,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9,
});

const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// --- Accent glow particles (cyan, fewer, larger, closer) ---
const ACCENT_COUNT = 40;
const accentGeo = new THREE.BufferGeometry();
const accentPositions = new Float32Array(ACCENT_COUNT * 3);
const accentDrift = [];

for (let i = 0; i < ACCENT_COUNT; i++) {
    accentPositions[i * 3] = (Math.random() - 0.5) * 4;
    accentPositions[i * 3 + 1] = (Math.random() - 0.5) * 3;
    accentPositions[i * 3 + 2] = (Math.random() - 0.5) * 4 + 1.5;
    accentDrift.push({
        vx: (Math.random() - 0.5) * 0.003,
        vy: (Math.random() - 0.5) * 0.003,
        vz: (Math.random() - 0.5) * 0.002,
    });
}

accentGeo.setAttribute('position', new THREE.BufferAttribute(accentPositions, 3));

const accentMat = new THREE.PointsMaterial({
    size: 0.35,
    map: accentTexture,
    color: '#00E5FF',
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.4,
});

const accentParticles = new THREE.Points(accentGeo, accentMat);
scene.add(accentParticles);

// --- Twinkling bright stars (few, large, blink) ---
const TWINKLE_COUNT = 25;
const twinkleGeo = new THREE.BufferGeometry();
const twinklePositions = new Float32Array(TWINKLE_COUNT * 3);
const twinklePhases = [];

for (let i = 0; i < TWINKLE_COUNT; i++) {
    twinklePositions[i * 3] = (Math.random() - 0.5) * 6;
    twinklePositions[i * 3 + 1] = (Math.random() - 0.5) * 4;
    twinklePositions[i * 3 + 2] = (Math.random() - 0.5) * 6 + 1;
    twinklePhases.push(Math.random() * Math.PI * 2);
}

twinkleGeo.setAttribute('position', new THREE.BufferAttribute(twinklePositions, 3));

const twinkleMat = new THREE.PointsMaterial({
    size: 0.5,
    map: starTexture,
    color: '#ffffff',
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.7,
});

const twinkleStars = new THREE.Points(twinkleGeo, twinkleMat);
scene.add(twinkleStars);

// --- Animation loop ---
function animate(time) {
    requestAnimationFrame(animate);

    const t = time * 0.001;

    // Slow rotation
    stars.rotation.y += 0.00015;
    stars.rotation.x += 0.00006;
    twinkleStars.rotation.y -= 0.0001;

    // Drift accent particles
    const posArr = accentParticles.geometry.attributes.position.array;
    for (let i = 0; i < ACCENT_COUNT; i++) {
        const idx = i * 3;
        posArr[idx] += accentDrift[i].vx;
        posArr[idx + 1] += accentDrift[i].vy;
        posArr[idx + 2] += accentDrift[i].vz;
        if (Math.abs(posArr[idx]) > 2) posArr[idx] *= -1;
        if (Math.abs(posArr[idx + 1]) > 1.5) posArr[idx + 1] *= -1;
        if (Math.abs(posArr[idx + 2]) > 2) posArr[idx + 2] *= -1;
    }
    accentParticles.geometry.attributes.position.needsUpdate = true;

    // Pulsing twinkling
    twinkleMat.opacity = 0.45 + Math.sin(t * 2.5) * 0.25;

    // Subtle accent pulse
    accentMat.opacity = 0.3 + Math.sin(t * 1.7) * 0.15;

    renderer.render(scene, camera);
}

// --- Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('✅ Starfield active —', STAR_COUNT, 'stars,', ACCENT_COUNT, 'accent particles');
requestAnimationFrame(animate);

animate();
