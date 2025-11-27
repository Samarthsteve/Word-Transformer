import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type TransformerFeedbackProps = {
  inputToken: string;
  outputToken: string;
  isVisible: boolean;
};

export function TransformerFeedback({
  inputToken,
  outputToken,
  isVisible,
}: TransformerFeedbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between gap-4 py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 text-center"
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Token Input
          </div>
          <div className="px-4 py-3 bg-muted/50 rounded-lg border border-muted-foreground/20">
            <span className="font-mono text-lg font-bold text-foreground">
              {inputToken}
            </span>
          </div>
        </motion.div>

        <motion.div
          animate={isVisible ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 1.2, delay: 0.3, repeat: isVisible ? Infinity : 0 }}
        >
          <ArrowRight className="w-6 h-6 text-primary/60" />
        </motion.div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex-1"
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 text-center">
            Next Token
          </div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={isVisible ? { y: 0, opacity: 1 } : { y: 10, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="px-4 py-3 bg-primary/10 rounded-lg border border-primary/30"
          >
            <span className="font-mono text-lg font-bold text-primary">
              {outputToken}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
