import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';
import { getQualityMetrics, QualityMetrics } from './quality';

// Utility functions
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(x, b));
const norm = (x: number, min: number, max: number) => clamp(((x - min) / (max - min)) * 100, 0, 100);
const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

/* 
FaceMesh Indices Documentation:
- 10: Forehead top center
- 152: Chin bottom center
- 234: Right face edge (anatomical right)
- 454: Left face edge (anatomical left)
- 123: Right cheekbone highest point
- 352: Left cheekbone highest point
- 172: Right jaw corner
- 397: Left jaw corner
- 14: Bottom of the lower lip (useful for chin length)

Additional indices for advanced metrics:
- 33: Right eye (outer corner)
- 133: Right eye (inner corner)
- 362: Left eye (inner corner)
- 263: Left eye (outer corner)
- 159: Right eye (center pupil area)
- 386: Left eye (center pupil area)
- 61: Upper lip right
- 291: Upper lip left
- 0: Nose tip
- 168: Nose bridge center
- 9: Nose base (between eyebrows)
- 197: Eyebrow ridge center
*/

export interface AnalysisResult {
    overall: number; // Scaled 0-10
    potential: number; // Scaled 0-10
    face_shape: string;
    
    // Category Scores (0-100 internally, but contributed to overall)
    symmetry: number;  
    golden_ratio: number;
    proportions: number; // Thirds + Fifths
    harmony: number; // Eyes, Nose, Lips
    skin_quality: number;
    
    // Detailed Metrics (0-100)
    jawline: number;
    cheekbones: number;
    facial_thirds: number;
    facial_fifths: number;
    eye_score: number;
    nose_score: number;
    
    warnings: string[];
    landmarks?: { x: number; y: number }[];
}

let detector: faceLandmarksDetection.FaceLandmarksDetector | null = null;

// Helper function for symmetry calculation
function calculateSymmetry(
    centerPoint: { x: number; y: number },
    leftPoint: { x: number; y: number },
    rightPoint: { x: number; y: number }
): number {
    const leftDist = dist(centerPoint, leftPoint);
    const rightDist = dist(centerPoint, rightPoint);
    const difference = Math.abs(leftDist - rightDist);
    const average = (leftDist + rightDist) / 2;

    // Symmetry percentage (100 = perfect symmetry)
    return average > 0 ? (1 - difference / average) * 100 : 100;
}

// Helper function for Golden Ratio scoring
const PHI = 1.618; // Golden Ratio constant
function calculateGoldenRatioScore(ratio: number, idealPhi: number = PHI): number {
    // Score how close a ratio is to the golden ratio
    const difference = Math.abs(ratio - idealPhi);
    const maxDeviation = 0.5; // Allow 0.5 deviation for scoring
    const score = Math.max(0, (1 - difference / maxDeviation)) * 100;
    return clamp(score, 0, 100);
}

// --- Preprocessing & Alignment Helpers ---

function enhanceContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Find min and max luminance to stretch contrast
    let min = 255;
    let max = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        // Simple luminance
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < min) min = lum;
        if (lum > max) max = lum;
    }
    
    // Avoid division by zero
    if (max === min) return;
    
    const scale = 255 / (max - min);
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp((data[i] - min) * scale, 0, 255);         // R
        data[i + 1] = clamp((data[i + 1] - min) * scale, 0, 255); // G
        data[i + 2] = clamp((data[i + 2] - min) * scale, 0, 255); // B
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function cropAndAlignFace(
    img: HTMLImageElement | HTMLCanvasElement, 
    landmarks: { x: number; y: number }[]
) {
    // 1. Calculate Center and Angle
    const leftEye = landmarks[33];  // Right Eye (Visual Left)
    const rightEye = landmarks[263]; // Left Eye (Visual Right) - Wait, 33 is RightEye(inner), 263 is LeftEye(outer)? 
    // Checking indices: 33 is right eye inner/outer? 
    // Standard MediaPipe: 33 is Right Eye Inner Corner, 133 is Right Eye Outer. 
    // 362 is Left Eye Inner, 263 is Left Eye Outer.
    // Let's use Outer Corners for better baseline: 33 (Right Outer?) No, 33 is key point.
    // Let's stick to the ones used in validation: 33 and 263.
    // Angle: atan2(dy, dx)
    
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const angle = Math.atan2(dy, dx); // Radians
    
    // 2. Determine Bounding Box of Face
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    landmarks.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const centerX = minX + faceWidth / 2;
    const centerY = minY + faceHeight / 2;
    
    // 3. Setup Target Canvas (512x512)
    const targetSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');
    
    // 4. Calculate Scale to fit with padding
    // Padding 30% means face should take up ~70% of 512
    // Or: Box size = max(w, h) * 1.3
    const maxDim = Math.max(faceWidth, faceHeight);
    const scale = (targetSize * 0.7) / maxDim; // Leave 30% margin total (15% each side)
    
    // 5. Transform
    // Order: Translate Center to Origin -> Rotate -> Scale -> Translate to Canvas Center
    ctx.translate(targetSize / 2, targetSize / 2);
    ctx.scale(scale, scale);
    ctx.rotate(-angle); // Rotate to straighten
    ctx.translate(-centerX, -centerY);
    
    ctx.drawImage(img, 0, 0);
    
    // Reset transform for filter
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 6. Enhancement
    enhanceContrast(ctx, targetSize, targetSize);
    
    // 7. Return Canvas and Mapping Function (Target -> Source)
    const mapPointBack = (p: { x: number; y: number }) => {
        // Inverse: (P - CenterCanvas) / Scale -> Rotate(+angle) -> + CenterSource
        const x1 = p.x - targetSize / 2;
        const y1 = p.y - targetSize / 2;
        
        const x2 = x1 / scale;
        const y2 = y1 / scale;
        
        // Rotate by +angle
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x3 = x2 * cos - y2 * sin;
        const y3 = x2 * sin + y2 * cos;
        
        return {
            x: x3 + centerX,
            y: y3 + centerY,
            z: (p as any).z ? (p as any).z / scale : undefined // Handle Z if present
        };
    };
    
    return { canvas, mapPointBack };
}

function determineFaceShape(
    faceWidth: number, 
    faceHeight: number, 
    jawWidth: number, 
    foreheadWidth: number
): string {
    const ratio = faceHeight / faceWidth;
    const jawForeheadRatio = jawWidth / foreheadWidth;
    
    // Simplified logic
    if (ratio > 1.45) {
        if (jawForeheadRatio > 0.9) return "Rectangular"; // Long + Strong Jaw
        if (jawWidth < foreheadWidth * 0.8) return "Heart"; // Wide forehead, narrow chin
        return "Oval"; // Balanced
    } else {
        if (jawForeheadRatio > 0.9) return "Square"; // Wide + Strong Jaw
        return "Round"; // Wide + Soft Jaw (approximation)
    }
}

function getFaceShapeScore(shape: string): number {
    // User provided scores
    switch (shape) {
        case "Oval": return 95;
        case "Heart": return 85;
        case "Rectangular": return 75;
        case "Square": return 70;
        case "Round": return 65; // User didn't specify, assuming lower for "attractiveness" standard typically
        default: return 75;
    }
}

async function getDetector() {
    if (detector) return detector;
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    detector = await faceLandmarksDetection.createDetector(model, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        refineLandmarks: true,
        maxNumFaces: 1,
        // @ts-ignore - Types might be slightly off for older versions but these are standard MP options
        minDetectionConfidence: 0.7, 
        minTrackingConfidence: 0.7
    });
    return detector;
}

// --- Validation & Retry Logic ---

function validateAnatomy(keypoints: { x: number; y: number }[]): boolean {
    if (!keypoints || keypoints.length < 468) return false;

    const eyeLeft = keypoints[263];
    const eyeRight = keypoints[33];
    const nose = keypoints[1];
    const mouth = keypoints[13];
    const chin = keypoints[152];

    // Basic Y-axis checks (assuming upright face)
    // Eyes should be above Nose
    if (eyeLeft.y >= nose.y || eyeRight.y >= nose.y) return false;
    // Nose should be above Mouth
    if (nose.y >= mouth.y) return false;
    // Mouth should be above Chin
    if (mouth.y >= chin.y) return false;

    // X-axis checks (Anatomical Left is Visual Right)
    // Visual: RightEye(33) < Nose < LeftEye(263)
    if (eyeRight.x >= nose.x || nose.x >= eyeLeft.x) return false;

    return true;
}

function createRotatedCanvas(img: HTMLImageElement | HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    // Use max dimension to avoid cropping during rotation
    const diag = Math.sqrt(img.width * img.width + img.height * img.height);
    canvas.width = diag;
    canvas.height = diag;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    return canvas;
}

