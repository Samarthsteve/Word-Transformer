import { motion } from "framer-motion";
import { useMemo } from "react";

type AttentionVisualizationProps = {
  tokens: string[];
  currentTokenIndex: number;
  isProcessing: boolean;
};

export function AttentionVisualization({ 
  tokens, 
  currentTokenIndex,
  isProcessing 
}: AttentionVisualizationProps) {
  const visibleTokens = tokens.slice(0, currentTokenIndex + 1);
  
  const attentionWeights = useMemo(() => {
    if (visibleTokens.length === 0) return [];
    
    return visibleTokens.map((_, i) => {
      const recency = (i + 1) / visibleTokens.length;
      const importance = 0.3 + Math.random() * 0.4;
      return Math.min(0.95, recency * 0.6 + importance * 0.4);
    });
  }, [visibleTokens.length]);

  if (visibleTokens.length < 2) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground/50 text-sm">
          <div className="text-3xl mb-2">🔍</div>
          <p>Attention patterns will appear here</p>
          <p className="text-xs mt-1">as tokens are generated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4 flex items-center gap-2">
        <span>Self-Attention Pattern</span>
        {isProcessing && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-primary text-[10px]"
          >
            Computing...
          </motion.span>
        )}
      </div>
      
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="relative">
          <svg 
            viewBox={`0 0 ${Math.min(visibleTokens.length * 60 + 100, 400)} ${Math.min(visibleTokens.length * 40 + 60, 250)}`}
            className="w-full h-auto max-h-[200px]"
            style={{ minWidth: '200px', maxWidth: '100%' }}
          >
            <defs>
              <linearGradient id="attentionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {visibleTokens.slice(0, -1).map((_, i) => {
              const startX = 50;
              const startY = 30 + i * 35;
              const endX = Math.min(visibleTokens.length * 50 + 30, 350);
              const endY = 30 + currentTokenIndex * 35;
              const weight = attentionWeights[i] || 0.3;
              
              const midX = (startX + endX) / 2;
              const curveOffset = (endY - startY) * 0.3;
              
              return (
                <motion.g key={`attention-line-${i}`}>
                  <motion.path
                    d={`M ${startX} ${startY} Q ${midX} ${startY + curveOffset} ${endX} ${endY}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={Math.max(1, weight * 3)}
                    strokeOpacity={weight * 0.6}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: isProcessing ? [0, 1, 0] : 1 }}
                    transition={{ 
                      duration: isProcessing ? 2 : 0.5, 
                      delay: i * 0.1,
                      repeat: isProcessing ? Infinity : 0
                    }}
                    filter={weight > 0.7 ? "url(#glow)" : undefined}
                  />
                </motion.g>
              );
            })}

            {visibleTokens.map((token, i) => {
              const x = 50;
              const y = 30 + i * 35;
              const isCurrentToken = i === currentTokenIndex;
              
              return (
                <motion.g key={`token-node-${i}`}>
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={isCurrentToken ? 12 : 8}
                    fill={isCurrentToken ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                    stroke={isCurrentToken ? "hsl(var(--primary))" : "hsl(var(--border))"}
                    strokeWidth={isCurrentToken ? 2 : 1}
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: 1,
                      r: isCurrentToken && isProcessing ? [12, 14, 12] : (isCurrentToken ? 12 : 8)
                    }}
                    transition={{ 
                      scale: { delay: i * 0.05 },
                      r: { duration: 1, repeat: isProcessing ? Infinity : 0 }
                    }}
                  />
                  <motion.text
                    x={x + 20}
                    y={y + 4}
                    className={`text-[10px] font-mono ${isCurrentToken ? 'fill-primary font-bold' : 'fill-muted-foreground'}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 + 0.1 }}
                  >
                    {token.length > 8 ? token.slice(0, 8) + '…' : token}
                  </motion.text>
                </motion.g>
              );
            })}

            {isProcessing && (
              <motion.circle
                cx={Math.min(visibleTokens.length * 50 + 30, 350)}
                cy={30 + currentTokenIndex * 35}
                r={6}
                fill="hsl(var(--primary))"
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  r: [4, 8, 4]
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </svg>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-border/30">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gradient-to-r from-primary/20 to-primary/80 rounded" />
            <span>Attention weight</span>
          </div>
          <span>Tokens attend to previous context</span>
        </div>
      </div>
    </div>
  );
}
