import React from 'react';
import { AnalysisResult } from '@/lib/analyzeFace';

interface MetricProps {
    label: string;
    value: number;
    color?: string; // Optional override
    max?: number;
}

// User requested colors
const COLORS = {
    excellent: '#00FF88',    // 9-10
    good: '#00D9FF',         // 7-8.9
    average: '#FFD93D',      // 5-6.9
    poor: '#FF6B6B'          // <5
};

const getScoreColor = (value: number, max: number = 100) => {
    // Normalize to 0-10 scale for comparison
    const score = max === 100 ? value / 10 : value;
    
    if (score >= 9) return COLORS.excellent;
    if (score >= 7) return COLORS.good;
    if (score >= 5) return COLORS.average;
    return COLORS.poor;
};

const ProgressBar = ({ value, max = 100, color }: { value: number; max?: number; color?: string }) => {
    // Determine color if not provided
    const barColor = color || getScoreColor(value, max);
    
    return (
        <div className="w-full bg-gray-800 rounded-full h-2.5 mt-1 overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                    width: `${(value / max) * 100}%`,
                    backgroundColor: barColor 
                }}
            />
        </div>
    );
};

const Metric = ({ label, value, color, max = 100 }: MetricProps) => {
    const textColor = color || getScoreColor(value, max);
    
    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{label}</span>
                <span className="text-lg font-bold" style={{ color: textColor }}>
                    {value}{max === 10 ? '' : '%'}
                </span>
            </div>
            <ProgressBar value={value} max={max} color={color} />
        </div>
    );
};

export const ResultCard = ({ result }: { result: AnalysisResult }) => {
    const overallColor = getScoreColor(result.overall, 10);

    return (
        <div className="w-full max-w-md bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
                {/* Dynamic Gradient Title based on score */}
                <h2 
                    className="text-6xl font-black text-transparent bg-clip-text"
                    style={{ 
                        backgroundImage: `linear-gradient(to right, ${overallColor}, #ffffff)`
                    }}
                >
                    {result.overall}
                </h2>
                <p className="text-gray-500 text-sm mt-1 tracking-widest">AMIRSUB RATING</p>
                <div className="mt-2 inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300">
                    {result.face_shape.toUpperCase()} FACE
                </div>
            </div>

            <div className="space-y-4">
                <Metric label="Потенциал" value={result.potential} max={10} color={COLORS.excellent} />
                
                <div className="h-px bg-white/10 my-4" />
                
                <Metric label="Симметрия" value={result.symmetry} />
                <Metric label="Золотое сечение" value={result.golden_ratio} />
                <Metric label="Пропорции" value={result.proportions} />
                <Metric label="Гармония черт" value={result.harmony} />
                <Metric label="Качество кожи" value={result.skin_quality} />
            </div>

            {result.warnings.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <p className="text-xs text-yellow-500 font-bold mb-1">ПРЕДУПРЕЖДЕНИЯ О КАЧЕСТВЕ:</p>
                    <div className="flex flex-wrap gap-2">
                        {result.warnings.map(w => (
                            <span key={w} className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full uppercase">
                                {w.replace('_', ' ')}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <p className="mt-8 text-[10px] text-gray-600 text-center leading-relaxed">
                ДИСКЛЕЙМЕР: Этот анализ основан на геометрических точках и не является окончательной мерой красоты или ценности.
            </p>
        </div>
    );
};
