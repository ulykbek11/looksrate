/**
 * Utility for image quality analysis (brightness, contrast, sharpness)
 */

export interface QualityMetrics {
    brightness: number;
    contrast: number;
    sharpness: number;
}

export function getQualityMetrics(img: HTMLImageElement | HTMLCanvasElement): QualityMetrics {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { brightness: 0, contrast: 0, sharpness: 0 };

    canvas.width = img.width;
    canvas.height = img.height;

    if (img instanceof HTMLImageElement) {
        ctx.drawImage(img, 0, 0);
    } else {
        ctx.drawImage(img, 0, 0);
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let r, g, b, avg;
    let sum = 0;
    let sumSq = 0;
    const count = data.length / 4;

    const grayscale = new Float32Array(count);

    for (let i = 0; i < data.length; i += 4) {
        r = data[i];
        g = data[i + 1];
        b = data[i + 2];
        // Luminance formula
        avg = (0.299 * r + 0.587 * g + 0.114 * b);
        grayscale[i / 4] = avg;
        sum += avg;
        sumSq += avg * avg;
    }

    const brightness = sum / count;
    const variance = (sumSq / count) - (brightness * brightness);
    const contrast = Math.sqrt(Math.max(0, variance));

    // Sharpness calculation (Laplacian variance approximation)
    // We use a simple 3x3 kernel on grayscale
    let lapVar = 0;
    const w = canvas.width;
    const h = canvas.height;

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            // Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
            const lap =
                grayscale[idx - w] +
                grayscale[idx - 1] +
                grayscale[idx + 1] +
                grayscale[idx + w] -
                4 * grayscale[idx];
            lapVar += lap * lap;
        }
    }
    const sharpness = Math.sqrt(lapVar / count);

    return {
        brightness, // 0..255
        contrast,   // roughly 0..100
        sharpness   // arbitrarily scaled, needs normalization
    };
}
