/**
 * GuidedTour Component
 * @module components/tour/GuidedTour
 * 
 * 導覽控制元件
 * Task: T045, T046
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TourConfig, TourStep, DEFAULT_TOUR_CONFIG, loadTourConfig } from './tourLoader';

interface GuidedTourProps {
    tourPath?: string;
    onStepChange?: (step: TourStep, index: number) => void;
    onComplete?: () => void;
    onClose?: () => void;
}

export function GuidedTour({
    tourPath,
    onStepChange,
    onComplete,
    onClose,
}: GuidedTourProps) {
    const { camera } = useThree();
    const [tourConfig, setTourConfig] = useState<TourConfig | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 動畫狀態
    const animationRef = useRef({
        startPosition: new THREE.Vector3(),
        endPosition: new THREE.Vector3(),
        startTarget: new THREE.Vector3(),
        endTarget: new THREE.Vector3(),
        progress: 0,
        duration: 2, // 相機移動秒數
    });

    // 載入導覽配置
    useEffect(() => {
        const loadConfig = async () => {
            if (tourPath) {
                try {
                    const config = await loadTourConfig(tourPath);
                    setTourConfig(config);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to load tour');
                    setTourConfig(DEFAULT_TOUR_CONFIG);
                }
            } else {
                setTourConfig(DEFAULT_TOUR_CONFIG);
            }
        };
        loadConfig();
    }, [tourPath]);

    // 取得當前步驟
    const currentStep = tourConfig?.steps[currentStepIndex];

    // 移動相機到指定步驟
    const animateToStep = useCallback((step: TourStep) => {
        const anim = animationRef.current;
        anim.startPosition.copy(camera.position);
        anim.endPosition.set(step.cameraPosition.x, step.cameraPosition.y, step.cameraPosition.z);

        if (step.cameraTarget) {
            anim.endTarget.set(step.cameraTarget.x, step.cameraTarget.y, step.cameraTarget.z);
        } else {
            anim.endTarget.set(0, 0, 0);
        }

        anim.progress = 0;
        setIsAnimating(true);
    }, [camera]);

    // 每幀更新動畫
    useFrame((_, delta) => {
        if (!isAnimating) return;

        const anim = animationRef.current;
        anim.progress += delta / anim.duration;

        if (anim.progress >= 1) {
            anim.progress = 1;
            setIsAnimating(false);
        }

        // 使用 easeInOutCubic 緩動
        const t = anim.progress < 0.5
            ? 4 * anim.progress ** 3
            : 1 - (-2 * anim.progress + 2) ** 3 / 2;

        camera.position.lerpVectors(anim.startPosition, anim.endPosition, t);

        // 更新相機朝向
        const lookTarget = new THREE.Vector3().lerpVectors(
            anim.startTarget,
            anim.endTarget,
            t
        );
        camera.lookAt(lookTarget);
    });

    // 播放/暫停
    const togglePlay = useCallback(() => {
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    // 下一步
    const nextStep = useCallback(() => {
        if (!tourConfig) return;

        if (currentStepIndex < tourConfig.steps.length - 1) {
            const nextIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextIndex);
            animateToStep(tourConfig.steps[nextIndex]);
            onStepChange?.(tourConfig.steps[nextIndex], nextIndex);
        } else {
            setIsPlaying(false);
            onComplete?.();
        }
    }, [tourConfig, currentStepIndex, animateToStep, onStepChange, onComplete]);

    // 上一步
    const prevStep = useCallback(() => {
        if (!tourConfig || currentStepIndex <= 0) return;

        const prevIndex = currentStepIndex - 1;
        setCurrentStepIndex(prevIndex);
        animateToStep(tourConfig.steps[prevIndex]);
        onStepChange?.(tourConfig.steps[prevIndex], prevIndex);
    }, [tourConfig, currentStepIndex, animateToStep, onStepChange]);

    // 自動播放
    useEffect(() => {
        if (!isPlaying || !currentStep || isAnimating) return;

        const timer = setTimeout(() => {
            nextStep();
        }, currentStep.duration * 1000);

        return () => clearTimeout(timer);
    }, [isPlaying, currentStep, isAnimating, nextStep]);

    // 開始導覽
    const startTour = useCallback(() => {
        if (!tourConfig || tourConfig.steps.length === 0) return;

        setCurrentStepIndex(0);
        animateToStep(tourConfig.steps[0]);
        onStepChange?.(tourConfig.steps[0], 0);
        setIsPlaying(true);
    }, [tourConfig, animateToStep, onStepChange]);

    if (error) {
        console.warn('Tour error:', error);
    }

    // 渲染控制 UI (透過 Portal 或直接在 Canvas 外)
    return null; // UI 由 TourOverlay 處理
}

export default GuidedTour;

// 導出控制 Hook
export function useTourControls() {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState<TourStep | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const startTour = useCallback(() => setIsActive(true), []);
    const stopTour = useCallback(() => {
        setIsActive(false);
        setIsPlaying(false);
        setCurrentStep(null);
        setStepIndex(0);
    }, []);

    return {
        isActive,
        currentStep,
        stepIndex,
        isPlaying,
        startTour,
        stopTour,
        setCurrentStep,
        setStepIndex,
        setIsPlaying,
    };
}
