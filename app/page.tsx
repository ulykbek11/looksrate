"use client";

import React, { useState, useRef, useEffect } from 'react';
import { analyzeFace, AnalysisResult } from '@/lib/analyzeFace';
import { drawAnalysis } from '@/lib/visualize';
import { ResultCard } from '@/components/ResultCard';
import { CameraCapture } from '@/components/CameraCapture';
import { Upload, Camera, Loader2, AlertCircle, User, UserPlus } from 'lucide-react';

type Tab = 'front' | 'side';

export default function Home() {
    const [activeTab, setActiveTab] = useState<Tab>('front');

    // Images
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [sideImage, setSideImage] = useState<string | null>(null);

    // Results
    const [frontResult, setFrontResult] = useState<AnalysisResult | null>(null);
    const [sideResult, setSideResult] = useState<AnalysisResult | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Get current state based on tab
    const currentImage = activeTab === 'front' ? frontImage : sideImage;
    const currentResult = activeTab === 'front' ? frontResult : sideResult;

    const setImage = (img: string | null) => {
        if (activeTab === 'front') setFrontImage(img);
        else setSideImage(img);

        // Clear result when image changes
        if (activeTab === 'front') setFrontResult(null);
        else setSideResult(null);
        setError(null);
    };

    // Draw analysis overlay when result changes
    useEffect(() => {
        if (currentResult && currentResult.landmarks && canvasRef.current && imageRef.current) {
            const canvas = canvasRef.current;
            const img = imageRef.current;

            // Match canvas resolution to image natural size
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                drawAnalysis(ctx, currentResult.landmarks, canvas.width, canvas.height);
            }
        } else if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, [currentResult, activeTab]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImage(event.target?.result as string);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCameraCapture = (imageSrc: string) => {
        setImage(imageSrc);
        setShowCamera(false);
    };

    const processImage = async () => {
        if (!imageRef.current) return;

        setLoading(true);
        setError(null);

        try {
            // Small delay to let the UI update
            await new Promise(resolve => setTimeout(resolve, 100));
            const analysis = await analyzeFace(imageRef.current);

            if (activeTab === 'front') setFrontResult(analysis);
            else setSideResult(analysis);

        } catch (err: any) {
            console.error(err);
            if (err.message === 'NO_FACE_DETECTED' || err.message === 'INVALID_FACE_ANGLE' || err.message === 'FACE_ALIGNMENT_ERROR') {
                setError('Лицо не обнаружено. Используйте фото с хорошим освещением и четким лицом');
            } else {
                setError('Произошла ошибка при анализе. Пожалуйста, попробуйте другое фото.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-24 text-white relative">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/10 blur-[100px] rounded-full" />
            </div>

            <div className="z-10 w-full max-w-6xl flex flex-col items-center text-center">
                <h1 className="text-5xl md:text-8xl font-thin tracking-tighter mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    AMIR<span className="text-cyan-400 font-light italic">SUB</span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-8 font-light tracking-wide uppercase">
                    Precision AI Aesthetics Engine
                </p>

                {/* Tabs */}
                <div className="flex p-1 bg-white/5 rounded-full mb-8 border border-white/10 backdrop-blur-md">
                    <button
                        onClick={() => setActiveTab('front')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-bold tracking-widest transition-all ${activeTab === 'front' ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <User className="w-3 h-3" />
                        FRONT
                    </button>
                    <button
                        onClick={() => setActiveTab('side')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-bold tracking-widest transition-all ${activeTab === 'side' ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <UserPlus className="w-3 h-3" />
                        SIDE
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start w-full">
                    {/* Left Side: Upload / Preview */}
                    <div className="flex flex-col items-center space-y-8">
                        <div className="relative group w-full aspect-square max-w-sm rounded-[2rem] overflow-hidden border border-white/10 bg-white/5 hover:border-cyan-400/30 transition-all duration-500 flex items-center justify-center shadow-2xl">
                            {currentImage ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-black/20">
                                    {/* Wrapper that maintains image aspect ratio exactly */}
                                    <div className="relative inline-block max-w-full max-h-full">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            ref={imageRef}
                                            src={currentImage}
                                            alt="Preview"
                                            className="max-w-full max-h-full block object-contain"
                                            style={{ maxHeight: '100%', maxWidth: '100%' }}
                                        />
                                        <canvas
                                            ref={canvasRef}
                                            className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center group/btn"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover/btn:bg-cyan-400/10 transition-colors border border-white/10 group-hover/btn:border-cyan-400/50">
                                            <Upload className="w-8 h-8 text-gray-400 group-hover/btn:text-cyan-400 transition-colors" />
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium tracking-widest uppercase group-hover/btn:text-gray-300 transition-colors">Upload Photo</span>
                                    </button>
                                    
                                    <div className="flex items-center gap-3 opacity-30">
                                        <div className="h-px w-12 bg-white"></div>
                                        <span className="text-[10px] uppercase tracking-widest">OR</span>
                                        <div className="h-px w-12 bg-white"></div>
                                    </div>

                                    <button
                                        onClick={() => setShowCamera(true)}
                                        className="flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors text-[10px] font-bold uppercase tracking-widest"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Use Camera
                                    </button>
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                        </div>

                        <div className="flex gap-4 w-full max-w-sm">
                            <button
                                onClick={() => {
                                    setImage(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                disabled={!currentImage}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-4 rounded-xl font-bold transition-all border border-white/10 disabled:opacity-20 disabled:cursor-not-allowed text-xs tracking-widest uppercase"
                            >
                                Clear
                            </button>

                            <button
                                onClick={processImage}
                                disabled={!currentImage || loading}
                                className={`flex-[2] py-4 rounded-xl font-bold tracking-widest transition-all text-xs uppercase ${!currentImage || loading
                                    ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                                    : 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                                    }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </div>
                                ) : 'Analyze Face'}
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 text-red-400 bg-red-500/10 px-6 py-4 rounded-xl border border-red-500/20 backdrop-blur-md">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-xs font-medium tracking-wide">{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Results */}
                    <div className="flex flex-col items-center lg:items-start justify-center min-h-[400px]">
                        {currentResult ? (
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full flex justify-center lg:justify-start">
                                <ResultCard result={currentResult} />
                            </div>
                        ) : (
                            <div className="text-center lg:text-left space-y-6 opacity-30 mt-20 lg:mt-0">
                                <div className="w-20 h-1 bg-cyan-400/50 rounded-full mx-auto lg:mx-0 blur-sm"></div>
                                <h3 className="text-4xl font-thin tracking-tighter text-white">
                                    {activeTab === 'front' ? 'AWAITING INPUT' : 'SIDE PROFILE'}
                                </h3>
                                <p className="text-gray-400 text-sm max-w-xs font-light leading-relaxed">
                                    {activeTab === 'front'
                                        ? 'Upload a high-quality front facing photo. AI will scan 478+ facial landmarks.'
                                        : 'Side profile analysis is currently in beta. Ensure distinct jawline visibility.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <CameraCapture
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}

            {/* Footer */}
            <footer className="mt-32 text-gray-700 text-[10px] uppercase tracking-[0.2em] font-medium">
                &copy; 2026 AMIRSUB AI LABS
            </footer>
        </main>
    );
}
