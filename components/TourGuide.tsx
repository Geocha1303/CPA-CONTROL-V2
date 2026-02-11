import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, CheckCircle2, Lock, SkipForward, Cpu, Loader2, MousePointerClick } from 'lucide-react';

export interface TourStep {
  targetId: string;
  title: string;
  content: React.ReactNode;
  view: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  waitForAction?: boolean; // Se true, esconde o botão próximo e espera o App avançar
}

interface Props {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void;
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
      } else {
          setTargetRect(null);
      }
  }, [step]);

  useLayoutEffect(() => {
    if (!isOpen || !step) return;

    const element = document.getElementById(step.targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timer = setTimeout(updatePosition, 300);
    const retry = setTimeout(updatePosition, 800);

    if (step.action) step.action();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        clearTimeout(timer);
        clearTimeout(retry);
    };
  }, [currentStepIndex, isOpen, step, updatePosition]);

  if (!isOpen || !step) return null;
  if (!targetRect) return null;

  const handleNext = () => {
    if (disableNext || step.waitForAction) return;
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

  // Cálculos Card Inteligente
  let top = 0;
  let left = 0;
  const cardWidth = 340; 
  const gap = 25;

  if (targetRect) {
      if (step.position === 'right') {
          top = targetRect.top;
          left = targetRect.right + gap;
      } else if (step.position === 'left') {
          top = targetRect.top;
          left = targetRect.left - cardWidth - gap;
      } else if (step.position === 'top') {
          top = targetRect.top - gap - 280; // Mais espaço para o card maior
          left = targetRect.left;
      } else {
          top = targetRect.bottom + gap;
          left = targetRect.left;
      }

      // Edge detection simples
      if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 20;
      if (left < 20) left = 20;
      if (top < 20) top = 20;
      if (top + 280 > window.innerHeight) top = window.innerHeight - 320;
  }

  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none font-sans">
      
      {/* Máscara de Foco */}
      <div 
        className="absolute inset-0 bg-black/80 transition-all duration-500 ease-out pointer-events-auto backdrop-blur-[2px]"
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

      {/* Target Highlighter */}
      {targetRect && (
          <div 
            className={`absolute border-2 shadow-[0_0_50px_rgba(112,0,255,0.6)] rounded-xl pointer-events-none transition-all duration-500 ${step.waitForAction ? 'border-amber-400 animate-pulse' : 'border-primary'}`}
            style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height
            }}
          >
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
              
              {step.waitForAction && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-bounce">
                      <MousePointerClick size={12} /> AÇÃO NECESSÁRIA
                  </div>
              )}
          </div>
      )}

      {/* Card Futurista */}
      {targetRect && (
          <div 
            className="absolute transition-all duration-500 pointer-events-auto ease-out"
            style={{ top, left, width: cardWidth }}
          >
              <div className="bg-[#0f0a1e]/95 border border-primary/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-fade-in relative group">
                  
                  {/* Progress Bar Top */}
                  <div className="h-1 w-full bg-gray-800">
                      <div className={`h-full transition-all duration-500 shadow-[0_0_10px_#7000FF] ${step.waitForAction ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${progressPercent}%` }}></div>
                  </div>

                  <div className="p-6 relative">
                      {/* Background Detail */}
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <Cpu size={80} />
                      </div>

                      {/* Header */}
                      <div className="flex justify-between items-start mb-4 relative z-10">
                          <div>
                              <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1 ${step.waitForAction ? 'text-amber-400' : 'text-primary'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${step.waitForAction ? 'bg-amber-400' : 'bg-primary'}`}></div>
                                  {step.waitForAction ? 'AGUARDANDO USUÁRIO' : 'PROTOCOLO DE INÍCIO'}
                              </div>
                              <h3 className="font-bold text-white text-xl tracking-tight">{step.title}</h3>
                          </div>
                          {!step.waitForAction && (
                              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg hover:bg-white/10">
                                  <X size={14} />
                              </button>
                          )}
                      </div>
                      
                      {/* Content */}
                      <div className={`text-sm text-gray-300 leading-relaxed mb-6 font-medium border-l-2 pl-3 ${step.waitForAction ? 'border-amber-500/50' : 'border-primary/20'}`}>
                          {step.content}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between mt-auto h-10">
                          
                          {/* Paginator */}
                          <div className="flex items-center gap-1">
                              {steps.map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`h-1.5 rounded-full transition-all ${i === currentStepIndex ? (step.waitForAction ? 'w-4 bg-amber-500' : 'w-4 bg-primary') : 'w-1.5 bg-gray-700'}`}
                                  ></div>
                              ))}
                          </div>
                          
                          <div className="flex gap-2">
                              {!step.waitForAction && (
                                  <button 
                                    onClick={handlePrev}
                                    disabled={currentStepIndex === 0}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-20 transition-colors"
                                  >
                                      <ChevronLeft size={16} />
                                  </button>
                              )}
                              
                              {step.waitForAction ? (
                                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold animate-pulse">
                                      <Loader2 size={14} className="animate-spin" />
                                      Realize a ação...
                                  </div>
                              ) : (
                                  <button 
                                    onClick={handleNext}
                                    disabled={disableNext}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg border relative overflow-hidden group/btn
                                        ${disableNext 
                                            ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' 
                                            : 'bg-primary hover:bg-primary-glow text-white border-primary/50 shadow-primary/20 cursor-pointer'}
                                    `}
                                  >
                                      <span className="relative z-10 flex items-center gap-2">
                                          {disableNext && <Lock size={12} />}
                                          {currentStepIndex === steps.length - 1 ? 'FINALIZAR' : 'PRÓXIMO'}
                                          {!disableNext && (currentStepIndex === steps.length - 1 ? <CheckCircle2 size={14} /> : <ChevronRight size={14} />)}
                                      </span>
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
                  
                  {/* Skip Option */}
                  {onSkip && !step.waitForAction && (
                      <div className="bg-black/20 px-6 py-2 border-t border-white/5 flex justify-center">
                          <button 
                            onClick={onSkip}
                            className="text-[9px] text-gray-500 hover:text-gray-300 uppercase font-bold tracking-widest flex items-center gap-1 transition-colors"
                          >
                              <SkipForward size={10} /> Pular Tutorial
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default TourGuide;