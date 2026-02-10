import React from 'react';
import { AnalysisResult } from '@/lib/analyzeFace';

interface MetricRowProps {
    label: string;
    value: string | number;
    subtext?: string;
    highlight?: boolean;
}

const MetricRow = ({ label, value, subtext, highlight = false }: MetricRowProps) => (
    <div className="flex justify-between items-end border-b border-white/5 pb-2 mb-3 last:border-0">
        <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">{label}</span>
            {subtext && <span className="text-[9px] text-gray-600 mt-0.5">{subtext}</span>}
        </div>
        <div className={`text-lg font-light tracking-wide ${highlight ? 'text-cyan-400' : 'text-white'}`}>
            {value}
        </div>
    </div>
);

const DeepStat = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
    <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center hover:border-white/10 transition-colors">
        <span className="text-xl font-light text-white mb-1">{value}<span className="text-xs text-gray-500 ml-0.5">{unit}</span></span>
        <span className="text-[8px] uppercase tracking-widest text-gray-500">{label}</span>
    </div>
);

export const ResultCard = ({ result }: { result: AnalysisResult }) => {
    return (
        <div className="w-full max-w-md relative overflow-hidden backdrop-blur-2xl bg-black/40 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            {/* Header / Score */}
            <div className="text-center mb-10 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/20 blur-[60px] rounded-full pointer-events-none" />
                
                <h2 className="text-8xl font-thin text-white tracking-tighter mb-2 relative z-10">
                    {result.overall}
                </h2>
                <div className="flex items-center justify-center gap-2 mb-6">
                     <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-cyan-400 uppercase tracking-widest">
                        {result.face_shape}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                        Potential: {result.potential}
                    </span>
                </div>
            </div>

            {/* Deep Analysis Grid */}
            <div className="mb-8">
                <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">Глубокий Анализ</h3>
                <div className="grid grid-cols-2 gap-3">
                    <DeepStat label="Canthal Tilt" value={result.canthal_tilt} unit="°" />
                    <DeepStat label="Midface Ratio" value={result.midface_ratio} />
                    <DeepStat label="Jaw Angle" value={result.jaw_angle} unit="°" />
                    <DeepStat label="Eye Openness" value={result.eye_aspect_ratio} />
                </div>
            </div>

            {/* Standard Metrics */}
            <div className="space-y-1">
                <MetricRow label="Симметрия" value={`${result.symmetry}%`} />
                <MetricRow label="Золотое сечение" value={`${result.golden_ratio}%`} highlight />
                <MetricRow label="Гармония" value={`${result.harmony}%`} />
                <MetricRow label="Качество кожи" value={`${result.skin_quality}%`} />
            </div>

            {/* Warnings (Minimalist) */}
            {result.warnings.length > 0 && (
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {result.warnings.map(w => (
                        <span key={w} className="w-1.5 h-1.5 rounded-full bg-red-500/50" title={w.replace('_', ' ')} />
                    ))}
                </div>
            )}
            
            <div className="mt-8 text-center">
                <p className="text-[9px] text-gray-700 uppercase tracking-widest">
                    AI Analysis v2.0 • Precision Engine
                </p>
            </div>
        </div>
    );
};
