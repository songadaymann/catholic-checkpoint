# Night Drive: 3D Video Apparition Game

A three.js-based driving game where ghostly video apparitions appear in a forest as you drive down a dirt road at night.

## Project Overview

**Genre**: First-person 3D driving experience  
**Platform**: Mobile-first (9:16 aspect ratio)  
**Engine**: Three.js  
**Style**: Retro 3D inspired by SNES Pilotwings - basic 3D with billboarded 2D sprites

## Current Features

### Core Gameplay
- **First-person driving** down a straight dirt road at night
- **Manual controls**: Arrow keys for forward/back, mouse for looking left/right (horizontal only)
- **Car interior cockpit** with 3-panel system (left door, center dashboard, right door)
- **Video apparitions** that appear along the forest path
- **Mile markers** for debugging position (every 50 units from Z=0 to Z=-800)

### 3D Scene
- **Mobile-optimized canvas** (9:16 aspect ratio)
- **Textured road** using dirt-night.png
- **Grass areas** on both sides using grass-night.png  
- **Tiled night sky** using nightsky.png (8x4 tiling)
- **Dense forest** with trees and grass sprites on both sides
- **Gatehouse** at Z=-500 with 60-unit clearing around it
- **Fog effects** for atmosphere (50-200 unit range)

### Video System
- **7 sequential videos** converted from .mov to .webm with alpha transparency
- **THREE.VideoTexture** implementation for real-time video on 3D planes
- **Event-driven playback** - each video plays to completion, then triggers the next
- **Alpha transparency support** via VP9 codec in WebM format
- **First video**: 25% larger, positioned at Z=-25, autoplays immediately

## Technical Architecture

### File Structure
```
├── index.html          # Main HTML with mobile-responsive canvas
├── game.js             # Core three.js game logic
├── server.py           # Local development server
├── convert_videos.py   # Video conversion script (.mov → .webm)
├── textures/           # Ground, grass, sky textures
├── sprites/            # Trees, grass, car interior, gatehouse sprites
└── videos/             # Video files (.mov + .webm)
```

### Key Systems

#### Camera & Movement
- **Player object** contains camera for proper world movement
- **Camera position**: Configurable height (currently 2.15) with forward/back offset
- **Movement direction**: Uses `getWorldDirection()` with `negate()` for correct forward motion
- **Mouse controls**: Horizontal-only looking with 60° range limit
- **Camera bob**: Subtle movement effect when driving

#### Car Interior
- **3-panel cockpit**: Left door, center dashboard, right door using car-interiorL/C/R.png
- **Fixed to player**: Attached to player object so panels stay put when looking around
- **Crisp rendering**: Nearest-neighbor filtering for pixel-perfect sprites

#### Video Apparitions
- **Sequential playback**: Videos play in order based on 'ended' events
- **World-anchored**: Fixed positions in 3D space along the road
- **DoubleSide material**: Prevents back-face culling issues
- **FrustumCulled disabled**: Prevents disappearing when close to camera
- **Alpha transparency**: WebM format preserves transparency from original QuickTime movies

## Development Challenges & Solutions

### 1. Movement Direction Issues
**Problem**: Car moving backwards when pressing forward  
**Attempted Fix**: Removed `forward.negate()` based on Oracle advice  
**Actual Solution**: Kept original `forward.negate()` - the first implementation was correct

### 2. Video Visibility Problems  
**Problem**: Videos loading but not visible, appearing to "blip out"  
**Root Cause**: Back-face culling (planes facing wrong direction)  
**Solution**: Added `side: THREE.DoubleSide` to video materials

### 3. Video Positioning Issues
**Problem**: Videos flying past camera immediately  
**Root Cause**: All videos positioned at same location in world space  
**Solution**: Anchored videos to specific Z positions along road (-100, -150, etc.)

### 4. Video Playback Timing
**Problem**: Fixed 2-second intervals didn't match actual video lengths  
**Original System**: `Math.floor(videoTime / 2)` for video switching  
**New System**: Event-driven sequential playback using `'ended'` listeners

