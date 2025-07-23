// Game variables
let scene, camera, renderer;
let player; // Container for camera that moves through world
let road, grass, sky;
let roadTexture, grassTexture, skyTexture;
let treesTexture, grassSpritesTexture;
let carInteriorCTexture, carInteriorLTexture, carInteriorRTexture;
let gatehouseTexture;
let soldierStopTexture, soldierCasualTexture, soldierAimingTexture, soldierLeaning1Texture, soldierLeaning2Texture, soldierAiming2Texture;
let treesData, grassSpritesData;
let sprites = [];
let carInterior;
let speed = 0;
let maxSpeed = .105; // Much slower for better timing
let gameStartTime = 0;
let isAutoDriving = false; // Track if we're in auto-drive mode
let crossfadeStarted = false; // Track if music crossfade has started
let soldierWalkingToWindow = false; // Track if soldier is walking to window
let walkingSoldier = null; // Reference to the walking soldier sprite
let soldierAtWindow = false; // Track if soldier reached the window
let carStopped = false; // Track if car has fully stopped
let stopTime = 0; // When the car stopped
let dialogueStarted = false; // Track if dialogue sequence has started
let mouthAnimationInterval = null; // For toggling mouth animation
let showingDenominations = false; // Track if showing denomination list
let allSoldiers = []; // Store references to all soldier sprites
let muzzleFlash = null; // Muzzle flash sprite for gunshot effect
let instructionsShown = false; // Track if initial instructions have been shown

// Video system
let videos = [];
let videoSprites = [];
let videoPositions = []; // Will store Z positions for each video
let videosPlayed = []; // Track which videos have already been played
let videoProximities = []; // Trigger distances for each video
let playthroughCount = 0; // Track which playthrough we're on for video patterns

// Audio system
let backgroundMusic;
let forestMusic;
let carSound;
let religionAudio, catholicAudio, whatKindAudio, wrongAudio, gunshotAudio, ringingAudio, footstepsAudio;

// Audio volume controls - adjust these to balance all sounds
const audioLevels = {
    backgroundMusic: 0.03,  // Background music volume (0.0 to 1.0)
    forestMusic: 0.05,     // Forest music volume for gatehouse scene
    carSound: 0.2,         // Car engine sound volume
    videoAudio: .6      // Video dialogue volume
};

// Start audio on first user input
function startAudioIfNeeded() {
    // Check if we've already initialized audio
    if (window.audioInitialized) return;
    window.audioInitialized = true;
    
    // Enable all audio files for mobile by playing then pausing
    const audioFiles = [
        religionAudio, catholicAudio, whatKindAudio, wrongAudio, 
        gunshotAudio, ringingAudio, footstepsAudio
    ];
    
    // Handle non-continuous audio files
    audioFiles.forEach(audio => {
        if (audio && audio.paused) {
            const originalVolume = audio.volume;
            audio.volume = 0;
            
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = originalVolume;
            }).catch(err => {
                console.log('Audio enable error:', err);
                audio.volume = originalVolume;
            });
        }
    });
    
    // Handle continuous audio (background music and car sound) separately
    if (backgroundMusic && backgroundMusic.paused) {
        backgroundMusic.play().catch(err => console.log('Background music error:', err));
    }
    
    if (carSound && carSound.paused) {
        carSound.play().catch(err => console.log('Car sound error:', err));
    }
    
    // Enable all video elements for mobile only
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && !window.videosInitialized) {
        window.videosInitialized = true;
        console.log('Mobile detected - attempting to enable', videos.length, 'videos...');
        videos.forEach((video, index) => {
            if (video && video.paused) {
                console.log(`Enabling video ${index + 1}:`, video.src);
                video.play().then(() => {
                    console.log(`Video ${index + 1} enabled successfully`);
                    video.pause();
                    video.currentTime = 0;
                }).catch(err => {
                    console.error(`Video ${index + 1} enable error:`, err);
                    video.muted = true;
                    video.play().then(() => {
                        console.log(`Video ${index + 1} enabled with mute`);   
                        video.pause();
                        video.currentTime = 0;
                        video.muted = false;
                    }).catch(err2 => console.error(`Video ${index + 1} muted enable error:`, err2));
                });
            }
        });
    } else if (!isMobile) {
        console.log('Desktop detected - skipping video pre-enable');
    }
}

// Crossfade from background music to forest music over longer period
function startMusicCrossfade() {
    if (!forestMusic || !backgroundMusic || crossfadeStarted) return;
    
    crossfadeStarted = true;
    
    // Start forest music at very low volume
    forestMusic.volume = 0;
    forestMusic.play().catch(err => console.log('Forest music error:', err));
    
    // Long crossfade over ~20 seconds (from Z=-200 to Z=-220)
    const fadeInterval = setInterval(() => {
        // Fade out background music gradually
        if (backgroundMusic.volume > 0.002) {
            backgroundMusic.volume = Math.max(0, backgroundMusic.volume - 0.002);
        } else {
            backgroundMusic.volume = 0;
            backgroundMusic.pause();
        }
        
        // Fade in forest music gradually
        if (forestMusic.volume < audioLevels.forestMusic) {
            forestMusic.volume = Math.min(audioLevels.forestMusic, forestMusic.volume + 0.003);
        }
        
        // Stop when crossfade is complete
        if (backgroundMusic.volume <= 0 && forestMusic.volume >= audioLevels.forestMusic) {
            clearInterval(fadeInterval);
        }
    }, 200); // Slower interval for longer fade
    
    console.log('Music crossfade started (long version)');
}

// Clear fog when approaching gatehouse
function clearFog() {
    scene.fog = null;
    console.log('Fog cleared for gatehouse scene');
}

// Start the soldier waddle animation
function startSoldierWaddle() {
    soldierWalkingToWindow = true;
    
    // Find the soldier-stop1 sprite (the first soldier we created)
    const soldiers = scene.children.filter(child => 
        child.material && child.material.map === soldierStopTexture
    );
    
    if (soldiers.length > 0) {
        walkingSoldier = soldiers[0];
        
        // Start footsteps audio
        footstepsAudio.play().catch(err => console.log('Footsteps audio error:', err));
        
        console.log('Soldier starts waddling to car window with footsteps');
    }
}

// Input handling
let keys = {};
let mouse = { x: 0, y: 0 };
let isPointerLocked = false;

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x222222, 30, 120); // Darker gray fog, closer range

    // Create player object (the car) that moves through world
    player = new THREE.Object3D();
    scene.add(player);

    // Create camera (first person view from car)
    const canvas = document.getElementById('gameCanvas');
    const aspect = 9 / 16; // Mobile aspect ratio
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 2.15, -.4); // Sitting in car height
    player.add(camera); // Camera is child of player object

    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(360, 640); // 9:16 base resolution
    renderer.setClearColor(0x000011);

    // Load textures and create scene
    loadTextures();
}

