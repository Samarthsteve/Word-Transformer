import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { GeneratedToken } from "@shared/schema";
import { Zap, Sparkles, Brain, Layers, ArrowRight, Target } from "lucide-react";
import { AttentionVisualization } from "./AttentionVisualization";

type TransformerPipelineProps = {
  tokens: GeneratedToken[];
  currentIndex: number;
  isGenerating: boolean;
  isRegenerating: boolean;
  onAlternativeClick?: (token: string) => void;
  selectedAlternative?: string | null;
  showAttention?: boolean;
};

export function TransformerPipeline({
  tokens,
  currentIndex,
  isGenerating,
  isRegenerating,
  onAlternativeClick,
  selectedAlternative,
  showAttention = true,
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 py-2 min-h-0">
        <div className="flex flex-col min-h-0 lg:border-r lg:border-border/30 lg:pr-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-2">
            <Layers className="w-3 h-3" />
            <span>Input Context</span>
            <span className="ml-auto text-primary/60 font-mono">
              {visibleTokens.length > 0 ? visibleTokens.length - 1 : 0} tokens
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
            <div className="flex flex-wrap gap-1.5 content-start">
              <AnimatePresence mode="popLayout">
                {visibleTokens.slice(0, -1).map((t, i) => (
                  <motion.span
                    key={`context-${i}-${t.token}`}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 0.8, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="px-2 py-1 bg-muted/50 rounded text-xs font-mono text-foreground/80 border border-border/30"
                    data-testid={`context-token-${i}`}
                  >
                    {t.token}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {currentToken && (
            <motion.div
              key={`current-input-${currentIndex}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-3 pt-3 border-t border-border/30"
            >
              <div className="text-[10px] uppercase tracking-widest text-primary/60 mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>Current Token</span>
              </div>
              <motion.div 
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary/15 border border-primary/40 rounded-lg"
                animate={isProcessing ? { 
                  boxShadow: ["0 0 10px rgba(59, 130, 246, 0.2)", "0 0 25px rgba(59, 130, 246, 0.4)", "0 0 10px rgba(59, 130, 246, 0.2)"]
                } : {}}
                transition={{ duration: 1, repeat: isProcessing ? Infinity : 0 }}
              >
                <span className="text-lg font-mono text-primary font-bold">
                  {chosenToken}
                </span>
                {isProcessing && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 border border-primary/40 border-t-primary rounded-full"
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </div>

        <div className="flex flex-col min-h-0 relative">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-2">
            <Brain className="w-3 h-3" />
            <span>Transformer Processing</span>
          </div>

          <motion.div
            className="flex-1 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden min-h-[180px]"
            animate={{
              borderColor: isProcessing 
                ? ["rgba(59, 130, 246, 0.2)", "rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 0.2)"]
                : "rgba(59, 130, 246, 0.2)",
            }}
            transition={{ duration: 1.5, repeat: isProcessing ? Infinity : 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"
              animate={{
                opacity: isProcessing ? [0.1, 0.3, 0.1] : 0.05,
              }}
              transition={{ duration: 1, repeat: isProcessing ? Infinity : 0 }}
            />

            {isProcessing && (
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary/60"
                    style={{
                      left: `${10 + (i % 4) * 25}%`,
                      top: `${20 + Math.floor(i / 4) * 30}%`,
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 0.5],
                      x: [0, 20, 40],
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.1,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>
            )}

            {showAttention && (
              <AttentionVisualization
                tokens={visibleTokens.map(t => t.token)}
                currentTokenIndex={currentIndex}
                isProcessing={isProcessing}
              />
            )}

            {!showAttention && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <motion.div 
                    className="flex items-center justify-center mb-2"
                    animate={{ 
                      scale: isProcessing ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.8, repeat: isProcessing ? Infinity : 0 }}
                  >
                    {isProcessing ? (
                      <Zap className="w-8 h-8 text-primary" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-primary/60" />
                    )}
                  </motion.div>
                  <div className="text-xs text-muted-foreground">
                    {isProcessing ? "Processing..." : "Ready"}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/50">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary/40" />
              <span>Self-Attention</span>
            </div>
            <ArrowRight className="w-3 h-3" />
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500/40" />
              <span>Feed-Forward</span>
            </div>
            <ArrowRight className="w-3 h-3" />
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500/40" />
              <span>Softmax</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col min-h-0 lg:border-l lg:border-border/30 lg:pl-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-2">
            <span>Probability Distribution</span>
            {showProbabilities && allTokens.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-1.5 py-0.5 bg-green-500/20 text-green-500 text-[8px] rounded-full font-bold"
              >
                READY
              </motion.span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <AnimatePresence mode="wait">
              {showProbabilities && allTokens.length > 0 && chosenToken ? (
                <motion.div
                  key={`probability-output-${currentIndex}-${chosenToken}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
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
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className={`p-2 rounded-lg transition-all ${
                          isClickable 
                            ? "cursor-pointer hover:bg-muted/40 hover:scale-[1.02]" 
                            : ""
                        } ${isChosen ? "bg-primary/10 border border-primary/30" : "bg-muted/20"}`}
                        onClick={() => isClickable && onAlternativeClick(item.token)}
                        whileHover={isClickable ? { x: 4 } : {}}
                        data-testid={`pipeline-bar-${index}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-mono text-xs ${
                            isChosen ? "text-primary font-bold" : "text-foreground/70"
                          }`}>
                            "{item.token}"
                          </span>
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 + 0.2 }}
                            className={`font-mono text-[10px] ${
                              isChosen ? "text-primary font-bold" : "text-muted-foreground"
                            }`}
                          >
                            {displayPercentage}%
                          </motion.span>
                        </div>
                        
                        <div className="h-2 bg-muted/30 rounded overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ delay: index * 0.05 + 0.1, duration: 0.4, ease: "easeOut" }}
                            className={`h-full rounded ${
                              isChosen 
                                ? "bg-gradient-to-r from-primary to-primary/70" 
                                : "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20"
                            }`}
                          />
                        </div>
                        
                        {isChosen && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-1 text-[9px] text-primary/70 font-medium"
                          >
                            Selected choice
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                  
                  {onAlternativeClick && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-[10px] text-muted-foreground/50 text-center pt-2 border-t border-border/30 mt-3"
                    >
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
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-muted-foreground/60 text-xs">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full"
                    />
                    <span>Computing probabilities...</span>
                  </div>

                  <div className="space-y-2">
                    {[0.8, 0.5, 0.3, 0.2, 0.1].map((width, i) => (
                      <motion.div
                        key={i}
                        className="p-2 rounded-lg bg-muted/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex justify-between mb-1">
                          <div className="w-12 h-3 bg-muted/30 rounded animate-pulse" />
                          <div className="w-8 h-3 bg-muted/30 rounded animate-pulse" />
                        </div>
                        <div className="h-2 bg-muted/20 rounded overflow-hidden">
                          <motion.div
                            className="h-full bg-muted/30 rounded"
                            animate={{ width: [`${width * 50}%`, `${width * 100}%`, `${width * 50}%`] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
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
                  className="h-full flex items-center justify-center"
                >
                  <div className="text-center text-muted-foreground/40 text-sm">
                    <div className="text-2xl mb-2">📊</div>
                    <p>Probabilities appear here</p>
                    <p className="text-xs mt-1">after each token</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
