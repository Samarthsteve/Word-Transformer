import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { GeneratedToken } from "@shared/schema";
import { Zap, Sparkles, Layers, ArrowRight, Brain, GitBranch } from "lucide-react";

type TransformerPipelineProps = {
  tokens: GeneratedToken[];
  currentIndex: number;
  isGenerating: boolean;
  isRegenerating: boolean;
  onAlternativeClick?: (token: string) => void;
  selectedAlternative?: string | null;
};

function TransformerBlock({ isProcessing }: { isProcessing: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      <motion.div
        className="w-36 h-44 md:w-52 md:h-64 rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-primary/30 flex flex-col relative overflow-hidden shadow-2xl"
        animate={{
          borderColor: isProcessing 
            ? ["rgba(59, 130, 246, 0.3)", "rgba(59, 130, 246, 0.7)", "rgba(59, 130, 246, 0.3)"]
            : "rgba(59, 130, 246, 0.3)",
          boxShadow: isProcessing 
            ? ["0 0 30px rgba(59, 130, 246, 0.2)", "0 0 60px rgba(59, 130, 246, 0.4)", "0 0 30px rgba(59, 130, 246, 0.2)"]
            : "0 0 20px rgba(59, 130, 246, 0.1)",
        }}
        transition={{ duration: 1.2, repeat: isProcessing ? Infinity : 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="relative z-10 p-2 md:p-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-1.5 md:gap-2">
            <motion.div
              animate={isProcessing ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </motion.div>
            <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-wider">
              Transformer
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-1.5 md:gap-2 p-2 md:p-3">
          {["Self-Attention", "Feed Forward", "Layer Norm"].map((layer, i) => (
            <motion.div
              key={layer}
              className="relative"
              initial={{ opacity: 0.5 }}
              animate={{ 
                opacity: isProcessing ? [0.5, 1, 0.5] : 0.8,
                scale: isProcessing ? [1, 1.02, 1] : 1,
              }}
              transition={{ 
                duration: 0.8, 
                delay: i * 0.2,
                repeat: isProcessing ? Infinity : 0 
              }}
            >
              <div className={`
                px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-center
                ${i === 0 ? "bg-blue-500/20 border border-blue-500/30" : ""}
                ${i === 1 ? "bg-purple-500/20 border border-purple-500/30" : ""}
                ${i === 2 ? "bg-green-500/20 border border-green-500/30" : ""}
              `}>
                <span className={`text-[8px] md:text-[10px] font-medium uppercase tracking-wide
                  ${i === 0 ? "text-blue-400" : ""}
                  ${i === 1 ? "text-purple-400" : ""}
                  ${i === 2 ? "text-green-400" : ""}
                `}>
                  {layer}
                </span>
              </div>
              
              {isProcessing && i < 2 && (
                <motion.div
                  className="absolute left-1/2 -bottom-2 w-0.5 h-2 bg-primary/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.5, delay: i * 0.2, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {isProcessing && (
          <>
            <motion.div
              className="absolute top-1/2 -left-4 md:-left-6"
              animate={{ x: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </motion.div>
            <motion.div
              className="absolute top-1/2 -right-4 md:-right-6"
              animate={{ x: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
            >
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </motion.div>
          </>
        )}

        <div className="relative z-10 p-2 md:p-3 border-t border-border/50 bg-gradient-to-r from-transparent to-primary/10">
          <div className="flex items-center justify-between">
            <span className="text-[8px] md:text-[10px] text-muted-foreground">x12 layers</span>
            {isProcessing ? (
              <motion.div
                className="flex items-center gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-[8px] md:text-[10px] text-primary font-medium">Active</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-muted-foreground" />
                <span className="text-[8px] md:text-[10px] text-muted-foreground">Ready</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-2 -right-2 md:-top-3 md:-right-3"
          >
            <motion.div
              className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Zap className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      <div className="flex-1 flex items-center justify-center gap-4 md:gap-10 px-4 md:px-8">
        <div className="flex-1 flex flex-col items-end justify-center pr-2 md:pr-6 min-w-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-3 md:mb-4"
          >
            <Layers className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/60" />
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/60 font-medium">
              Input Context
            </span>
          </motion.div>
          
          <div className="flex flex-wrap gap-1.5 md:gap-2 justify-end max-w-xs md:max-w-md">
            <AnimatePresence mode="popLayout">
              {visibleTokens.slice(0, -1).map((t, i) => (
                <motion.span
                  key={`context-${i}-${t.token}`}
                  initial={{ opacity: 0, scale: 0.8, x: -15 }}
                  animate={{ opacity: 0.8, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="px-2.5 md:px-4 py-1 md:py-2 bg-gradient-to-r from-muted/60 to-muted/40 rounded-lg text-sm md:text-lg font-mono text-foreground/80 border border-border/30 shadow-sm"
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
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="mt-4 md:mt-6"
            >
              <motion.div 
                className="px-4 md:px-8 py-2 md:py-4 bg-gradient-to-r from-primary/25 to-primary/15 border-2 border-primary/50 rounded-xl text-lg md:text-3xl font-mono text-primary font-bold shadow-xl shadow-primary/20"
                animate={isProcessing ? { 
                  boxShadow: ["0 0 25px rgba(59, 130, 246, 0.3)", "0 0 50px rgba(59, 130, 246, 0.5)", "0 0 25px rgba(59, 130, 246, 0.3)"],
                  borderColor: ["rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 0.8)", "rgba(59, 130, 246, 0.5)"]
                } : {}}
                transition={{ duration: 1.2, repeat: isProcessing ? Infinity : 0 }}
              >
                {chosenToken}
              </motion.div>
            </motion.div>
          )}
        </div>

        <TransformerBlock isProcessing={isProcessing} />

        <div className="flex-1 flex flex-col items-start justify-center pl-2 md:pl-6 min-w-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-3 md:mb-4"
          >
            <GitBranch className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/60" />
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground/60 font-medium">
              Output Distribution
            </span>
            {showProbabilities && allTokens.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[8px] md:text-[10px] rounded-full font-bold uppercase tracking-wider border border-green-500/30"
              >
                Live
              </motion.span>
            )}
          </motion.div>
          
          <AnimatePresence mode="wait">
            {showProbabilities && allTokens.length > 0 && chosenToken ? (
              <motion.div
                key={`probability-output-${currentIndex}-${chosenToken}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-xs md:max-w-md space-y-2 md:space-y-3"
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
                      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className={`group flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-xl transition-all duration-300 ${
                        isClickable 
                          ? "cursor-pointer hover:bg-muted/50 hover:scale-[1.02] hover:shadow-lg" 
                          : ""
                      } ${isChosen ? "bg-primary/15 border border-primary/30 shadow-lg shadow-primary/10" : "bg-muted/20 border border-transparent"}`}
                      onClick={() => isClickable && onAlternativeClick(item.token)}
                      whileHover={isClickable ? { x: 6 } : {}}
                      data-testid={`pipeline-bar-${index}`}
                    >
                      <div className="w-16 md:w-24 text-right shrink-0">
                        <span className={`font-mono text-sm md:text-base truncate block ${
                          isChosen ? "text-primary font-bold" : "text-foreground/70 group-hover:text-foreground"
                        }`}>
                          {item.token}
                        </span>
                      </div>
                      
                      <div className="flex-1 h-7 md:h-10 bg-muted/30 rounded-lg overflow-hidden relative border border-border/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ delay: index * 0.06 + 0.15, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                          className={`h-full rounded-lg ${
                            isChosen 
                              ? "bg-gradient-to-r from-primary via-primary/90 to-primary/70" 
                              : "bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30"
                          }`}
                        />
                        {isChosen && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.06 + 0.4 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <span className="text-[8px] md:text-xs font-bold text-primary-foreground uppercase tracking-wider drop-shadow-md">
                              Selected
                            </span>
                          </motion.div>
                        )}
                      </div>

                      <div className="w-12 md:w-16 text-right shrink-0">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.06 + 0.25 }}
                          className={`font-mono text-xs md:text-sm ${
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
                    transition={{ delay: 0.5 }}
                    className="text-[10px] md:text-xs text-muted-foreground/60 text-center mt-4 italic flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Click any alternative to explore a different path
                  </motion.div>
                )}
              </motion.div>
            ) : isProcessing ? (
              <motion.div
                key="processing-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-start gap-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground/70 text-xs md:text-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 md:w-5 md:h-5 border-2 border-primary/40 border-t-primary rounded-full"
                  />
                  <span>Computing attention & probabilities...</span>
                </div>

                <div className="w-full max-w-xs md:max-w-md space-y-2">
                  {[0.85, 0.55, 0.35, 0.2, 0.1].map((width, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="w-16 md:w-24 h-4 bg-muted/40 rounded animate-pulse" />
                      <div className="flex-1 h-7 md:h-10 bg-muted/20 rounded-lg overflow-hidden">
                        <motion.div
                          className="h-full bg-muted/40 rounded-lg"
                          animate={{ width: [`${width * 40}%`, `${width * 100}%`, `${width * 40}%`] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                      <div className="w-12 md:w-16 h-4 bg-muted/40 rounded animate-pulse" />
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
                className="text-muted-foreground/50 text-xs md:text-sm p-4 rounded-xl border border-dashed border-border/50"
              >
                Click "Next Token" to reveal predictions
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-center pb-4 md:pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 md:p-4 rounded-2xl bg-gradient-to-r from-card/80 via-card to-card/80 backdrop-blur-md border border-border/50 shadow-xl"
        >
          <div className="flex flex-wrap gap-1.5 md:gap-3 justify-center max-w-4xl">
            <AnimatePresence mode="popLayout">
              {visibleTokens.map((t, i) => {
                const isCurrentToken = i === currentIndex;
                const displayToken = i === currentIndex && selectedAlternative ? selectedAlternative : t.token;
                
                return (
                  <motion.span
                    key={`output-${i}-${t.token}`}
                    initial={{ opacity: 0, y: 25, scale: 0.8, rotateX: -15 }}
                    animate={{ 
                      opacity: isCurrentToken ? 1 : 0.75, 
                      y: 0, 
                      scale: 1,
                      rotateX: 0
                    }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className={`px-3 md:px-5 py-1.5 md:py-2.5 rounded-lg font-mono ${
                      isCurrentToken 
                        ? "text-xl md:text-3xl font-bold text-primary bg-primary/15 border-2 border-primary/40 shadow-lg shadow-primary/15" 
                        : "text-lg md:text-2xl text-foreground/75 bg-muted/30 border border-border/30"
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
                animate={{ 
                  opacity: [0.2, 1, 0.2],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="text-xl md:text-3xl font-mono text-primary font-bold"
              >
                |
              </motion.span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