// Load all textures
function loadTextures() {
    const loader = new THREE.TextureLoader();
    let texturesLoaded = 0;
    const totalTextures = 15; // Added sprite sheets + 3 car interior panels + gatehouse + 6 soldiers

    function onTextureLoad() {
        texturesLoaded++;
        if (texturesLoaded === totalTextures) {
            loadSpriteData();
        }
    }

    // Load dirt road texture
    roadTexture = loader.load('textures/dirt-night.png', onTextureLoad);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 20); // Repeat along road length

    // Load grass texture
    grassTexture = loader.load('textures/grass-night.png', onTextureLoad);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(10, 20);

    // Load sky texture
    skyTexture = loader.load('textures/nightsky.png', onTextureLoad);
    skyTexture.wrapS = THREE.RepeatWrapping;
    skyTexture.wrapT = THREE.RepeatWrapping;
    skyTexture.repeat.set(8, 4); // Tile the sky texture

    // Load sprite textures
    treesTexture = loader.load('sprites/trees/trees.png', onTextureLoad);
    grassSpritesTexture = loader.load('sprites/grass/grass.png', onTextureLoad);
    
    // Load car interior panel textures
    carInteriorCTexture = loader.load('sprites/car-interiorC.webp', onTextureLoad);
    carInteriorLTexture = loader.load('sprites/car-interiorL.webp', onTextureLoad);
    carInteriorRTexture = loader.load('sprites/car-interiorR.webp', onTextureLoad);
    
    // Load gatehouse texture
    gatehouseTexture = loader.load('sprites/gatehouse.webp', onTextureLoad);
    
    // Load soldier textures
    soldierStopTexture = loader.load('sprites/soldiers/soldier-stop1.webp', onTextureLoad);
    soldierCasualTexture = loader.load('sprites/soldiers/soldier-casual1.webp', onTextureLoad);
    soldierAimingTexture = loader.load('sprites/soldiers/soldier-aiming.webp', onTextureLoad);
    soldierLeaning1Texture = loader.load('sprites/soldiers/soldier-leaning1.webp', onTextureLoad);
    soldierLeaning2Texture = loader.load('sprites/soldiers/soldier-leaning2.webp', onTextureLoad);
    soldierAiming2Texture = loader.load('sprites/soldiers/soldier-aiming.webp', onTextureLoad);
}

// Load sprite JSON data
function loadSpriteData() {
    let dataLoaded = 0;
    const totalData = 2;

    function onDataLoad() {
        dataLoaded++;
        if (dataLoaded === totalData) {
            createScene();
            createSprites();
            createGatehouse();
            createSoldier();
            
            // Initialize first playthrough
            playthroughCount = 1;
            createVideoSystem();
            createAudioSystem();
        
            createCarInterior();
            gameStartTime = Date.now();
            
            // Show instructions on first load
            showInstructions();
            
            animate();
        }
    }

    // Load trees JSON
    fetch('sprites/trees/trees.json')
        .then(response => response.json())
        .then(data => {
            treesData = data;
            onDataLoad();
        });

    // Load grass JSON
    fetch('sprites/grass/grass.json')
        .then(response => response.json())
        .then(data => {
            grassSpritesData = data;
            onDataLoad();
        });
}

// Create the 3D scene
function createScene() {
    // Create road - make it longer to continue past the gatehouse
    const roadGeometry = new THREE.PlaneGeometry(8, 800); // Double length
    const roadMaterial = new THREE.MeshBasicMaterial({ 
        map: roadTexture,
        side: THREE.DoubleSide
    });
    road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Lay flat
    road.position.set(0, 0, -400); // Move back to center the longer road
    scene.add(road);

    // Create grass on left side - extend to match road
    const grassGeometry = new THREE.PlaneGeometry(20, 800);
    const grassMaterial = new THREE.MeshBasicMaterial({ 
        map: grassTexture,
        side: THREE.DoubleSide
    });
    
    const grassLeft = new THREE.Mesh(grassGeometry, grassMaterial);
    grassLeft.rotation.x = -Math.PI / 2;
    grassLeft.position.set(-14, 0, -400);
    scene.add(grassLeft);

    // Create grass on right side
    const grassRight = new THREE.Mesh(grassGeometry, grassMaterial);
    grassRight.rotation.x = -Math.PI / 2;
    grassRight.position.set(14, 0, -400);
    scene.add(grassRight);

    // Create sky sphere - brighten the texture
    const skyGeometry = new THREE.SphereGeometry(100, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
        map: skyTexture,
        side: THREE.BackSide
    });
    // Make the sky brighter
    skyMaterial.color.setHex(0x888888); // Brighten it significantly
    sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.set(0, 10, 0);
    scene.add(sky);
    
    console.log('Sky texture loaded:', skyTexture ? 'Yes' : 'No');

    // Add some basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    console.log('Scene created successfully!');
}

// Create forest sprites along road
function createSprites() {
    // Create dense forest along both sides of the road
    const gatehouseZ = -300; // Position where gatehouse will be
    const clearingStart = gatehouseZ - 30; // Start clearing before gatehouse
    const clearingEnd = gatehouseZ + 30; // End clearing after gatehouse
    
    for (let i = 0; i < 200; i++) { // Much more sprites
        const z = -800 + (i * 4); // Extended range for longer road
        
        // Skip trees in the clearing area around gatehouse
        const inClearing = z >= clearingStart && z <= clearingEnd;
        
        // Create multiple rows on each side for depth
        for (let row = 0; row < 3; row++) {
            if (!inClearing) {
                // Left side
                const leftX = -(8 + row * 5 + Math.random() * 3);
                if (Math.random() > 0.2) { // 80% chance for trees
                    createTreeSprite(leftX, z + Math.random() * 2);
                } else {
                    createGrassSprite(leftX, z + Math.random() * 2);
                }
                
                // Right side
                const rightX = (8 + row * 5 + Math.random() * 3);
                if (Math.random() > 0.2) { // 80% chance for trees
                    createTreeSprite(rightX, z + Math.random() * 2);
                } else {
                    createGrassSprite(rightX, z + Math.random() * 2);
                }
            }
        }
    }
    
    console.log(`Created ${sprites.length} sprites`);
}

// Create a tree sprite
function createTreeSprite(x, z) {
    const treeIndex = Math.floor(Math.random() * treesData.frames.length);
    const treeFrame = treesData.frames[treeIndex];
    
    const sprite = createBillboardSprite(
        treesTexture,
        treeFrame,
        treesData.meta.size
    );
    
    sprite.position.set(x, treeFrame.sourceSize.h / 200, z); // Scale down height
    sprite.scale.set(2, 2, 2); // Make trees bigger
    sprites.push(sprite);
    scene.add(sprite);
}

