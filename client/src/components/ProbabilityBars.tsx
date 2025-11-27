import { motion, AnimatePresence } from "framer-motion";
import type { TokenProbability } from "@shared/schema";

type ProbabilityBarsProps = {
  alternatives: TokenProbability[];
  currentToken: string;
  isVisible: boolean;
};

export function ProbabilityBars({ alternatives, currentToken, isVisible }: ProbabilityBarsProps) {
  const allTokens = [
    { token: currentToken, probability: alternatives.length > 0 ? Math.max(...alternatives.map(a => a.probability)) + 0.1 : 0.9 },
    ...alternatives,
  ].sort((a, b) => b.probability - a.probability).slice(0, 6);

  const maxProbability = Math.max(...allTokens.map((t) => t.probability), 0.01);

  return (
    <AnimatePresence mode="wait">
      {isVisible && allTokens.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl mx-auto space-y-3"
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">
            Probability Distribution
          </div>
          {allTokens.map((item, index) => {
            const isChosen = item.token === currentToken;
            const barWidth = (item.probability / maxProbability) * 100;
            const displayPercentage = (item.probability * 100).toFixed(1);

            return (
              <motion.div
                key={`${item.token}-${index}`}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: index * 0.08,
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="flex items-center gap-4"
              >
                <div className="w-24 text-right shrink-0">
                  <span 
                    className={`font-mono text-sm ${isChosen ? "text-primary font-bold" : "text-foreground/70"}`}
                    data-testid={`text-token-${index}`}
                  >
                    "{item.token}"
                  </span>
                </div>
                
                <div className="flex-1 h-10 bg-muted/30 rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ 
                      delay: index * 0.08 + 0.2,
                      duration: 0.7,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    className={`
                      h-full rounded-lg
                      ${isChosen 
                        ? "bg-gradient-to-r from-primary to-primary/80" 
                        : "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/20"
                      }
                    `}
                    style={{
                      opacity: isChosen ? 1 : 0.6 - (index * 0.08),
                    }}
                  />
                  {isChosen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.08 + 0.5 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="text-xs font-bold text-primary-foreground drop-shadow-sm">
                        CHOSEN
                      </span>
                    </motion.div>
                  )}
                </div>

                <div className="w-16 text-right shrink-0">
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.08 + 0.4 }}
                    className={`font-mono text-sm ${isChosen ? "text-primary font-bold" : "text-muted-foreground"}`}
                    data-testid={`text-probability-${index}`}
                  >
                    {displayPercentage}%
                  </motion.span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
