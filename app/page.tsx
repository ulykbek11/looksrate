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
        <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0514] to-black text-white">
            <div className="z-10 w-full max-w-6xl flex flex-col items-center text-center">
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    AMIR<span className="text-[#00FF88] font-light italic">SUB</span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-8">
                    Advanced AI Facial Analysis & Aesthetics Grading
                </p>

                {/* Tabs */}
                <div className="flex p-1 bg-white/5 rounded-full mb-8 border border-white/10">
                    <button
                        onClick={() => setActiveTab('front')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'front' ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF88]/25' : 'text-gray-400 hover:text-white'}`}
                    >
                        <User className="w-4 h-4" />
                        FRONT PROFILE
                    </button>
                    <button
                        onClick={() => setActiveTab('side')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'side' ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF88]/25' : 'text-gray-400 hover:text-white'}`}
                    >
                        <UserPlus className="w-4 h-4" />
                        SIDE PROFILE
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start w-full">
                    {/* Left Side: Upload / Preview */}
                    <div className="flex flex-col items-center space-y-6">
                        <div className="relative group w-full aspect-square max-w-sm rounded-[2rem] overflow-hidden border-2 border-dashed border-white/20 bg-white/5 hover:border-[#00FF88]/50 transition-all duration-500 flex items-center justify-center">
                            {currentImage ? (
                                <div className="relative w-full h-full flex items-center justify-center">
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
                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center group/btn"
                                    >
                                        <Upload className="w-12 h-12 text-gray-500 mb-4 group-hover/btn:text-[#00FF88] transition-colors" />
                                        <span className="text-gray-500 group-hover/btn:text-gray-300 transition-colors">Upload Photo</span>
                                    </button>
                                    <div className="w-full px-12 flex items-center gap-4">
                                        <div className="h-px bg-white/10 flex-1"></div>
                                        <span className="text-xs text-gray-600 font-bold">OR</span>
                                        <div className="h-px bg-white/10 flex-1"></div>
                                    </div>
                                    <button
                                        onClick={() => setShowCamera(true)}
                                        className="flex items-center gap-2 text-gray-400 hover:text-[#00FF88] transition-colors text-sm font-bold uppercase tracking-wider"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Open Camera
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
                                    // Reset file input
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                disabled={!currentImage}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload className="w-5 h-5" />
                                CLEAR
                            </button>

                            <button
                                onClick={processImage}
                                disabled={!currentImage || loading}
                                className={`flex-[2] py-4 rounded-2xl font-black tracking-widest transition-all shadow-lg shadow-[#00FF88]/20 ${!currentImage || loading
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#00FF88] text-black hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        ANALYZING...
                                    </div>
                                ) : 'ANALYZE FACE'}
                            </button>
                        </div>

                        {activeTab === 'side' && (
                            <div className="text-xs text-gray-500 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                                Note: Side profile analysis is experimental. Ensure clear lighting.
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Results */}
                    <div className="flex flex-col items-center lg:items-start justify-center min-h-[400px]">
                        {currentResult ? (
                            <div className="animate-in fade-in zoom-in-95 duration-700 w-full flex justify-center lg:justify-start">
                                <ResultCard result={currentResult} />
                            </div>
                        ) : (
                            <div className="text-center lg:text-left space-y-4 opacity-40">
                                <div className="w-16 h-1 bg-[#00FF88] rounded-full mx-auto lg:mx-0"></div>
                                <h3 className="text-2xl font-bold">
                                    {activeTab === 'front' ? 'Ожидание фронтального фото' : 'Ожидание профиля'}
                                </h3>
                                <p className="text-gray-400 max-w-xs">
                                    {activeTab === 'front'
                                        ? 'Загрузите фото анфас с хорошим освещением для точного анализа.'
                                        : 'Загрузите фото в профиль для анализа челюсти и осанки.'}
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

            {/* Footer / Credits */}
            <footer className="mt-24 text-gray-600 text-xs">
                &copy; 2026 AMIRSUB AI. ALL RIGHTS RESERVED.
            </footer>
        </main>
    );
}