// Create a grass sprite
function createGrassSprite(x, z) {
    const grassIndex = Math.floor(Math.random() * grassSpritesData.frames.length);
    const grassFrame = grassSpritesData.frames[grassIndex];
    
    const sprite = createBillboardSprite(
        grassSpritesTexture,
        grassFrame,
        grassSpritesData.meta.size
    );
    
    sprite.position.set(x, grassFrame.sourceSize.h / 400, z); // Scale down height
    sprite.scale.set(1, 1, 1);
    sprites.push(sprite);
    scene.add(sprite);
}

// Create a billboard sprite from texture atlas
function createBillboardSprite(texture, frame, atlasSize) {
    const geometry = new THREE.PlaneGeometry(
        frame.sourceSize.w / 100,
        frame.sourceSize.h / 100
    );
    
    // Create UV coordinates for the sprite frame
    const uvs = geometry.attributes.uv.array;
    const u1 = frame.frame.x / atlasSize.w;
    const u2 = (frame.frame.x + frame.frame.w) / atlasSize.w;
    const v1 = 1 - (frame.frame.y + frame.frame.h) / atlasSize.h; // Flip V
    const v2 = 1 - frame.frame.y / atlasSize.h;
    
    // Set UV coordinates for each vertex
    uvs[0] = u1; uvs[1] = v2; // bottom-left
    uvs[2] = u2; uvs[3] = v2; // bottom-right
    uvs[4] = u1; uvs[5] = v1; // top-left
    uvs[6] = u2; uvs[7] = v1; // top-right
    
    geometry.attributes.uv.needsUpdate = true;
    
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
    });
    
    const sprite = new THREE.Mesh(geometry, material);
    // No billboard - sprites face forward along road
    sprite.rotation.y = 0; // Face forward
    
    return sprite;
}

// Create video system
function createVideoSystem() {
    // Define all video files - Pattern A (odd playthroughs) and Pattern B (even playthroughs)
    const videoFilesPatternA = [
        '1no-democracy.webm',
        '2no-i-dont.webm', 
        '3what-do-you-believe-in-autocracy.webm',
        '4by-who.webm',
        '5catholic-teachings.webm',
        '6and-if-that-autocrat.webm',
        '7im-not-part-of-the-group.webm'
    ];
    
    const videoFilesPatternB = [
        '8little-bit-more.webm',
        '9hey-what-can-i-say.webm', 
        '10say-im-a-fascist.webm',
        '11yeah-i-am.webm',
        '12laughter.webm',
        '6and-if-that-autocrat.webm',  // Videos 6-7 stay the same
        '7im-not-part-of-the-group.webm'
    ];
    
    // Choose video pattern based on playthrough count
    // Odd playthroughs (1, 3, 5...) use Pattern A, even (2, 4, 6...) use Pattern B
    const isPatternA = (playthroughCount % 2 === 1);
    const videoFiles = isPatternA ? videoFilesPatternA : videoFilesPatternB;
    
    console.log(`Playthrough ${playthroughCount}: Using ${isPatternA ? 'Pattern A (1-7)' : 'Pattern B (8-12, 6-7)'}`);
    console.log('Video sequence:', videoFiles);
    
    // Video positioning arrays - easy to customize each video
    videoPositions = [-50, -80, -110, -130, -155, -200, -240]; // Z positions along road
    const videoHeights = [2, 2, 2, 2, 2, 2, 2]; // Y coordinates (elevation)
    const videoSizes = [
        {width: 7, height: 5}, // Video 1
        {width: 7, height: 5}, // Video 2  
        {width: 7, height: 5}, // Video 3
        {width: 7, height: 5}, // Video 4
        {width: 7, height: 5}, // Video 5
        {width: 7, height: 5}, // Video 6
        {width: 7, height: 5}  // Video 7
    ];
    videoProximities = [30, 50, 35, 70, 80, 50, 70]; // Trigger distances for each video
    
    // Load videos without playing them
    videoFiles.forEach((filename, index) => {
        const video = document.createElement('video');
        video.src = `videos/${filename}`;
        video.preload = 'metadata';
        video.muted = false; // Enable audio playback
        video.volume = audioLevels.videoAudio; // Set video audio level
        video.crossOrigin = 'anonymous';
        video.autoplay = false; // Explicitly prevent autoplay
        video.loop = false;
        
        // Store video element
        videos[index] = video;
        
        // Create sprite placeholder (no texture yet)
        const size = videoSizes[index];
        const geometry = new THREE.PlaneGeometry(size.width, size.height);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            opacity: 0 // Initially invisible
        });
        
        const sprite = new THREE.Mesh(geometry, material);
        sprite.position.set(0, videoHeights[index], videoPositions[index]); // Middle of road, custom height
        sprite.frustumCulled = false; // Prevent disappearing when close
        
        videoSprites[index] = sprite;
        scene.add(sprite);
        
        console.log(`Video ${index + 1} (${filename}) loaded at Z=${videoPositions[index]}`);
    });
    
    // Initialize played tracking - all videos start as not played
    videosPlayed = new Array(videoFiles.length).fill(false);
    
    console.log('Video system initialized - videos loaded but paused');
}

