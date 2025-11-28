import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { GeneratedToken, TokenProbability } from "@shared/schema";

type PipelinePhase = "idle" | "input" | "processing" | "output";

type TransformerPipelineProps = {
  tokens: GeneratedToken[];
  currentIndex: number;
  isGenerating: boolean;
  isRegenerating: boolean;
  onAlternativeClick?: (token: string) => void;
  selectedAlternative?: string | null;
};

export function TransformerPipeline({
  tokens,
  currentIndex,
  isGenerating,
  isRegenerating,
  onAlternativeClick,
  selectedAlternative,
}: TransformerPipelineProps) {
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [prevIndex, setPrevIndex] = useState(-1);

  const visibleTokens = tokens.slice(0, currentIndex + 1);
  const currentToken = currentIndex >= 0 && currentIndex < tokens.length ? tokens[currentIndex] : null;
  const chosenToken = selectedAlternative || currentToken?.token || "";

  useEffect(() => {
    if (currentIndex > prevIndex && currentIndex >= 0) {
      setPhase("input");
      const timer1 = setTimeout(() => setPhase("processing"), 400);
      const timer2 = setTimeout(() => setPhase("output"), 1200);
      setPrevIndex(currentIndex);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [currentIndex, prevIndex]);

  useEffect(() => {
    if (isGenerating || isRegenerating) {
      setPhase("processing");
    }
  }, [isGenerating, isRegenerating]);

  const alternatives = currentToken?.alternatives || [];
  const chosenTokenProb = alternatives.length > 0 
    ? Math.max(...alternatives.map(a => a.probability)) + 0.1 
    : 0.9;
  const chosenEntry = { token: chosenToken, probability: chosenTokenProb };
  const combinedTokens = [chosenEntry, ...alternatives.filter(a => a.token !== chosenToken)];
  const allTokens = combinedTokens
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
  const maxProbability = allTokens.length > 0 
    ? Math.max(...allTokens.map((t) => t.probability), 0.01) 
    : 1;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center gap-8 px-8">
        <div className="flex-1 flex flex-col items-end justify-center pr-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4">
            Context
          </div>
          <div className="flex flex-wrap gap-2 justify-end max-w-md">
            <AnimatePresence mode="popLayout">
              {visibleTokens.slice(0, -1).map((t, i) => (
                <motion.span
                  key={`context-${i}-${t.token}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.6, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-3 py-1.5 bg-muted/40 rounded-md text-lg font-mono text-foreground/70"
                >
                  {t.token}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative">
          <motion.div
            className="w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center relative overflow-hidden"
            animate={{
              boxShadow: phase === "processing" 
                ? ["0 0 20px rgba(var(--primary), 0.3)", "0 0 60px rgba(var(--primary), 0.5)", "0 0 20px rgba(var(--primary), 0.3)"]
                : "0 0 20px rgba(var(--primary), 0.2)",
            }}
            transition={{ duration: 1, repeat: phase === "processing" ? Infinity : 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"
              animate={{
                opacity: phase === "processing" ? [0.3, 0.6, 0.3] : 0.2,
              }}
              transition={{ duration: 0.8, repeat: phase === "processing" ? Infinity : 0 }}
            />
            
            <div className="relative z-10 text-center">
              <motion.div 
                className="text-3xl font-bold text-primary mb-1"
                animate={{ 
                  scale: phase === "processing" ? [1, 1.05, 1] : 1 
                }}
                transition={{ duration: 0.5, repeat: phase === "processing" ? Infinity : 0 }}
              >
                T
              </motion.div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Transformer
              </div>
            </div>

            {(phase === "processing" || isGenerating || isRegenerating) && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary"
                    initial={{ 
                      x: -60, 
                      y: Math.random() * 100 - 50,
                      opacity: 0 
                    }}
                    animate={{ 
                      x: 60, 
                      y: Math.random() * 100 - 50,
                      opacity: [0, 1, 0] 
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>

          <AnimatePresence>
            {phase === "input" && currentToken && (
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 0, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.4 }}
                className="absolute -left-32 top-1/2 -translate-y-1/2"
              >
                <div className="px-4 py-2 bg-primary/20 border border-primary/40 rounded-lg text-xl font-mono text-primary font-bold">
                  {currentToken.token}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-start justify-center pl-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4">
            Probability Distribution
          </div>
          
          <AnimatePresence mode="wait">
            {phase === "output" && allTokens.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-sm space-y-2"
              >
                {allTokens.map((item, index) => {
                  const isChosen = item.token === chosenToken;
                  const barWidth = (item.probability / maxProbability) * 100;
                  const displayPercentage = (item.probability * 100).toFixed(1);
                  const isClickable = !isChosen && onAlternativeClick && !isRegenerating;

                  return (
                    <motion.div
                      key={`${item.token}-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        isClickable 
                          ? "cursor-pointer hover:bg-muted/30" 
                          : ""
                      }`}
                      onClick={() => isClickable && onAlternativeClick(item.token)}
                      whileHover={isClickable ? { scale: 1.02, x: 4 } : {}}
                      data-testid={`pipeline-bar-${index}`}
                    >
                      <div className="w-20 text-right shrink-0">
                        <span className={`font-mono text-sm ${
                          isChosen ? "text-primary font-bold" : "text-foreground/60"
                        }`}>
                          {item.token}
                        </span>
                      </div>
                      
                      <div className="flex-1 h-8 bg-muted/20 rounded-md overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                          className={`h-full rounded-md ${
                            isChosen 
                              ? "bg-gradient-to-r from-primary to-primary/70" 
                              : "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/20"
                          }`}
                        />
                        {isChosen && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                              Selected
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-12 text-right shrink-0">
                        <span className={`font-mono text-xs ${
                          isChosen ? "text-primary font-bold" : "text-muted-foreground"
                        }`}>
                          {displayPercentage}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                
                {onAlternativeClick && (
                  <div className="text-xs text-muted-foreground/50 text-center mt-4 italic">
                    Click any alternative to explore different paths
                  </div>
                )}
              </motion.div>
            )}

            {(phase === "processing" || isGenerating || isRegenerating) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground/60 text-sm"
              >
                Computing probabilities...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-center pb-8">
        <div className="flex flex-wrap gap-2 justify-center max-w-4xl">
          <AnimatePresence mode="popLayout">
            {visibleTokens.map((t, i) => {
              const isCurrentToken = i === currentIndex;
              return (
                <motion.span
                  key={`output-${i}-${t.token}`}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: isCurrentToken ? 1 : 0.7, 
                    y: 0, 
                    scale: 1 
                  }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className={`px-4 py-2 rounded-lg font-mono ${
                    isCurrentToken 
                      ? "text-2xl md:text-3xl font-bold text-primary bg-primary/10 border border-primary/30" 
                      : "text-xl md:text-2xl text-foreground/70"
                  }`}
                  data-testid={`output-token-${i}`}
                >
                  {i === currentIndex && selectedAlternative ? selectedAlternative : t.token}
                </motion.span>
              );
            })}
          </AnimatePresence>
          
          {(isGenerating || isRegenerating || (visibleTokens.length > 0 && currentIndex < tokens.length - 1)) && (
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-2xl md:text-3xl font-mono text-primary"
            >
              |
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
