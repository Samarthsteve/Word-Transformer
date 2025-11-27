import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedToken, GenerateResponse } from "@shared/schema";

import { ModelSelector } from "@/components/ModelSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PromptInput } from "@/components/PromptInput";
import { TokenDisplay } from "@/components/TokenDisplay";
import { ProbabilityBars } from "@/components/ProbabilityBars";
import { Controls } from "@/components/Controls";
import { EducationalAnnotation } from "@/components/EducationalAnnotation";
import { TransformerFeedback } from "@/components/TransformerFeedback";

type AnnotationState = "idle" | "generating" | "revealing" | "showing-probabilities" | "complete";

export default function Exhibition() {
  const [selectedModel, setSelectedModel] = useState<"gemini" | "openai">("gemini");
  const [prompt, setPrompt] = useState("");
  const [tokens, setTokens] = useState<GeneratedToken[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showProbabilities, setShowProbabilities] = useState(false);
  const [annotationState, setAnnotationState] = useState<AnnotationState>("idle");
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [showTransformer, setShowTransformer] = useState(false);
  const fastForwardRef = useRef(false);

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; model: "gemini" | "openai" }) => {
      const response = await apiRequest("POST", "/api/generate", data);
      const jsonData = await response.json();
      return jsonData as GenerateResponse;
    },
    onSuccess: (data) => {
      const validTokens = Array.isArray(data?.tokens) ? data.tokens : [];
      if (validTokens.length === 0) {
        console.warn("No tokens received from API");
        setAnnotationState("idle");
        return;
      }
      setTokens(validTokens);
      setCurrentIndex(-1);
      setShowProbabilities(false);
      setAnnotationState("revealing");
    },
    onError: (error) => {
      console.error("Generation error:", error);
      setAnnotationState("idle");
    },
  });

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;
    setAnnotationState("generating");
    generateMutation.mutate({ prompt, model: selectedModel });
  }, [prompt, selectedModel, generateMutation]);

  const handleNext = useCallback(() => {
    if (currentIndex < tokens.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setShowProbabilities(true);
      setAnnotationState("showing-probabilities");

      if (newIndex === tokens.length - 1) {
        setTimeout(() => {
          setAnnotationState("complete");
        }, 1500);
      }
    }
  }, [currentIndex, tokens.length]);

  const handleFastForward = useCallback(() => {
    if (tokens.length === 0) return;
    fastForwardRef.current = true;

    const revealNext = (index: number) => {
      if (index >= tokens.length || !fastForwardRef.current) {
        fastForwardRef.current = false;
        setShowProbabilities(true);
        setAnnotationState("complete");
        return;
      }

      setCurrentIndex(index);
      setShowProbabilities(true);

      setTimeout(() => {
        revealNext(index + 1);
      }, 100);
    };

    revealNext(currentIndex + 1);
  }, [currentIndex, tokens.length]);

  const handleReset = useCallback(() => {
    fastForwardRef.current = false;
    setTokens([]);
    setCurrentIndex(-1);
    setShowProbabilities(false);
    setPrompt("");
    setAnnotationState("idle");
    generateMutation.reset();
  }, [generateMutation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        if (tokens.length > 0 && currentIndex < tokens.length - 1 && !generateMutation.isPending) {
          e.preventDefault();
          handleNext();
        }
      }
      if (e.key === "Escape") {
        handleReset();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        handleFastForward();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tokens.length, currentIndex, generateMutation.isPending, handleNext, handleReset, handleFastForward]);

  const isGenerating = generateMutation.isPending;
  const hasTokens = tokens.length > 0;
  const canNext = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const canFastForward = hasTokens && currentIndex < tokens.length - 1 && !isGenerating;
  const isComplete = hasTokens && currentIndex === tokens.length - 1;

  const currentToken = currentIndex >= 0 && currentIndex < tokens.length ? tokens[currentIndex] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium text-muted-foreground"
        >
          Transformer Token Generator
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4"
        >
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isGenerating || hasTokens}
          />
          <ThemeToggle />
        </motion.div>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-24">
        <div className="w-full max-w-6xl mx-auto space-y-12">
          {!hasTokens && (
            <PromptInput
              prompt={prompt}
              onPromptChange={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              hasTokens={hasTokens}
            />
          )}

          {hasTokens && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Prompt
              </div>
              <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
                "{prompt}"
              </p>
            </motion.div>
          )}

          <TokenDisplay
            tokens={tokens}
            currentIndex={currentIndex}
            isGenerating={isGenerating}
            showCursor={isGenerating || (hasTokens && !isComplete)}
          />

          {currentToken && showProbabilities && (
            <ProbabilityBars
              alternatives={currentToken.alternatives}
              currentToken={currentToken.token}
              isVisible={showProbabilities}
            />
          )}

          {hasTokens && (
            <Controls
              onNext={handleNext}
              onFastForward={handleFastForward}
              onReset={handleReset}
              canNext={canNext}
              canFastForward={canFastForward}
              isComplete={isComplete}
              currentIndex={currentIndex}
              totalTokens={tokens.length}
            />
          )}

          <EducationalAnnotation
            state={annotationState}
            currentTokenIndex={currentIndex}
            totalTokens={tokens.length}
          />
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 p-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground"
        >
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Enter</kbd> for next token
          <span className="mx-2">|</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Cmd+F</kbd> to fast forward
          <span className="mx-2">|</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Esc</kbd> to reset
        </motion.p>
      </footer>
    </div>
  );
}