// Create audio system
function createAudioSystem() {
    // Load background music
    backgroundMusic = new Audio('audio/ride-of-the-nazi-soy-boy.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = audioLevels.backgroundMusic;
    
    // Load forest music
    forestMusic = new Audio('audio/forest.mp3');
    forestMusic.loop = true;
    forestMusic.volume = audioLevels.forestMusic;
    
    // Load car sound
    carSound = new Audio('audio/car.mp3');
    carSound.loop = true;
    carSound.volume = audioLevels.carSound;
    
    // Load dialogue audio
    religionAudio = new Audio('audio/religion.mp3');
    religionAudio.volume = audioLevels.videoAudio;
    
    catholicAudio = new Audio("audio/i'm-a-catholic.mp3");
    catholicAudio.volume = audioLevels.videoAudio;
    
    whatKindAudio = new Audio('audio/what-kind.mp3');
    whatKindAudio.volume = audioLevels.videoAudio;
    
    // Load ending sequence audio
    wrongAudio = new Audio('audio/wrong.mp3');
    wrongAudio.volume = audioLevels.videoAudio;
    
    gunshotAudio = new Audio('audio/gunshot.mp3');
    gunshotAudio.volume = audioLevels.videoAudio;
    
    ringingAudio = new Audio('audio/ringing.mp3');
    ringingAudio.volume = audioLevels.videoAudio;
    
    footstepsAudio = new Audio('audio/footsteps.mp3');
    footstepsAudio.volume = audioLevels.videoAudio;
    footstepsAudio.loop = true; // Loop while walking
    
    // Background music will start after user interaction (browser requirement)
    console.log('Background music loaded - will start after user clicks');
    
    console.log('Audio system initialized');
}

// Create gatehouse sprite
function createGatehouse() {
    const gatehouseGeometry = new THREE.PlaneGeometry(15, 15); // Adjust size as needed
    const gatehouseMaterial = new THREE.MeshBasicMaterial({
        map: gatehouseTexture,
        transparent: true,
        alphaTest: 0.1
    });
    
    const gatehouse = new THREE.Mesh(gatehouseGeometry, gatehouseMaterial);
    gatehouse.position.set(-5, 5, -300); // Left side of road at clearing
    gatehouse.rotation.y = 0; // Face forward
    
    scene.add(gatehouse);
    console.log('Gatehouse created at clearing');
}

// Create soldiers at gatehouse
function createSoldier() {
    const soldierGeometry = new THREE.PlaneGeometry(4, 6); // Soldier size
    
    // Soldier 1: Stop pose in front of gatehouse
    const soldierStopMaterial = new THREE.MeshBasicMaterial({
        map: soldierStopTexture,
        transparent: true,
        alphaTest: 0.1
    });
    const soldierStop = new THREE.Mesh(soldierGeometry, soldierStopMaterial);
    soldierStop.position.set(-2, 3, -295); // In front of gatehouse
    soldierStop.rotation.y = 0; // Face forward
    soldierStop.userData = { type: 'stop', originalTexture: soldierStopTexture };
    scene.add(soldierStop);
    allSoldiers.push(soldierStop);
    
    // Soldier 2: Casual pose on other side of road
    const soldierCasualMaterial = new THREE.MeshBasicMaterial({
        map: soldierCasualTexture,
        transparent: true,
        alphaTest: 0.1
    });
    const soldierCasual = new THREE.Mesh(soldierGeometry, soldierCasualMaterial);
    soldierCasual.position.set(3, 3, -295); // Other side of road
    soldierCasual.rotation.y = 0; // Face forward
    soldierCasual.userData = { type: 'casual', originalTexture: soldierCasualTexture };
    scene.add(soldierCasual);
    allSoldiers.push(soldierCasual);
    
    // Soldier 3: Aiming pose to the left of first soldier, in front of door
    const soldierAimingMaterial = new THREE.MeshBasicMaterial({
        map: soldierAimingTexture,
        transparent: true,
        alphaTest: 0.1
    });
    const soldierAiming = new THREE.Mesh(soldierGeometry, soldierAimingMaterial);
    soldierAiming.position.set(-6, 3, -298); // To the left and closer to gatehouse door
    soldierAiming.rotation.y = 0; // Face forward
    soldierAiming.userData = { type: 'aiming', originalTexture: soldierAimingTexture };
    scene.add(soldierAiming);
    allSoldiers.push(soldierAiming);
    
    console.log('Three soldiers created at gatehouse');
    
    // Create muzzle flash effect (initially invisible)
    createMuzzleFlash();
}

// Create muzzle flash effect for gunshot
function createMuzzleFlash() {
    const flashGeometry = new THREE.PlaneGeometry(0.8, 0.8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff88, // Bright yellow-white
        transparent: true,
        opacity: 0 // Initially invisible
    });
    
    muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
    muzzleFlash.position.set(-0.8, 2.2, -276); // At the gun barrel position
    muzzleFlash.rotation.y = Math.PI / 2; // Face toward car
    scene.add(muzzleFlash);
    
    console.log('Muzzle flash effect created');
}

// Trigger muzzle flash effect
function triggerMuzzleFlash() {
    if (!muzzleFlash) return;
    
    // Make flash visible and bright
    muzzleFlash.material.opacity = 1;
    muzzleFlash.material.color.setHex(0xffffff); // Bright white
    
    // Fade out quickly
    setTimeout(() => {
        if (muzzleFlash) {
            muzzleFlash.material.opacity = 0.6;
            muzzleFlash.material.color.setHex(0xffdd44); // Yellow
        }
    }, 50);
    
    setTimeout(() => {
        if (muzzleFlash) {
            muzzleFlash.material.opacity = 0; // Hide
        }
    }, 120);
    
    console.log('Muzzle flash triggered');
}

// Show initial instructions
function showInstructions() {
    if (instructionsShown) return;
    instructionsShown = true;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const instructionsContainer = document.createElement('div');
    instructionsContainer.id = 'instructions';
    instructionsContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        font-family: Arial, sans-serif;
        font-size: 18px;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    const title = document.createElement('div');
    title.innerHTML = 'Connor and the<br>Catholic Checkpoint';
    title.style.cssText = `
        font-family: "semplicitapro", sans-serif;
        font-weight: 700;
        font-style: italic;
        font-size: 28px;
        margin-bottom: 15px;
        color: #ffff88;
        text-align: center;
        line-height: 1.2;
    `;
    instructionsContainer.appendChild(title);
    
    const byline = document.createElement('div');
    byline.textContent = 'by GameJew aka songadaymann aka Jonathan Mann';
    byline.style.cssText = `
        font-family: "semplicitapro", sans-serif;
        font-weight: 400;
        font-style: normal;
        font-size: 14px;
        margin-bottom: 30px;
        color: #cccccc;
        text-align: center;
        line-height: 1.3;
    `;
    instructionsContainer.appendChild(byline);
    
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        margin-bottom: 30px;
        line-height: 1.6;
    `;
    
    if (isMobile) {
        // Mobile instructions
        controlsContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 24px; margin-bottom: 15px;">📱 Touch Controls</div>
                <div>Hold the <strong>DRIVE</strong> button to move forward</div>
                <div>Drag left ⟵ ⟶ right to look around</div>
            </div>
        `;
        
        // Add mobile drive button
        const driveButton = document.createElement('div');
        driveButton.id = 'mobile-drive-button';
        driveButton.textContent = 'DRIVE';
        driveButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 15px 30px;
            border: 2px solid #666;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
            z-index: 1500;
            display: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            touch-action: none;
            -webkit-tap-highlight-color: transparent;
        `;
        
        // Touch events for mobile drive button - prevent default and use proper key
        let isDriving = false;
        
        driveButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDriving) {
                isDriving = true;
                keys['KeyW'] = true; // Use KeyW which the movement code checks for
                startAudioIfNeeded();
                driveButton.style.backgroundColor = '#555';
            }
        }, { passive: false });
        
        driveButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDriving = false;
            keys['KeyW'] = false;
            keys['ArrowUp'] = false;
            driveButton.style.backgroundColor = '#333';
        }, { passive: false });
        
        driveButton.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDriving = false;
            keys['KeyW'] = false;
            keys['ArrowUp'] = false;
            driveButton.style.backgroundColor = '#333';
        }, { passive: false });
        
        document.body.appendChild(driveButton);
        
    } else {
        // Desktop instructions
        controlsContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 24px; margin-bottom: 15px;">🖥️ Desktop Controls</div>
                <div><strong>↑ Arrow Up</strong> or <strong>W</strong> - Drive forward</div>
                <div><strong>Mouse</strong> - Look left and right</div>
            </div>
        `;
    }
    
    instructionsContainer.appendChild(controlsContainer);
    
    const startButton = document.createElement('div');
    startButton.textContent = 'Click to Start';
    startButton.style.cssText = `
        background: #555;
        color: white;
        padding: 15px 30px;
        border: 2px solid #888;
        border-radius: 10px;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        transition: all 0.2s;
    `;
    
    startButton.addEventListener('mouseenter', () => {
        startButton.style.backgroundColor = '#777';
        startButton.style.borderColor = '#aaa';
    });
    startButton.addEventListener('mouseleave', () => {
        startButton.style.backgroundColor = '#555';
        startButton.style.borderColor = '#888';
    });
    
    startButton.addEventListener('click', () => {
        instructionsContainer.remove();
        
        // Show mobile drive button if on mobile
        if (isMobile) {
            const driveButton = document.getElementById('mobile-drive-button');
            if (driveButton) {
                driveButton.style.display = 'block';
            }
        }
        
        // Start audio if needed
        startAudioIfNeeded();
    });
    
    instructionsContainer.appendChild(startButton);
    document.body.appendChild(instructionsContainer);
    
    console.log('Instructions displayed');
}