### 5. File Size & Format Issues
**Problem**: Large .mp4 files, missing alpha transparency  
**Solution**: Created Python conversion script using FFmpeg
- Convert .mov → .webm with VP9 codec
- Preserve alpha channel with `yuva420p` pixel format
- Massive file size reduction (GB → KB)

### 6. Camera Height & Interior Positioning
**Problem**: Camera bob overriding user-set camera height  
**Solution**: Updated bob system to preserve base height (2.15)
```js
const baseHeight = 2.15; // Match your camera height setting
camera.position.y = baseHeight + Math.sin(Date.now() * 0.01 * speed) * 0.005;
```

### 7. Speed & Timing Calibration
**Problem**: Car too fast for video sequence timing  
**Solution**: Reduced maxSpeed from 0.5 to 0.05 (10x slower)

## Current Game State

### Playable Demo
- **Manual driving** with arrow keys
- **First video** appears at Z=-25 mile marker, 25% larger than normal
- **Autoplay**: First video starts immediately on load
- **Car interior** fully functional with 3-panel cockpit
- **Mile markers** for position debugging
- **Forest environment** with trees and sprites

### Auto-Play System (Currently Disabled)
The game includes a complete auto-drive system:
- Car starts moving automatically after 1 second
- Video sequence begins at 2 seconds  
- All 7 videos play sequentially to completion
- Journey ends at gatehouse clearing (Z=-500)

To enable: Set `autoPlay = true` in game.js

## Video Content
7 sequential videos with dialogue, total duration ~14 seconds:
1. "1no-democracy" (1.45s)
2. "2no-i-dont" (1.92s)  
3. "3what-do-you-believe-in-autocracy" (2.41s)
4. "4by-who" (0.79s)
5. "5catholic-teachings" (2.15s)
6. "6and-if-that-autocrat" (2.67s)
7. "7im-not-part-of-the-group" (2.50s)

## Tools & Dependencies

### Runtime
- **Three.js r128** (CDN)
- **Modern browser** with WebGL support
- **WebM video support** (all modern browsers)

### Development
- **Python 3** for local server and video conversion
- **FFmpeg** for video processing
- **TexturePacker** for sprite atlas generation (trees.json, grass.json)

### Asset Pipeline
```bash
# Start local server
python3 server.py

# Convert videos (when needed)
python3 convert_videos.py
```

## Performance Optimizations

### File Sizes
- **WebM videos**: ~100-400KB each (vs GB for original .mov)
- **Texture compression**: Appropriate formats for web delivery
- **Sprite atlases**: Combined textures reduce HTTP requests

### Rendering
- **Frustum culling disabled** for video sprites to prevent pop-in
- **DoubleSide materials** only where needed
- **Fog** reduces distant rendering load
- **Mobile-first design** with appropriate resolution targets

## Future Enhancements

### Immediate Improvements
- Position remaining 6 videos along the road at proper intervals
- Re-enable auto-play with refined timing
- Add subtle steering mechanics
- Enhance car interior with dashboard details

### Advanced Features
- **Interactive elements**: Clickable objects in the environment
- **Branching paths**: Multiple routes through the forest
- **Dynamic weather**: Rain, fog effects
- **Audio system**: 3D positioned sound effects
- **Save system**: Progress tracking

## Lessons Learned

1. **Three.js video textures** work well but require careful material setup
2. **Back-face culling** is a common source of invisible geometry
3. **Event-driven systems** are more reliable than time-based ones for media
4. **WebM with alpha** is excellent for web-based video effects
5. **Mobile-first design** requires careful consideration of aspect ratios and performance
6. **Debugging tools** (like mile markers) are invaluable for 3D positioning

## Code Architecture Highlights

