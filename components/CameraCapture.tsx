import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (imageSrc: string) => void;
    onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setError("Could not access camera. Please allow permissions.");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const capture = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Mirror image if using user-facing camera to feel natural
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0);

            const imageSrc = canvas.toDataURL('image/jpeg');
            onCapture(imageSrc);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose} className="p-2 bg-black/50 rounded-full hover:bg-white/20 transition-colors text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="relative aspect-video bg-black flex items-center justify-center">
                    {error ? (
                        <p className="text-red-400">{error}</p>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover transform -scale-x-100"
                        />
                    )}
                </div>

                <div className="p-6 flex justify-center gap-4 bg-gray-900">
                    <button
                        onClick={capture}
                        disabled={!!error}
                        className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Camera className="w-5 h-5" />
                        TAKE PHOTO
                    </button>
                </div>
            </div>
        </div>
    );
};