// Create car interior panels
function createCarInterior() {
    // Create cockpit group that follows camera
    const cockpit = new THREE.Group();
    
    // Helper function to create panel with crisp pixels
    function loadPanel(texture, width = 2, height = 1.2) {
        texture.magFilter = texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        
        return new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true, 
                side: THREE.DoubleSide 
            })
        );
    }
    
    // Create center panel (dashboard/front)
    const centerPanel = loadPanel(carInteriorCTexture);
    centerPanel.position.set(0, 2, -1.0);
    cockpit.add(centerPanel);
    
    // Create left panel - using R texture on left side
    const leftPanel = loadPanel(carInteriorRTexture);
    leftPanel.position.set(-.36, 2, -1.36);
    leftPanel.rotation.y = Math.PI / 2; // Rotate to face right
    cockpit.add(leftPanel);
    
    // Create right panel - using L texture on right side
    const rightPanel = loadPanel(carInteriorLTexture);
    rightPanel.position.set(.31, 2, -1.32);
    rightPanel.rotation.y = -Math.PI / 2; // Rotate to face left
    cockpit.add(rightPanel);
    
    // Add cockpit to player so it stays fixed while you look around inside
    player.add(cockpit);
    carInterior = cockpit;
    
    console.log('3-panel car interior created');
}

// Handle input and movement
function handleInput() {
    const currentTime = (Date.now() - gameStartTime) / 1000; // Time in seconds
    
    // Start music crossfade early at Z=-200
    if (!crossfadeStarted && player.position.z <= -200) {
        startMusicCrossfade();
    }
    
    // Check if we should start auto-driving after final video at Z=-220
    if (!isAutoDriving && player.position.z <= -220) {
        isAutoDriving = true;
        console.log('Auto-drive activated');
    }
    
    if (isAutoDriving) {
        // Auto-drive to stop at Z=-270 (before the gatehouse)
        const targetZ = -270;
        if (player.position.z > targetZ) {
            speed = Math.max(speed + 0.002, 0.008); // Very very slow approach (40% of original speed)
        } else {
            speed *= 0.9; // Slow down as we approach
            if (speed < 0.01) {
                speed = 0; // Stop when close enough
                if (!carStopped) {
                    carStopped = true;
                    stopTime = Date.now();
                    console.log('Car stopped at gatehouse');
                }
            }
        }
        
        // Start soldier waddle 0.5 seconds after car stops
        if (carStopped && !soldierWalkingToWindow && (Date.now() - stopTime) > 500) {
            startSoldierWaddle();
        }
    } else {
        // Manual controls when not in auto mode
        if (keys['ArrowUp'] || keys['KeyW']) {
            startAudioIfNeeded(); // Start audio on movement input
            speed = Math.min(speed + 1, maxSpeed);
        } else if (keys['ArrowDown'] || keys['KeyS']) {
            startAudioIfNeeded(); // Start audio on movement input
            speed = Math.max(speed - 0.04, -maxSpeed * 1);
        } else {
            speed *= .5;
        }
    }

    // Move the player (car) forward through the world
    const forward = new THREE.Vector3();
    player.getWorldDirection(forward);
    forward.y = 0; // Stay on ground level
    forward.normalize();
    forward.negate(); // Keep the original direction - this was correct!
    player.position.addScaledVector(forward, speed);

    // Keep sky centered on player
    sky.position.copy(player.position);

    // Recycle sprites when they get too far behind
    const recycleDistance = 80;
    const loopLength = 800;
    
    sprites.forEach(sprite => {
        if (sprite.position.z - player.position.z > recycleDistance) {
            sprite.position.z -= loopLength;
        }
        if (player.position.z - sprite.position.z > recycleDistance) {
            sprite.position.z += loopLength;
        }
    });

    // Add subtle camera bob when moving (preserve your camera height)
    if (speed > 0.005) {
        const baseHeight = 2.15; // Match your camera height setting
        camera.position.y = baseHeight + Math.sin(Date.now() * 0.01 * speed) * 0.001; // Much smaller bob
        
        // Car sound plays continuously once started
    }
}