### Clean Separation of Concerns
- **Scene setup**: Separate functions for different scene elements
- **Input handling**: Centralized control system
- **Video management**: Self-contained video loading and playback
- **Asset loading**: Organized texture and data loading with proper callbacks

### Error Handling
- **Video loading**: Comprehensive error handling and logging
- **Texture loading**: Fallback systems for missing assets
- **User interaction**: Graceful handling of autoplay restrictions

This project demonstrates a successful blend of 3D graphics, video integration, and responsive web design to create an atmospheric interactive experience.

## Major Development Session: Complete Game Implementation

### 11. Successful Video System Rebuild
**Goal**: Implement proximity-triggered video system that actually works  
**Solution**: Built new system avoiding THREE.VideoTexture autoplay issues
- **Manual video element management** with deferred texture creation
- **Directional proximity detection** - videos only trigger when approaching (playerZ > videoZ)
- **Individual proximity distances** per video via `videoProximities` array
- **Per-video customization**: positions, heights, sizes, and trigger distances
- **Play-once system** with `videosPlayed` tracking array

**Key Innovation**: Only creating VideoTexture when video should actually play, avoiding browser autoplay restrictions

### 12. Comprehensive Audio System
**Implementation**: Multi-layered audio with centralized volume control
- **Background music**: ride-of-the-nazi-soy-boy.mp3 (loops throughout journey)
- **Forest music**: forest.mp3 (crossfades in during final approach)
- **Car engine**: car.mp3 (continuous ambient sound)
- **Dialogue audio**: religion.mp3, i'm-a-catholic.mp3, what-kind.mp3
- **Ending sequence**: wrong.mp3, gunshot.mp3, ringing.mp3
- **Footsteps**: footsteps.mp3 (plays during soldier waddle)

**Features**:
- Centralized volume control via `audioLevels` object
- User input triggers for browser autoplay compliance
- Automatic crossfading between musical themes
- Audio sequencing with proper timing delays

### 13. Auto-Drive System & Checkpoint Sequence
**Implementation**: Seamless transition from manual to automatic control
- **Manual control** until Z=-220 (after final video)
- **Automatic approach** to gatehouse at Z=-270 with reduced speed
- **Smooth deceleration** and stop positioning for dramatic effect
- **Soldier waddle sequence** begins 0.5 seconds after car stops

### 14. Soldier Character System
**Created three soldiers** at gatehouse checkpoint:
- **Soldier 1 (Stop pose)**: Main character who walks to car window
- **Soldier 2 (Casual)**: Background character on opposite side of road  
- **Soldier 3 (Aiming)**: Guard by gatehouse door

**Animation system**:
- **Waddle animation**: Forward movement with side-to-side sway and vertical bobbing
- **Texture transformation**: Stop pose → Leaning pose at car window
- **Mouth animation**: Alternates between leaning1 (closed) and leaning2 (open) during dialogue
- **Ending transformation**: All soldiers switch to threatening poses simultaneously

### 15. Interactive Dialogue System
**Complete conversation sequence** with player choices:

1. **Soldier**: "What's your religion?" (with mouth animation)
2. **Player choices**: "I'm a Catholic" OR "I love dear leader and am Catholic"
3. **Driver response**: i'm-a-catholic.mp3 audio
4. **Soldier**: "What kind of Catholic?" (with mouth animation)
5. **Denomination selection**: 25 Catholic denominations in scrollable UI

**UI Features**:
- Modal overlays with mobile-responsive design
- Hover effects and smooth transitions
- Touch-friendly for mobile devices
- Illusion of choice (both options lead to same outcome)

### 16. Tragic Ending Sequence
**Dark humor implementation** - no matter what choice, player is "wrong":

**Sequence**:
1. **"Wrong" audio** plays immediately after denomination selection
2. **Soldier transformations**: Leaning → Main gun, Others → Aiming poses
3. **Gunshot** after 1 second delay
4. **Screen transition**: Normal → Red → White with CSS transitions
5. **Audio crossfade**: Ringing → Background music
6. **Complete game reset** to beginning state

