import { motion, AnimatePresence } from "framer-motion";
import type { GeneratedToken } from "@shared/schema";

type TokenDisplayProps = {
  tokens: GeneratedToken[];
  currentIndex: number;
  isGenerating: boolean;
  showCursor: boolean;
};

export function TokenDisplay({ tokens, currentIndex, isGenerating, showCursor }: TokenDisplayProps) {
  const visibleTokens = tokens.slice(0, currentIndex + 1);

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[200px] flex flex-wrap items-start justify-center gap-x-2 gap-y-3 py-8">
      <AnimatePresence mode="popLayout">
        {visibleTokens.map((tokenData, index) => {
          const isCurrentToken = index === currentIndex;
          const isPreviousToken = index < currentIndex;

          return (
            <motion.span
              key={`${tokenData.token}-${index}`}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ 
                opacity: isPreviousToken ? 0.7 : 1, 
                y: 0, 
                scale: 1
              }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ 
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className={`
                font-mono inline-block
                ${isCurrentToken 
                  ? "text-4xl md:text-5xl lg:text-6xl font-bold text-primary" 
                  : "text-3xl md:text-4xl lg:text-5xl font-medium text-foreground/80"
                }
                ${isCurrentToken ? "bg-primary/10 px-3 py-1 rounded-lg" : ""}
              `}
              data-testid={`text-token-display-${index}`}
            >
              {tokenData.token}
            </motion.span>
          );
        })}
        
        {showCursor && (
          <motion.span
            key="cursor"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
            className="text-4xl md:text-5xl lg:text-6xl font-mono text-primary inline-block ml-1"
          >
            |
          </motion.span>
        )}
      </AnimatePresence>

      {visibleTokens.length === 0 && !isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground text-xl md:text-2xl font-medium text-center"
        >
          Enter a prompt to begin generation
        </motion.div>
      )}

      {isGenerating && visibleTokens.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 text-muted-foreground"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
          />
          <span className="text-lg font-medium">Generating tokens...</span>
        </motion.div>
      )}
    </div>
  );
}