// Check proximity to videos and start playback
function checkVideoProximity() {
    const playerZ = player.position.z;
    
    // Debug log occasionally (every ~60 frames at 60fps = ~1 second)
    if (Math.floor(Date.now() / 1000) % 5 === 0 && Date.now() % 1000 < 16) {
        console.log(`Player Z: ${playerZ.toFixed(1)}, checking ${videos.length} videos`);
    }
    
    videos.forEach((video, index) => {
        const videoZ = videoPositions[index];
        const distance = Math.abs(playerZ - videoZ);
        
        // Only trigger if approaching the video (playerZ > videoZ) and within proximity
        const isApproaching = playerZ > videoZ;
        if (isApproaching && distance <= videoProximities[index]) {
            // Find if this is the closest video
            let isClosest = true;
            let closestDistance = distance;
            
            // Check all other videos to see if any are closer
            for (let i = 0; i < videoPositions.length; i++) {
                if (i !== index) {
                    const otherDistance = Math.abs(playerZ - videoPositions[i]);
                    const otherIsApproaching = playerZ > videoPositions[i];
                    if (otherIsApproaching && otherDistance <= videoProximities[i] && otherDistance < closestDistance) {
                        isClosest = false;
                        break;
                    }
                }
            }
            
            // If this is the closest video, it's not already playing, and hasn't been played before
            if (isClosest && video.paused && !videosPlayed[index]) {
                // Create texture and start playing
                const texture = new THREE.VideoTexture(video);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.format = THREE.RGBAFormat;
                
                // Update material with video texture
                videoSprites[index].material.map = texture;
                videoSprites[index].material.opacity = 1; // Make visible
                videoSprites[index].material.needsUpdate = true;
                
                // Add event listener to mark as played when finished
                video.addEventListener('ended', () => {
                    videosPlayed[index] = true;
                    console.log(`Video ${index + 1} finished - marked as played`);
                });
                
                // Start playing
                console.log(`Attempting to play video ${index + 1} at distance ${distance.toFixed(2)}`);
                video.play().then(() => {
                    console.log(`Video ${index + 1} started playing successfully`);
                }).catch(err => {
                    console.error(`Error playing video ${index + 1}:`, err);
                    console.log(`Video ${index + 1} readyState:`, video.readyState, 'networkState:', video.networkState);
                });
            }
        } else {
            // Don't pause videos when driving away - let them play to completion once started
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    handleInput();
    checkVideoProximity();
    updateSoldierWaddle();

    updateBillboards();
    renderer.render(scene, camera);
}

// Update soldier waddle animation
function updateSoldierWaddle() {
    if (!soldierWalkingToWindow || !walkingSoldier) return;
    
    const time = Date.now() * 0.003; // Slow animation speed
    const targetZ = -276; // Car window position (closer to car)
    const currentZ = walkingSoldier.position.z;
    
    // Move soldier toward car window (forward along road)
    if (currentZ < targetZ - 1) {
        // Waddle forward with side-to-side sway and bobbing
        walkingSoldier.position.z += 0.05; // Move forward toward car
        walkingSoldier.position.x = -2 + Math.sin(time * 3) * 0.2; // Slight sway left/right
        walkingSoldier.position.y = 3 + Math.sin(time * 4) * 0.15; // Bob up and down
    } else {
        // Soldier reached the window - switch to leaning animation
        if (!soldierAtWindow) {
            soldierAtWindow = true;
            soldierWalkingToWindow = false;
            walkingSoldier.position.z = targetZ; // Lock final position
            walkingSoldier.position.x = -1; // Closer to car window 
            walkingSoldier.position.y = 2; // Lower since he's leaning down
            
            // Stop footsteps audio
            footstepsAudio.pause();
            footstepsAudio.currentTime = 0;
            
            // Rotate to face into the car (90 degrees to face right toward car)
            walkingSoldier.rotation.y = Math.PI / 2;
            
            // Switch to leaning2 texture and adjust for close-up leaning pose
            walkingSoldier.material.map = soldierLeaning2Texture;
            walkingSoldier.material.needsUpdate = true;
            
            // Smaller geometry since it's a close-up of him leaning in
            walkingSoldier.geometry.dispose();
            walkingSoldier.geometry = new THREE.PlaneGeometry(1.95, 2.6); // 35% smaller for better scale
            
            // Start dialogue sequence
            startDialogueSequence();
            
            console.log('Soldier reached car window and switched to leaning');
        }
    }
}

// Start the dialogue sequence at the window
function startDialogueSequence() {
    if (dialogueStarted) return;
    dialogueStarted = true;
    
    // Start mouth animation and play "what's your religion"
    startMouthAnimation();
    religionAudio.play().catch(err => console.log('Religion audio error:', err));
    
    // When religion audio ends, show response choices
    religionAudio.addEventListener('ended', () => {
        stopMouthAnimation();
        setTimeout(() => {
            showReligionChoices();
        }, 500);
    }, { once: true });
}

// Start mouth animation (toggle between leaning1 and leaning2)
function startMouthAnimation() {
    if (mouthAnimationInterval || !walkingSoldier) return;
    
    let useMouth2 = true;
    mouthAnimationInterval = setInterval(() => {
        if (walkingSoldier && walkingSoldier.material) {
            walkingSoldier.material.map = useMouth2 ? soldierLeaning2Texture : soldierLeaning1Texture;
            walkingSoldier.material.needsUpdate = true;
            useMouth2 = !useMouth2;
        }
    }, 200); // Toggle every 200ms
}

// Stop mouth animation
function stopMouthAnimation() {
    if (mouthAnimationInterval) {
        clearInterval(mouthAnimationInterval);
        mouthAnimationInterval = null;
        
        // Set to closed mouth (leaning2)
        if (walkingSoldier && walkingSoldier.material) {
            walkingSoldier.material.map = soldierLeaning2Texture;
            walkingSoldier.material.needsUpdate = true;
        }
    }
}

// Show religion response choices
function showReligionChoices() {
    const choicesContainer = document.createElement('div');
    choicesContainer.id = 'religion-choices';
    choicesContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 30px;
        border-radius: 10px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-size: 16px;
        max-width: 500px;
        text-align: center;
    `;
    
    const title = document.createElement('div');
    title.textContent = 'Choose your response:';
    title.style.cssText = `
        margin-bottom: 15px;
        font-weight: bold;
        font-size: 18px;
    `;
    choicesContainer.appendChild(title);
    
    const escInstruction = document.createElement('div');
    escInstruction.textContent = 'Press ESC to bring up cursor';
    escInstruction.style.cssText = `
        margin-bottom: 20px;
        font-size: 12px;
        color: #aaa;
        font-style: italic;
    `;
    choicesContainer.appendChild(escInstruction);
    
    const choices = [
        "I'm a Catholic",
        "I love dear leader and am Catholic"
    ];
    
    choices.forEach((choice, index) => {
        const button = document.createElement('div');
        button.textContent = choice;
        button.style.cssText = `
            padding: 15px 20px;
            margin: 10px 0;
            cursor: pointer;
            border: 2px solid #666;
            border-radius: 5px;
            transition: all 0.2s;
            background: #333;
        `;
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#555';
            button.style.borderColor = '#999';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#333';
            button.style.borderColor = '#666';
        });
        button.addEventListener('click', () => selectReligionChoice(choice));
        choicesContainer.appendChild(button);
    });
    
    document.body.appendChild(choicesContainer);
    console.log('Religion choices displayed');
}

// Handle religion choice selection
function selectReligionChoice(choice) {
    console.log('Selected choice:', choice);
    
    // Remove the choices
    const choicesContainer = document.getElementById('religion-choices');
    if (choicesContainer) {
        choicesContainer.remove();
    }
    
    // Play catholic response (same audio for both choices)
    setTimeout(() => {
        catholicAudio.play().catch(err => console.log('Catholic audio error:', err));
        
        // When driver finishes, soldier asks "what kind"
        catholicAudio.addEventListener('ended', () => {
            setTimeout(() => {
                startMouthAnimation();
                whatKindAudio.play().catch(err => console.log('What kind audio error:', err));
                
                // When soldier finishes asking, show denomination list
                whatKindAudio.addEventListener('ended', () => {
                    stopMouthAnimation();
                    setTimeout(() => {
                        showDenominationList();
                    }, 500);
                }, { once: true });
            }, 300);
        }, { once: true });
    }, 300);
}

// Show the denomination selection list
function showDenominationList() {
    showingDenominations = true;
    
    const denominations = [
        "Roman Rite - Extraordinary Form",
        "Roman Rite - Ordinary Form", 
        "Roman Rite - Anglican Use",
        "Roman Rite - Zaire Use",
        "Ambrosian Rite",
        "Braga Rite",
        "Lyonese Rite",
        "Mozarabic Rite",
        "Benedictine Rite",
        "Carmelite Rite",
        "Carthusian Rite",
        "Cistercian Rite",
        "Dominican Rite",
        "Premonstratensian Rite",
        "Albanian Greek Catholic Church",
        "Belarusian Greek Catholic Church",
        "Bulgarian Greek Catholic Church",
        "Greek Byzantine Catholic Church",
        "Greek Catholic Church of Croatia and Serbia",
        "Hungarian Greek Catholic Church",
        "Italo-Albanian Greek Catholic Church",
        "Macedonian Greek Catholic Church",
        "Melkite Greek Catholic Church",
        "Romanian Greek Catholic Church",
        "Russian Greek Catholic Church",
        "Ruthenian Byzantine Catholic Church",
        "Slovak Byzantine Catholic Church",
        "Ukrainian Greek Catholic Church",
        "Chaldean Catholic Church",
        "Syro-Malabar Catholic Church",
        "Maronite Catholic Church",
        "Syriac Catholic Church",
        "Syro-Malankara Catholic Church",
        "Coptic Catholic Church",
        "Eritrean Catholic Church",
        "Ethiopian Catholic Church",
        "Armenian Catholic Church"
    ];
    
    let selectedIndex = 0; // Start with first item selected
    
    // Create denomination list UI
    const listContainer = document.createElement('div');
    listContainer.id = 'denomination-list';
    listContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        max-height: 70vh;
        overflow-y: auto;
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 400px;
    `;
    
    // Add instruction text
    const instructionText = document.createElement('div');
    instructionText.innerHTML = 'Use ↑↓ arrow keys and Enter to select, or click:<br><small style="color: #aaa; font-style: italic;">Press ESC to bring up cursor</small>';
    instructionText.style.cssText = `
        padding: 10px;
        margin-bottom: 10px;
        text-align: center;
        font-size: 12px;
        color: #ccc;
        border-bottom: 2px solid #444;
        line-height: 1.4;
    `;
    listContainer.appendChild(instructionText);
    
    const denominationItems = [];
    
    // Function to update selection visual
    function updateSelection() {
        denominationItems.forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.backgroundColor = '#cc3333'; // Red highlight for selected
                item.style.color = 'white';
                item.style.fontWeight = 'bold';
                // Scroll item into view
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.style.backgroundColor = 'transparent';
                item.style.color = 'white';
                item.style.fontWeight = 'normal';
            }
        });
    }
    
    denominations.forEach((denomination, index) => {
        const item = document.createElement('div');
        item.textContent = denomination;
        item.style.cssText = `
            padding: 10px;
            cursor: pointer;
            border-bottom: 1px solid #333;
            transition: all 0.2s;
        `;
        
        // Mouse events
        item.addEventListener('mouseenter', () => {
            selectedIndex = index;
            updateSelection();
        });
        item.addEventListener('click', () => selectDenomination(denomination));
        
        denominationItems.push(item);
        listContainer.appendChild(item);
    });
    
    // Set initial selection
    updateSelection();
    
    // Keyboard navigation
    function handleKeyDown(event) {
        if (!showingDenominations) return;
        
        switch(event.key) {
            case 'ArrowUp':
                event.preventDefault();
                event.stopPropagation(); // Prevent other listeners from handling this
                selectedIndex = Math.max(0, selectedIndex - 1);
                updateSelection();
                break;
            case 'ArrowDown':
                event.preventDefault();
                event.stopPropagation(); // Prevent other listeners from handling this
                selectedIndex = Math.min(denominations.length - 1, selectedIndex + 1);
                updateSelection();
                break;
            case 'Enter':
                event.preventDefault();
                event.stopPropagation(); // Prevent other listeners from handling this
                selectDenomination(denominations[selectedIndex]);
                break;
            case 'Escape':
                event.preventDefault();
                event.stopPropagation(); // Prevent other listeners from handling this
                // Allow escape to close (though this breaks the narrative)
                break;
        }
    }
    
    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Store cleanup function on the container
    listContainer.keydownHandler = handleKeyDown;
    
    document.body.appendChild(listContainer);
    console.log('Denomination list displayed with keyboard navigation');
}

