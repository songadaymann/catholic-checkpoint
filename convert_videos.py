#!/usr/bin/env python3
import os
import subprocess
import glob

def convert_mov_to_webm():
    """Convert all .mov files in the videos directory to .webm with alpha channel support"""
    
    # Get all .mov files in the videos directory
    mov_files = glob.glob("videos/*.mov")
    
    if not mov_files:
        print("No .mov files found in videos directory")
        return
    
    print(f"Found {len(mov_files)} .mov files to convert")
    
    for mov_file in mov_files:
        # Create output filename
        webm_file = mov_file.replace('.mov', '.webm')
        
        print(f"Converting {mov_file} -> {webm_file}")
        
        # FFmpeg command for WebM with alpha channel support
        cmd = [
            'ffmpeg',
            '-i', mov_file,
            '-c:v', 'libvpx-vp9',  # VP9 codec supports alpha
            '-pix_fmt', 'yuva420p',  # Pixel format with alpha
            '-auto-alt-ref', '0',  # Disable alt-ref frames for compatibility
            '-crf', '30',  # Quality setting (lower = better quality)
            '-b:v', '0',   # Variable bitrate
            '-y',  # Overwrite output files
            webm_file
        ]
        
        try:
            subprocess.run(cmd, check=True)
            print(f"✓ Successfully converted {mov_file}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to convert {mov_file}: {e}")
        except FileNotFoundError:
            print("✗ ffmpeg not found. Please install ffmpeg first:")
            print("  macOS: brew install ffmpeg")
            print("  Ubuntu: sudo apt install ffmpeg")
            print("  Windows: Download from https://ffmpeg.org/")
            return

if __name__ == "__main__":
    convert_mov_to_webm()