**Reset system** restores:
- Player position and camera state
- All soldier positions and textures  
- Speed and movement variables
- Fog effects and scene state
- Audio states and volumes

### 17. Atmospheric Enhancements
**Fog system**: `THREE.Fog(0x222222, 30, 120)` for mysterious forest atmosphere
**Music crossfading**: 20-second gradual transition from background to forest music starting at Z=-200
**Footstep audio**: Synchronized with soldier waddle animation, stops when reaching window

### 18. Asset Optimization
**WebP conversion**: All sprites converted from PNG to WebP for better compression:
- Car interior panels: car-interiorC/L/R.webp
- Gatehouse: gatehouse.webp  
- All soldiers: soldier-stop1.webp, soldier-casual1.webp, etc.

**Performance improvements**:
- Smaller file sizes with maintained quality
- Faster loading times
- Better mobile performance

### 19. Game Loop & Replayability
**Infinite loop design**: Game automatically resets to beginning after ending sequence
**State management**: All variables and objects properly reset for seamless replay
**Dark commentary**: Checkpoint loop represents futility of bureaucratic systems

## Current Game State (Complete)

### Full Playable Experience
1. **Journey phase**: Manual driving with 7 proximity-triggered video apparitions
2. **Approach phase**: Automatic drive to gatehouse with music crossfade and fog
3. **Checkpoint phase**: Soldier interaction with dialogue choices and denomination selection
4. **Ending phase**: Tragic conclusion with dramatic audio/visual effects and reset

### Technical Achievement
- **Proximity-based video system** that actually works without autoplay issues
- **Complex audio sequencing** with multiple simultaneous tracks
- **Seamless UI integration** with 3D scene
- **Complete game state management** with proper reset functionality
- **Mobile-optimized experience** with touch controls and responsive design

## Recent Development Session: Video System Reset

### 8. Proximity-Based Video System Attempt  
**Goal**: Replace autoplay with proximity-triggered videos at Z=-15 and Z=-25  
**Implementation**: Added `checkVideoProximity()` function with 10-unit detection range  
**Problem**: Videos continued autoplaying despite all prevention attempts

### 9. THREE.VideoTexture Autoplay Issue
**Root Cause Discovered**: `THREE.VideoTexture` constructor automatically overrides video properties:
```js
// What THREE.VideoTexture does internally:
video.autoplay = true;  // Forces autoplay
video.muted = true;     // Enables autoplay in browsers  
video.loop = true;      // Ensures continuous frames
video.play();           // Starts playback immediately
```

**Attempted Solutions**:
- Set `video.autoplay = false` before texture creation
- Added `video.preload = 'metadata'` 
- Implemented `videoSequenceStarted` flag to gate sequential playback
- Added explicit `video.pause()` after texture creation
- Restored video properties after `THREE.VideoTexture` constructor

**Result**: Videos still autoplayed despite all prevention measures

### 10. Complete Video System Reset
**Decision**: Remove all video logic to start with clean slate  
**Actions Taken**:
- Removed all video-related variables (`videos`, `videoSprites`, `currentVideoIndex`, `videoSequenceStarted`)
- Deleted `createVideoSprites()` function (97 lines)
- Deleted `playNextVideo()` function  
- Deleted `checkVideoProximity()` function
- Removed all video function calls from game loop
- Cleaned up video-related comments

**Side Fix**: Corrected `maxSpeed` from 0.05 to 0.5 (was causing extremely slow movement)

### Current State
- **Clean codebase** with no video functionality
- **Functional driving game** with proper speed controls
- **Ready for fresh video implementation** using different approach
- **All other systems intact**: car interior, sprites, environment, controls

### Next Steps for Video System
- Research alternative video integration methods that avoid THREE.VideoTexture autoplay
- Consider deferred texture creation (only when video should actually play)
- Explore canvas-based video rendering as alternative to VideoTexture
- Implement manual video element management with custom texture updates
