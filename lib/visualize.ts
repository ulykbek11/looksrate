/**
 * Utility to visualize facial analysis metrics on a canvas
 * Updated with new color scheme and drawing logic
 */

// Indices for drawing
const INDICES = {
    JAWLINE: [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454],
    EYEBROW_LEFT: [276, 283, 282, 295, 285, 300, 293, 334, 296, 336],
    EYEBROW_RIGHT: [46, 53, 52, 65, 55, 70, 63, 105, 66, 107],
    NOSE_BRIDGE: [10, 151, 9, 8, 168, 6, 197, 195, 5, 4],
    NOSE_BOTTOM: [102, 219, 218, 237, 48, 49, 279, 420, 438, 457, 331],
    EYE_LEFT: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263],
    EYE_RIGHT: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
    LIPS_OUTER: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61],
    
    // Key points for highlighting
    KEY_POINTS: [
        10,  // Forehead top
        152, // Chin bottom
        2,   // Nose tip (approx)
        263, // Eye left outer
        33,  // Eye right outer
        61,  // Mouth left
        291, // Mouth right
        1,   // Nose tip proper
        4,   // Nose bridge center
    ]
};

// New Color Scheme
const COLORS = {
    jaw: '#00F5FF',          // Cyan
    eyebrows: '#FF6B6B',     // Red
    eyes: '#4ECDC4',         // Turquoise
    nose: '#FFD93D',         // Yellow
    lips: '#FF1744',         // Bright Red
    centerLine: '#00FF00',   // Green
    connections: 'rgba(255,255,255,0.3)',
    
    // UI Helpers
    grid: 'rgba(255, 255, 255, 0.1)'
};

const SIZES = {
    main: 3,
    key: 5
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

    // 1. Draw Connections (Subtle)
    ctx.strokeStyle = COLORS.connections;
    ctx.lineWidth = 1;

    const drawPath = (indices: number[], close = false, color?: string, width: number = 1) => {
        if (color) ctx.strokeStyle = color;
        ctx.lineWidth = width;
        
        ctx.beginPath();
        const first = p(indices[0]);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < indices.length; i++) {
            const pt = p(indices[i]);
            ctx.lineTo(pt.x, pt.y);
        }
        if (close) ctx.closePath();
        ctx.stroke();
    };

    // Draw main features with specific colors
    drawPath(INDICES.JAWLINE, false, COLORS.jaw, 2);
    drawPath(INDICES.EYEBROW_LEFT, false, COLORS.eyebrows, 2);
    drawPath(INDICES.EYEBROW_RIGHT, false, COLORS.eyebrows, 2);
    drawPath(INDICES.NOSE_BRIDGE, false, COLORS.nose, 2);
    drawPath(INDICES.NOSE_BOTTOM, false, COLORS.nose, 2);
    drawPath(INDICES.EYE_LEFT, true, COLORS.eyes, 2);
    drawPath(INDICES.EYE_RIGHT, true, COLORS.eyes, 2);
    drawPath(INDICES.LIPS_OUTER, true, COLORS.lips, 2);

    // 2. Center Line (Symmetry)
    const top = p(10); // Forehead
    const bottom = p(152); // Chin
    
    ctx.strokeStyle = COLORS.centerLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // 3. Draw Points
    // Draw all mesh points faintly? No, too messy.
    // Just draw the key feature points used in lines
    
    const drawPoint = (idx: number, size: number, color: string) => {
        const pt = p(idx);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size, 0, 2 * Math.PI);
        ctx.fill();
    };

    // Draw points on the paths
    [...INDICES.JAWLINE].forEach(i => drawPoint(i, 2, COLORS.jaw));
    [...INDICES.EYEBROW_LEFT, ...INDICES.EYEBROW_RIGHT].forEach(i => drawPoint(i, 2, COLORS.eyebrows));
    [...INDICES.EYE_LEFT, ...INDICES.EYE_RIGHT].forEach(i => drawPoint(i, 2, COLORS.eyes));
    [...INDICES.NOSE_BRIDGE, ...INDICES.NOSE_BOTTOM].forEach(i => drawPoint(i, 2, COLORS.nose));
    [...INDICES.LIPS_OUTER].forEach(i => drawPoint(i, 2, COLORS.lips));

    // 4. Highlight Key Points (Golden Ratio / Measurement Anchors)
    INDICES.KEY_POINTS.forEach(idx => {
        // Draw a glow
        const pt = p(idx);
        const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, SIZES.key * 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, SIZES.key * 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Solid center
        drawPoint(idx, SIZES.key, '#FFFFFF');
    });
}
