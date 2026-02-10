/**
 * Utility to visualize facial analysis metrics on a canvas
 * Updated with new color scheme and drawing logic
 */

// Indices for drawing
const INDICES = {
    FACE_OVAL: [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 
        148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
    ],
    EYEBROW_LEFT: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336],
    EYEBROW_RIGHT: [46, 53, 52, 65, 55, 70, 63, 105, 66, 107],
    NOSE_BRIDGE: [10, 151, 9, 8, 168, 6, 197, 195, 5, 4],
    NOSE_BOTTOM: [102, 219, 218, 237, 48, 49, 279, 420, 438, 457, 331],
    EYE_LEFT: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263],
    EYE_RIGHT: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
    IRIS_LEFT: [468, 469, 470, 471, 472, 468],
    IRIS_RIGHT: [473, 474, 475, 476, 477, 473],
    LIPS_OUTER: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61],
    
    // Key points for highlighting
    KEY_POINTS: [
        10,  // Forehead top
        152, // Chin bottom
        2,   // Nose tip
        263, // Eye left outer
        33,  // Eye right outer
        61,  // Mouth left
        291, // Mouth right
        168, // Nose center
    ]
};

// Minimalist / Tech Color Scheme
const COLORS = {
    oval: 'rgba(255, 255, 255, 0.4)',
    features: 'rgba(255, 255, 255, 0.2)',
    eyes: '#00F0FF',          // Cyan Accent
    iris: '#FFFFFF',          // White
    lips: 'rgba(255, 255, 255, 0.4)',
    centerLine: 'rgba(255, 255, 255, 0.1)',
    tiltLine: '#FF0055',      // Red for angles
    connections: 'rgba(255, 255, 255, 0.05)', // Very subtle mesh
};

const SIZES = {
    main: 2,
    key: 4
};

export function drawAnalysis(
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number }[],
    width: number,
    height: number
) {
    if (!landmarks || landmarks.length === 0) return;

    // Helper to get point
    const p = (idx: number) => landmarks[idx];

    // Clear previous
    ctx.clearRect(0, 0, width, height);

    // Set styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw Mesh Connections (Very Subtle)
    ctx.strokeStyle = COLORS.connections;
    ctx.lineWidth = 0.5;
    
    // Helper to draw path
    const drawPath = (indices: number[], close = false, color?: string, width: number = 1) => {
        if (color) ctx.strokeStyle = color;
        ctx.lineWidth = width;
        
        ctx.beginPath();
        const first = p(indices[0]);
        if (!first) return; // Safety
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < indices.length; i++) {
            const pt = p(indices[i]);
            if (pt) ctx.lineTo(pt.x, pt.y);
        }
        if (close) ctx.closePath();
        ctx.stroke();
    };

    // Draw Face Oval
    drawPath(INDICES.FACE_OVAL, true, COLORS.oval, 2);

    // Draw Features (Subtle)
    drawPath(INDICES.EYEBROW_LEFT, false, COLORS.features, 1);
    drawPath(INDICES.EYEBROW_RIGHT, false, COLORS.features, 1);
    drawPath(INDICES.NOSE_BRIDGE, false, COLORS.features, 1);
    drawPath(INDICES.NOSE_BOTTOM, false, COLORS.features, 1);
    
    // Draw Eyes (Accent)
    drawPath(INDICES.EYE_LEFT, true, COLORS.eyes, 2);
    drawPath(INDICES.EYE_RIGHT, true, COLORS.eyes, 2);
    
    // Draw Irises (if available)
    if (landmarks.length > 468) {
        drawPath(INDICES.IRIS_LEFT, true, COLORS.iris, 1.5);
        drawPath(INDICES.IRIS_RIGHT, true, COLORS.iris, 1.5);
    }

    drawPath(INDICES.LIPS_OUTER, true, COLORS.lips, 1.5);

    // 2. Draw Canthal Tilt Lines
    // Right Eye: Inner(133) -> Outer(33)
    // Left Eye: Inner(362) -> Outer(263)
    ctx.strokeStyle = COLORS.tiltLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    ctx.beginPath();
    const rIn = p(133), rOut = p(33);
    ctx.moveTo(rIn.x, rIn.y);
    ctx.lineTo(rOut.x, rOut.y);
    ctx.stroke();
    
    ctx.beginPath();
    const lIn = p(362), lOut = p(263);
    ctx.moveTo(lIn.x, lIn.y);
    ctx.lineTo(lOut.x, lOut.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Center Line (Symmetry)
    const top = p(10); // Forehead
    const bottom = p(152); // Chin
    
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.strokeStyle = COLORS.centerLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Highlight Key Points (Glowing Dots)
    INDICES.KEY_POINTS.forEach(idx => {
        const pt = p(idx);
        if (!pt) return;
        
        // Glow
        const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, SIZES.key * 3);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, SIZES.key * 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Dot
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, SIZES.key, 0, 2 * Math.PI);
        ctx.fill();
    });
}
