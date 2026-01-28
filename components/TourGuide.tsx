import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, CheckCircle2, Lock, SkipForward } from 'lucide-react';

export interface TourStep {
  targetId: string;
  title: string;
  content: React.ReactNode;
  view: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  requiresInteraction?: boolean;
}

interface Props {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void; // Nova prop opcional
  currentStepIndex: number;
  setCurrentStepIndex: (i: number) => void;
  disableNext?: boolean;
}

const TourGuide: React.FC<Props> = ({ steps, isOpen, onClose, onComplete, onSkip, currentStepIndex, setCurrentStepIndex, disableNext = false }) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[currentStepIndex];

  const updatePosition = useCallback(() => {
      if (!step) return;
      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Padding visual
        setTargetRect({
            ...rect,
            top: rect.top - 10,
            left: rect.left - 10,
            width: rect.width + 20,
            height: rect.height + 20,
            bottom: rect.bottom + 10,
            right: rect.right + 10,
            x: rect.x - 10,
            y: rect.y - 10,
            toJSON: () => {}
        });
      }
  }, [step]);

  useLayoutEffect(() => {
    if (!isOpen || !step) return;

    // Scroll inicial
    const element = document.getElementById(step.targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Delay para animações e renderização
    const timer = setTimeout(updatePosition, 300);
    // Retry
    const retry = setTimeout(updatePosition, 800);

    if (step.action) step.action();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); // Capture phase para pegar scroll de containers internos

    return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        clearTimeout(timer);
        clearTimeout(retry);
    };
  }, [currentStepIndex, isOpen, step, updatePosition]);

  if (!isOpen || !step) return null;

  const handleNext = () => {
    if (disableNext) return;
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Cálculos Card
  let top = 0;
  let left = 0;
  const cardWidth = 320; 
  const gap = 20;

  if (targetRect) {
      if (step.position === 'right') {
          top = targetRect.top;
          left = targetRect.right + gap;
      } else if (step.position === 'left') {
          top = targetRect.top;
          left = targetRect.left - cardWidth - gap;
      } else if (step.position === 'top') {
          top = targetRect.top - gap - 220;
          left = targetRect.left;
      } else {
          top = targetRect.bottom + gap;
          left = targetRect.left;
      }

      // Ajustes de borda
      if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
      if (left < 20) left = 20;
      if (top < 20) top = 20;
      if (top + 200 > window.innerHeight) top = window.innerHeight - 250;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">
      
      {/* Máscara com Recorte */}
      <div 
        className="absolute inset-0 bg-black/80 transition-all duration-300 ease-out pointer-events-auto"
        style={{
            clipPath: targetRect 
                ? `polygon(
                    0% 0%, 
                    0% 100%, 
                    100% 100%, 
                    100% 0%, 
                    
                    ${targetRect.left}px 0%, 
                    ${targetRect.left}px ${targetRect.top}px, 
                    ${targetRect.right}px ${targetRect.top}px, 
                    ${targetRect.right}px ${targetRect.bottom}px, 
                    ${targetRect.left}px ${targetRect.bottom}px, 
                    ${targetRect.left}px 0%
                   )` 
                : undefined
        }}
      ></div>

      {/* Destaque Visual */}
      {targetRect && (
          <div 
            className="absolute border-2 border-primary shadow-[0_0_30px_rgba(112,0,255,0.6)] rounded-lg pointer-events-none transition-all duration-300"
            style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height
            }}
          >
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-primary rounded-full animate-ping opacity-75"></div>
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-primary rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  {currentStepIndex + 1}
              </div>
          </div>
      )}

      {/* Card */}
      {targetRect && (
          <div 
            className="absolute transition-all duration-300 pointer-events-auto"
            style={{ top, left, width: cardWidth }}
          >
              <div className="bg-[#0f0a1e] border border-white/20 rounded-2xl shadow-2xl p-5 animate-fade-in relative backdrop-blur-xl">
                  
                  <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-white text-lg">{step.title}</h3>
                      <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                          <X size={16} />
                      </button>
                  </div>
                  
                  <div className="text-sm text-gray-300 leading-relaxed mb-6 font-medium">
                      {step.content}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                      
                      {/* Botão Pular (Esquerda) */}
                      {onSkip && (
                          <button 
                            onClick={onSkip}
                            className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest flex items-center gap-1 transition-colors mr-auto"
                          >
                              <SkipForward size={10} /> Pular
                          </button>
                      )}
                      
                      {!onSkip && (
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mr-auto">
                              Passo {currentStepIndex + 1} de {steps.length}
                          </span>
                      )}
                      
                      <div className="flex gap-2">
                          <button 
                            onClick={handlePrev}
                            disabled={currentStepIndex === 0}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-colors"
                          >
                              <ChevronLeft size={18} />
                          </button>
                          
                          <button 
                            onClick={handleNext}
                            disabled={disableNext}
                            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-lg border
                                ${disableNext 
                                    ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' 
                                    : 'bg-primary hover:bg-primary-glow text-white border-primary/50 shadow-primary/20 cursor-pointer'}
                            `}
                          >
                              {disableNext && <Lock size={12} />}
                              {currentStepIndex === steps.length - 1 ? 'Concluir' : 'Próximo'}
                              {!disableNext && (currentStepIndex === steps.length - 1 ? <CheckCircle2 size={14} /> : <ChevronRight size={14} />)}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TourGuide;