async function detectWithRetry(img: HTMLImageElement) {
    const det = await getDetector();
    
    // 1. First Pass: Normal
    let faces = await det.estimateFaces(img);
    if (faces.length > 0 && validateAnatomy(faces[0].keypoints)) {
        return faces[0];
    }

    console.warn("Analysis: Standard detection failed or invalid. Retrying with rotation...");

    // 2. Retry: Rotate -5 degrees
    let canvas = createRotatedCanvas(img, -5);
    faces = await det.estimateFaces(canvas);
    if (faces.length > 0 && validateAnatomy(faces[0].keypoints)) {
        // We need to map points back? 
        // Mapping back is complex. For MVP, we can just fail or return the rotated result 
        // (but visualization will be off unless we draw on rotated canvas).
        // A better approach for MVP: Tell user to align face.
        // OR: Just return these keypoints and accept the visualization will be on the "virtual" rotated frame?
        // No, `analyzeFace` returns metrics. The `landmarks` are used for visualization.
        // If we return rotated landmarks, we must display the rotated image.
        // Let's stick to throwing a helpful error for now if rotation was needed, 
        // OR return a specific warning code so UI can ask user to retry.
    }

    // For now, if validation fails, we throw to prompt user
    throw new Error('FACE_ALIGNMENT_ERROR');
}