// Handle denomination selection - triggers the ending sequence
function selectDenomination(denomination) {
    console.log('Selected denomination:', denomination);
    
    // Remove the list and cleanup
    const listContainer = document.getElementById('denomination-list');
    if (listContainer) {
        // Remove keyboard event listener
        if (listContainer.keydownHandler) {
            document.removeEventListener('keydown', listContainer.keydownHandler);
        }
        listContainer.remove();
    }
    
    showingDenominations = false;
    
    // Start the tragic ending sequence
    startEndingSequence();
}

// The tragic ending sequence
function startEndingSequence() {
    // Play "wrong" sound
    wrongAudio.play().catch(err => console.log('Wrong audio error:', err));
    
    // Transform all soldiers simultaneously
    transformSoldiersToAiming();
    
    setTimeout(() => {
        // Play gunshot with muzzle flash
        gunshotAudio.play().catch(err => console.log('Gunshot audio error:', err));
        triggerMuzzleFlash();
        
        setTimeout(() => {
            // Start ringing and screen effects
            ringingAudio.play().catch(err => console.log('Ringing audio error:', err));
            startScreenTransition();
        }, 500);
    }, 1000);
}

// Transform soldiers to aiming poses
function transformSoldiersToAiming() {
    allSoldiers.forEach(soldier => {
        if (soldier.userData.type === 'stop' && soldier === walkingSoldier) {
            // Leaning soldier becomes main gun soldier
            soldier.material.map = soldierAimingTexture;
            soldier.material.needsUpdate = true;
            console.log('Leaning soldier switched to main gun');
        } else {
            // Other soldiers become aiming soldiers
            soldier.material.map = soldierAiming2Texture;
            soldier.material.needsUpdate = true;
            console.log('Soldier switched to aiming pose');
        }
    });
}

