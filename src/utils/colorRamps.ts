import * as THREE from 'three';

export type ColorRampName = 'rainbow' | 'spectral' | 'terrain' | 'viridis' | 'magma';

export function generateColorRampTexture(name: ColorRampName, reverse: boolean = false): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    if (!ctx) return new THREE.Texture();

    const gradient = ctx.createLinearGradient(0, 0, 256, 0);

    const addStops = (stops: [number, string][]) => {
        if (reverse) {
            stops.forEach(([pos, color]) => gradient.addColorStop(1 - pos, color));
        } else {
            stops.forEach(([pos, color]) => gradient.addColorStop(pos, color));
        }
    };

    switch (name) {
        case 'rainbow':
            addStops([
                [0, 'blue'],
                [0.2, 'cyan'],
                [0.4, 'green'],
                [0.6, 'yellow'],
                [0.8, 'orange'],
                [1, 'red']
            ]);
            break;
        case 'spectral': // Blue to Red
            addStops([
                [0.0, '#2b83ba'],
                [0.25, '#abdda4'],
                [0.5, '#ffffbf'],
                [0.75, '#fdae61'],
                [1.0, '#d7191c']
            ]);
            break;
        case 'terrain':
            addStops([
                [0.0, '#006400'], // Dark Green
                [0.3, '#228B22'], // Forest Green
                [0.6, '#F4A460'], // Sandy Brown
                [0.8, '#8B4513'], // Saddle Brown
                [1.0, '#FFFFFF']  // White (Snow)
            ]);
            break;
        case 'viridis':
            addStops([
                [0, '#440154'],
                [0.25, '#3b528b'],
                [0.5, '#21918c'],
                [0.75, '#5ec962'],
                [1, '#fde725']
            ]);
            break;
        case 'magma':
            addStops([
                [0, '#000004'],
                [0.25, '#51127c'],
                [0.5, '#b73779'],
                [0.75, '#fb8761'],
                [1, '#fcfdbf']
            ]);
            break;
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}