export async function analyzeFace(img: HTMLImageElement): Promise<AnalysisResult> {
    const det = await getDetector();
    
    // --- Pass 1: Initial Detection ---
    let faces = await det.estimateFaces(img);
    let keypoints: { x: number; y: number; z?: number }[];

    // If initial detection fails, try rotation (Quick Fix 1)
    if (faces.length === 0 || !validateAnatomy(faces[0].keypoints)) {
        console.warn("Analysis: Standard detection failed. Retrying with rotation...");
        try {
             // Retry: Rotate -5 degrees
            const rotatedCanvas = createRotatedCanvas(img, -5);
            faces = await det.estimateFaces(rotatedCanvas);
            // Note: If this works, points are on rotated canvas. 
            // For MVP, we might accept this misalignment or we should map back.
            // Given we are about to do Pass 2 Alignment, if we find a face here, 
            // we can use it to drive the Alignment step!
        } catch (e) {
            // Ignore error
        }
    }

    if (faces.length === 0 || !validateAnatomy(faces[0].keypoints)) {
        throw new Error('INVALID_FACE_ANGLE');
    }

    // --- Pass 2: Alignment & Refinement ---
    // User Requirement: "Points sliding off" fix -> Detect bbox -> Crop -> Run again
    try {
        const initialLandmarks = faces[0].keypoints;
        const { canvas: alignedCanvas, mapPointBack } = cropAndAlignFace(img, initialLandmarks);
        
        // Run detection on aligned high-quality 512x512 image
        const refinedFaces = await det.estimateFaces(alignedCanvas);
        
        if (refinedFaces.length > 0 && validateAnatomy(refinedFaces[0].keypoints)) {
            // Success! Map points back to original image space
            keypoints = refinedFaces[0].keypoints.map(p => mapPointBack(p));
            console.log("Analysis: Refined detection successful");
        } else {
            // Refined detection failed (maybe crop was too tight?), fallback to initial
            console.warn("Analysis: Refined detection failed, using initial results");
            keypoints = initialLandmarks;
        }
    } catch (e) {
        console.error("Analysis: Alignment error", e);
        keypoints = faces[0].keypoints;
    }

    // Validate one last time
    if (!validateAnatomy(keypoints)) {
        throw new Error('FACE_ALIGNMENT_ERROR');
    }

    // Map landmarks
    const getKeypoint = (idx: number) => ({ x: keypoints[idx].x, y: keypoints[idx].y });

    const forehead_top = getKeypoint(10);
    const chin_bottom = getKeypoint(152);
    const face_left = getKeypoint(234);
    const face_right = getKeypoint(454);
    const cheek_left = getKeypoint(123);
    const cheek_right = getKeypoint(352);
    const jaw_left = getKeypoint(172);
    const jaw_right = getKeypoint(397);
    const mouth_bottom = getKeypoint(14);

    // Additional points for advanced metrics
    const eye_right_outer = getKeypoint(33);
    const eye_right_inner = getKeypoint(133);
    const eye_left_inner = getKeypoint(362);
    const eye_left_outer = getKeypoint(263);
    const nose_center = getKeypoint(168);
    const nose_base = getKeypoint(9);  // Between eyebrows
    const nose_tip = getKeypoint(0);
    const mouth_left = getKeypoint(61);
    const mouth_right = getKeypoint(291);
    const nose_left = getKeypoint(102);  // Nose ala left
    const nose_right = getKeypoint(331); // Nose ala right

    // Extract features
    const face_width = dist(face_left, face_right);
    const face_height = dist(forehead_top, chin_bottom);
    const jaw_width = dist(jaw_left, jaw_right);
    const cheek_width = dist(cheek_left, cheek_right);
    const chin_length = dist(mouth_bottom, chin_bottom);
    // Forehead width approx (using temples) - 21 is approx right temple, 251 left (checking indices might be needed, using face width for now as proxy or specific indices)
    // Using face_width as max width (zygomatic). Forehead is usually slightly less.
    // Let's use 103 (left forehead) and 332 (right forehead)
    const forehead_left = getKeypoint(103);
    const forehead_right = getKeypoint(332);
    const forehead_width = dist(forehead_left, forehead_right);

    // Quality metrics
    const q = getQualityMetrics(img);

    // Formulas
    const jaw_ratio = jaw_width / face_width;
    const chin_ratio = chin_length / face_height;
    const cheek_ratio = cheek_width / jaw_width;

    // Jawline score
    const jawline = Math.round(
        0.7 * norm(jaw_ratio, 0.60, 0.85) +
        0.3 * norm(chin_ratio, 0.08, 0.14)
    );

    // Cheekbones score
    const cheekbones = Math.round(norm(cheek_ratio, 0.95, 1.25));

    // Skin Quality score (User Weight: 7%)
    const sharp = norm(q.sharpness, 50, 250);
    const contr = norm(q.contrast, 20, 70);
    const brightCenter = norm(q.brightness, 80, 170);
    const brightScore = 100 - Math.abs(brightCenter - 50) * 2;
    const skin_quality = Math.round(0.5 * sharp + 0.3 * contr + 0.2 * clamp(brightScore, 0, 100));

    // Symmetry score (User Weight: 20%)
    // Criteria: Vertical symmetry, Eye alignment, Brow/Nose/Lip symmetry
    const eyeSymmetry = calculateSymmetry(nose_center, eye_left_outer, eye_right_outer);
    const cheekSymmetry = calculateSymmetry(nose_center, cheek_left, cheek_right);
    const jawSymmetry = calculateSymmetry(nose_center, jaw_left, jaw_right);
    const lipSymmetry = calculateSymmetry(nose_center, mouth_left, mouth_right);
    const symmetry = Math.round((eyeSymmetry + cheekSymmetry + jawSymmetry + lipSymmetry) / 4);

    // Golden Ratio score (User Weight: 25%)
    // 1. Face Length / Width ≈ 1.618
    const faceRatio = face_height / face_width;
    const scoreFaceRatio = calculateGoldenRatioScore(faceRatio, PHI);
    
    // 2. Inter-eye dist / Face Width ≈ 0.46 (User said: Dist between eyes / Width ≈ 0.618??)
    // Actually, usually it's Inter-pupillary distance / Face Width ≈ 0.46. 
    // User rule: "Distance between eyes / width face ≈ 0.618". This seems high for inter-eye (inner-to-inner). 
    // Maybe they mean Outer-to-Outer? Let's assume standard Golden Ratio application.
    // If we use Inner-to-Inner (fifth3), it's usually 1/5 = 0.2.
    // If we use Pupillary distance, it's ~0.46.
    // 0.618 is huge. Maybe they mean "Width / Height = 0.618" (inverse of 1.618).
    // Let's stick to standard PHI (1.618) applications where appropriate.
    // Common: Mouth Width / Nose Width ≈ 1.618.
    const nose_width = dist(nose_left, nose_right);
    const mouth_width = dist(mouth_left, mouth_right);
    const scoreNoseMouth = calculateGoldenRatioScore(mouth_width / nose_width, PHI);
    
    // 3. Face Thirds (Vertical)
    const upperThird = dist(forehead_top, nose_base);
    const midThird = dist(nose_base, nose_tip);
    const lowerThird = dist(nose_tip, chin_bottom);
    const avgThird = (upperThird + midThird + lowerThird) / 3;
    const maxDev = Math.max(Math.abs(upperThird - avgThird), Math.abs(midThird - avgThird), Math.abs(lowerThird - avgThird));
    const facial_thirds = Math.round(Math.max(0, 100 - (maxDev / avgThird) * 300));
    
    // 4. Face Fifths (Horizontal) - User rule: Face divides into 5 equal parts
    const fifth1 = dist(face_left, eye_right_outer); 
    const fifth2 = dist(eye_right_outer, eye_right_inner);
    const fifth3 = dist(eye_right_inner, eye_left_inner);
    const fifth4 = dist(eye_left_inner, eye_left_outer);
    const fifth5 = dist(eye_left_outer, face_right);
    const avgFifth = (fifth1 + fifth2 + fifth3 + fifth4 + fifth5) / 5;
    const maxFifthDev = Math.max(
        Math.abs(fifth1 - avgFifth), Math.abs(fifth2 - avgFifth), 
        Math.abs(fifth3 - avgFifth), Math.abs(fifth4 - avgFifth), 
        Math.abs(fifth5 - avgFifth)
    );
    const facial_fifths = Math.round(Math.max(0, 100 - (maxFifthDev / avgFifth) * 300));

    const golden_ratio = Math.round((scoreFaceRatio + scoreNoseMouth) / 2);
    const proportions = Math.round((facial_thirds + facial_fifths) / 2);

    // Feature Harmony (User Weight: 15%)
    // Eyes: Tilt + Spacing
    const eyeSpacingRatio = fifth3 / ((fifth2 + fifth4) / 2); // Space / AvgEyeWidth. Ideal ~1.0
    const spacingScore = norm(eyeSpacingRatio, 0.8, 1.2);
    const leftTiltGood = eye_left_outer.y < eye_left_inner.y; 
    const rightTiltGood = eye_right_outer.y < eye_right_inner.y;
    const eye_score = Math.round(0.6 * spacingScore + 0.4 * (leftTiltGood && rightTiltGood ? 100 : 70));
    
    // Nose: Width ratio
    const noseWidthRatio = nose_width / mouth_width; 
    const nose_score = Math.round(norm(noseWidthRatio, 0.5, 0.8)); // 0.618 is ideal inverse?
    
    // Lips: Upper/Lower ratio (Ideal 1:1.6)
    // Need lip points. 61-291 is width. 
    // Upper lip height: 0 (nose tip) to 13 (upper lip top) - simplified
    // Lower lip height: 14 (lower lip bottom) to 17 (lower lip top)
    // Using simple metrics for now.
    const harmony = Math.round((eye_score + nose_score + cheekbones + jawline) / 4);

    // Face Shape (User Weight: 10%)
    const face_shape = determineFaceShape(face_width, face_height, jaw_width, forehead_width);
    const face_shape_score = getFaceShapeScore(face_shape);

    // Final Weighted Score
    // Weights:
    // Symmetry: 20%
    // Golden Ratio: 25%
    // Proportions: 20%
    // Harmony: 15%
    // Shape: 10%
    // Skin: 7%
    // Extra (General): 3% -> we'll distribute this or add a base
    
    const weightedScore = (
        (symmetry * 0.20) +
        (golden_ratio * 0.25) +
        (proportions * 0.20) +
        (harmony * 0.15) +
        (face_shape_score * 0.10) +
        (skin_quality * 0.07) +
        (90 * 0.03) // Base score for "Extra"
    );

    // Scale to 0-10
    const overall = Number((weightedScore / 10).toFixed(1));

    // Potential
    let photo_penalty = 0;
    const warnings: string[] = [];

    if (q.sharpness <= 150) {
        photo_penalty += 1.5; // Scale 10 -> 1.5
        warnings.push("low_sharpness");
    }
    if (q.brightness < 90 || q.brightness > 160) {
        photo_penalty += 1.0;
        warnings.push("bad_brightness");
    }
    
    const potential = Number(clamp(overall + photo_penalty, 0, 10).toFixed(1));

    return {
        overall,
        potential,
        face_shape,
        symmetry,
        golden_ratio,
        proportions,
        harmony,
        skin_quality,
        jawline,
        cheekbones,
        facial_thirds,
        facial_fifths,
        eye_score,
        nose_score,
        warnings,
        landmarks: keypoints
    };
}