// Screen transition and game reset
function startScreenTransition() {
    // Create overlay for color transitions
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2000;
        pointer-events: none;
        background-color: rgba(255, 0, 0, 0);
        transition: background-color 0.5s ease;
    `;
    document.body.appendChild(overlay);
    
    // Fade to red
    setTimeout(() => {
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    }, 100);
    
    // Fade to white
    setTimeout(() => {
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 1)';
        
        // Start audio crossfade back to background music
        startAudioReset();
    }, 1500);
    
    // Reset game
    setTimeout(() => {
        resetGame();
        
        // Fade out overlay
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0)';
        
        setTimeout(() => {
            overlay.remove();
        }, 1000);
    }, 3000);
}

// Fade from ringing back to background music
function startAudioReset() {
    // Stop forest music if playing
    if (forestMusic && !forestMusic.paused) {
        forestMusic.pause();
        forestMusic.currentTime = 0;
    }
    
    // Fade out ringing
    const fadeOut = setInterval(() => {
        if (ringingAudio.volume > 0.1) {
            ringingAudio.volume = Math.max(0, ringingAudio.volume - 0.1);
        } else {
            ringingAudio.pause();
            ringingAudio.currentTime = 0;
            clearInterval(fadeOut);
        }
    }, 100);
    
    // Restart background music
    setTimeout(() => {
        backgroundMusic.currentTime = 0;
        backgroundMusic.volume = audioLevels.backgroundMusic;
        backgroundMusic.play().catch(err => console.log('Background music restart error:', err));
    }, 1000);
}

// Reset the entire game to beginning
function resetGame() {
    // Increment playthrough counter for video pattern switching
    playthroughCount++;
    console.log(`Starting playthrough #${playthroughCount}`);
    
    // Reset all variables
    isAutoDriving = false;
    crossfadeStarted = false;
    soldierWalkingToWindow = false;
    soldierAtWindow = false;
    carStopped = false;
    dialogueStarted = false;
    showingDenominations = false;
    walkingSoldier = null;
    // Don't reset instructionsShown - keep it true so instructions don't show again
    
    // Stop mouth animation
    if (mouthAnimationInterval) {
        clearInterval(mouthAnimationInterval);
        mouthAnimationInterval = null;
    }
    
    // Reset player position
    player.position.set(0, 0, 0);
    
    // Reset camera
    camera.position.set(0, 2.15, -0.4);
    camera.rotation.set(0, 0, 0);
    
    // Reset speed
    speed = 0;
    
    // Reset all soldiers to original positions and textures
    allSoldiers.forEach((soldier, index) => {
        soldier.material.map = soldier.userData.originalTexture;
        soldier.material.needsUpdate = true;
        
        // Reset positions
        if (index === 0) {
            soldier.position.set(-2, 3, -295);
            soldier.rotation.y = 0;
            soldier.geometry.dispose();
            soldier.geometry = new THREE.PlaneGeometry(4, 6);
        } else if (index === 1) {
            soldier.position.set(3, 3, -295);
        } else if (index === 2) {
            soldier.position.set(-6, 3, -298);
        }
    });
    
    // Reset video system for new pattern
    resetVideoSystem();
    
    // Restore fog
    scene.fog = new THREE.Fog(0x222222, 30, 120);
    
    // Reset audio states
    if (backgroundMusic) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.volume = audioLevels.backgroundMusic;
        backgroundMusic.play().catch(err => console.log('Reset music error:', err));
    }
    
    if (forestMusic) {
        forestMusic.pause();
        forestMusic.currentTime = 0;
        forestMusic.volume = 0;
    }
    
    if (ringingAudio) {
        ringingAudio.pause();
        ringingAudio.currentTime = 0;
    }
    
    console.log('Game reset to beginning');
}

// Reset video system and recreate with new pattern
function resetVideoSystem() {
    // Clean up existing video sprites
    videoSprites.forEach(sprite => {
        if (sprite.parent) {
            sprite.parent.remove(sprite);
        }
        if (sprite.geometry) sprite.geometry.dispose();
        if (sprite.material && sprite.material.map) sprite.material.map.dispose();
        if (sprite.material) sprite.material.dispose();
    });
    
    // Reset video arrays
    videos = [];
    videoSprites = [];
    videosPlayed = [];
    
    // Recreate video system with new pattern
    createVideoSystem();
    
    // Re-enable videos for continued playback (important for subsequent loops)
    startAudioIfNeeded();
    
    console.log('Video system reset and recreated for new playthrough pattern');
}

// No need to update sprites - they stay facing forward
function updateBillboards() {
    // Sprites now face forward and don't need updating
}



// Handle window resize
function onWindowResize() {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(rect.width, rect.height);
}

// Input event listeners
function setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        // Handle ESC key globally to exit pointer lock
        if (event.key === 'Escape' && document.pointerLockElement) {
            document.exitPointerLock();
            return;
        }
        
        if (showingDenominations) return; // Don't process game controls while denomination list is open
        keys[event.code] = true;
    });

    document.addEventListener('keyup', (event) => {
        if (showingDenominations) return; // Don't process game controls while denomination list is open
        keys[event.code] = false;
    });

    // Mouse controls
    const canvas = document.getElementById('gameCanvas');
    
    canvas.addEventListener('click', () => {
        // Only request pointer lock on desktop
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) {
            canvas.requestPointerLock();
        }
        
        // Start audio on first interaction
        startAudioIfNeeded();
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (event) => {
        if (isPointerLocked) {
            // Only allow horizontal (left/right) looking
            mouse.x += event.movementX * 0.002;
            
            // Limit horizontal look range
            const maxLook = Math.PI / 3; // 60 degrees each way
            mouse.x = Math.max(-maxLook, Math.min(maxLook, mouse.x));
            
            // Apply only horizontal rotation to camera
            camera.rotation.order = 'YXZ';
            camera.rotation.y = -mouse.x;
            camera.rotation.x = 0; // Lock vertical look
        }
    });
    
    // Touch controls for mobile looking around
    let touchStartX = 0;
    let touchCurrentX = 0;
    
    canvas.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
            touchStartX = event.touches[0].clientX;
            touchCurrentX = touchStartX;
        }
    });
    
    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); // Prevent scrolling
        if (event.touches.length === 1) {
            touchCurrentX = event.touches[0].clientX;
            const deltaX = (touchCurrentX - touchStartX) * 0.005;
            
            // Update mouse.x for looking around
            mouse.x = deltaX;
            
            // Limit horizontal look range
            const maxLook = Math.PI / 3; // 60 degrees each way
            mouse.x = Math.max(-maxLook, Math.min(maxLook, mouse.x));
            
            // Apply horizontal rotation to camera
            camera.rotation.order = 'YXZ';
            camera.rotation.y = -mouse.x;
            camera.rotation.x = 0; // Lock vertical look
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (event) => {
        // Keep current look position when touch ends
    });
}

// Start the game
window.addEventListener('load', () => {
    init();
    setupControls();
});
window.addEventListener('resize', onWindowResize);
