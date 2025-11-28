import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { GeneratedToken } from "@shared/schema";
import { Zap, Sparkles } from "lucide-react";

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
  const visibleTokens = tokens.slice(0, currentIndex + 1);
  const currentToken = currentIndex >= 0 && currentIndex < tokens.length ? tokens[currentIndex] : null;
  const chosenToken = selectedAlternative || currentToken?.token || "";

  const isProcessing = isGenerating || isRegenerating;
  
  const hasAlternatives = currentToken && currentToken.alternatives && currentToken.alternatives.length > 0;
  
  const showProbabilities = useMemo(() => {
    return currentIndex >= 0 && currentToken && !isProcessing && hasAlternatives;
  }, [currentIndex, currentToken, isProcessing, hasAlternatives]);

  const alternatives = currentToken?.alternatives || [];
  const chosenTokenProb = alternatives.length > 0 
    ? Math.max(...alternatives.map(a => a.probability)) + 0.15
    : 0.85;
  const chosenEntry = { token: chosenToken, probability: Math.min(chosenTokenProb, 0.95) };
  const combinedTokens = [chosenEntry, ...alternatives.filter(a => a.token !== chosenToken)];
  const allTokens = combinedTokens
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
  const maxProbability = allTokens.length > 0 
    ? Math.max(...allTokens.map((t) => t.probability), 0.01) 
    : 1;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 px-4 md:px-8">
        <div className="flex-1 flex flex-col items-end justify-center pr-2 md:pr-4 min-w-0">
          <div className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/60 mb-2 md:mb-4">
            Context Tokens
          </div>
          <div className="flex flex-wrap gap-1.5 md:gap-2 justify-end max-w-xs md:max-w-md">
            <AnimatePresence mode="popLayout">
              {visibleTokens.slice(0, -1).map((t, i) => (
                <motion.span
                  key={`context-${i}-${t.token}`}
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 0.7, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="px-2 md:px-3 py-1 md:py-1.5 bg-muted/40 rounded-md text-sm md:text-lg font-mono text-foreground/70"
                  data-testid={`context-token-${i}`}
                >
                  {t.token}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {currentToken && (
            <motion.div
              key={`input-token-${currentIndex}-${currentToken.token}`}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 md:mt-6"
            >
              <motion.div 
                className="px-4 md:px-6 py-2 md:py-3 bg-primary/20 border-2 border-primary/50 rounded-xl text-lg md:text-2xl font-mono text-primary font-bold shadow-lg shadow-primary/20"
                animate={isProcessing ? { 
                  boxShadow: ["0 0 20px rgba(59, 130, 246, 0.3)", "0 0 40px rgba(59, 130, 246, 0.5)", "0 0 20px rgba(59, 130, 246, 0.3)"]
                } : {}}
                transition={{ duration: 1, repeat: isProcessing ? Infinity : 0 }}
              >
                {chosenToken}
              </motion.div>
            </motion.div>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <motion.div
            className="w-32 h-32 md:w-48 md:h-48 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/30 flex items-center justify-center relative overflow-hidden"
            animate={{
              borderColor: isProcessing 
                ? ["rgba(59, 130, 246, 0.3)", "rgba(59, 130, 246, 0.7)", "rgba(59, 130, 246, 0.3)"]
                : "rgba(59, 130, 246, 0.3)",
              boxShadow: isProcessing 
                ? ["0 0 20px rgba(59, 130, 246, 0.2)", "0 0 60px rgba(59, 130, 246, 0.4)", "0 0 20px rgba(59, 130, 246, 0.2)"]
                : "0 0 20px rgba(59, 130, 246, 0.1)",
            }}
            transition={{ duration: 1.2, repeat: isProcessing ? Infinity : 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"
              animate={{
                opacity: isProcessing ? [0.2, 0.5, 0.2] : 0.1,
              }}
              transition={{ duration: 0.8, repeat: isProcessing ? Infinity : 0 }}
            />
            
            {isProcessing && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary"
                    initial={{ 
                      x: -80, 
                      y: (i - 4) * 15,
                      opacity: 0,
                      scale: 0.5
                    }}
                    animate={{ 
                      x: [-80, 0, 80],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.2, 0.5]
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.15,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                <motion.div
                  className="absolute inset-4 border-2 border-dashed border-primary/30 rounded-xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
              </>
            )}

            <div className="relative z-10 text-center">
              <motion.div 
                className="flex items-center justify-center gap-1 md:gap-2 mb-1 md:mb-2"
                animate={{ 
                  scale: isProcessing ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.8, repeat: isProcessing ? Infinity : 0 }}
              >
                {isProcessing ? (
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                ) : (
                  <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                )}
              </motion.div>
              <div className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Transformer
              </div>
              {isProcessing && (
                <motion.div 
                  className="text-[8px] md:text-[10px] text-primary/70 mt-1"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  Processing...
                </motion.div>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -top-2 md:-top-3 -right-2 md:-right-3"
              >
                <motion.div
                  className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-primary flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary-foreground" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-start justify-center pl-2 md:pl-4 min-w-0">
          <div className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/60 mb-2 md:mb-4 flex items-center gap-2">
            <span>Output Distribution</span>
            {showProbabilities && allTokens.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-1.5 md:px-2 py-0.5 bg-primary/20 text-primary text-[8px] md:text-[10px] rounded-full font-bold"
              >
                READY
              </motion.span>
            )}
          </div>
          
          <AnimatePresence mode="wait">
            {showProbabilities && allTokens.length > 0 && chosenToken ? (
              <motion.div
                key={`probability-output-${currentIndex}-${chosenToken}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-xs md:max-w-sm space-y-1.5 md:space-y-2"
              >
                {allTokens.map((item, index) => {
                  const isChosen = item.token === chosenToken;
                  const barWidth = (item.probability / maxProbability) * 100;
                  const displayPercentage = (item.probability * 100).toFixed(1);
                  const isClickable = !isChosen && onAlternativeClick && !isRegenerating;

                  return (
                    <motion.div
                      key={`${item.token}-${index}`}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className={`flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-lg transition-all ${
                        isClickable 
                          ? "cursor-pointer hover:bg-muted/40 hover:scale-[1.02]" 
                          : ""
                      } ${isChosen ? "bg-primary/10" : ""}`}
                      onClick={() => isClickable && onAlternativeClick(item.token)}
                      whileHover={isClickable ? { x: 4 } : {}}
                      data-testid={`pipeline-bar-${index}`}
                    >
                      <div className="w-14 md:w-20 text-right shrink-0">
                        <span className={`font-mono text-xs md:text-sm truncate block ${
                          isChosen ? "text-primary font-bold" : "text-foreground/60"
                        }`}>
                          {item.token}
                        </span>
                      </div>
                      
                      <div className="flex-1 h-6 md:h-8 bg-muted/20 rounded-md overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ delay: index * 0.05 + 0.1, duration: 0.5, ease: "easeOut" }}
                          className={`h-full rounded-md ${
                            isChosen 
                              ? "bg-gradient-to-r from-primary to-primary/70" 
                              : "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20"
                          }`}
                        />
                        {isChosen && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 + 0.3 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <span className="text-[8px] md:text-[10px] font-bold text-primary-foreground uppercase tracking-wider drop-shadow-sm">
                              Selected
                            </span>
                          </motion.div>
                        )}
                      </div>

                      <div className="w-10 md:w-14 text-right shrink-0">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 + 0.2 }}
                          className={`font-mono text-[10px] md:text-xs ${
                            isChosen ? "text-primary font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {displayPercentage}%
                        </motion.span>
                      </div>
                    </motion.div>
                  );
                })}
                
                {onAlternativeClick && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-[10px] md:text-xs text-muted-foreground/50 text-center mt-3 md:mt-4 italic"
                  >
                    Click any alternative to explore different paths
                  </motion.div>
                )}
              </motion.div>
            ) : isProcessing ? (
              <motion.div
                key="processing-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-start gap-3"
              >
                <div className="flex items-center gap-2 text-muted-foreground/60 text-xs md:text-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 md:w-4 md:h-4 border-2 border-primary/40 border-t-primary rounded-full"
                  />
                  <span>Computing probabilities...</span>
                </div>

                <div className="w-full max-w-xs md:max-w-sm space-y-1.5 md:space-y-2">
                  {[0.8, 0.5, 0.3, 0.2, 0.1].map((width, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="w-14 md:w-20 h-3 md:h-4 bg-muted/30 rounded animate-pulse" />
                      <div className="flex-1 h-6 md:h-8 bg-muted/20 rounded-md overflow-hidden">
                        <motion.div
                          className="h-full bg-muted/30 rounded-md"
                          animate={{ width: [`${width * 50}%`, `${width * 100}%`, `${width * 50}%`] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>
                      <div className="w-10 md:w-14 h-3 md:h-4 bg-muted/30 rounded animate-pulse" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : currentIndex < 0 ? (
              <motion.div
                key="idle-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground/40 text-xs md:text-sm"
              >
                Click "Next Token" to reveal the first token
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-center pb-4 md:pb-8">
        <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center max-w-4xl px-4">
          <AnimatePresence mode="popLayout">
            {visibleTokens.map((t, i) => {
              const isCurrentToken = i === currentIndex;
              const displayToken = i === currentIndex && selectedAlternative ? selectedAlternative : t.token;
              
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
                  className={`px-2 md:px-4 py-1 md:py-2 rounded-lg font-mono ${
                    isCurrentToken 
                      ? "text-xl md:text-3xl font-bold text-primary bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10" 
                      : "text-lg md:text-2xl text-foreground/70"
                  }`}
                  data-testid={`output-token-${i}`}
                >
                  {displayToken}
                </motion.span>
              );
            })}
          </AnimatePresence>
          
          {(isGenerating || isRegenerating || (visibleTokens.length > 0 && currentIndex < tokens.length - 1)) && (
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-xl md:text-3xl font-mono text-primary"
            >
              |
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
