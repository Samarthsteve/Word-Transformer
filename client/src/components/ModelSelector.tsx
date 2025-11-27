import { motion } from "framer-motion";

type ModelSelectorProps = {
  selectedModel: "gemini" | "openai";
  onModelChange: (model: "gemini" | "openai") => void;
  disabled?: boolean;
};

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const models = [
    { id: "gemini" as const, label: "Gemini" },
    { id: "openai" as const, label: "OpenAI" },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border">
      {models.map((model) => (
        <button
          key={model.id}
          onClick={() => !disabled && onModelChange(model.id)}
          disabled={disabled}
          data-testid={`button-model-${model.id}`}
          className={`
            relative px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
            ${selectedModel === model.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
          `}
        >
          {selectedModel === model.id && (
            <motion.div
              layoutId="model-indicator"
              className="absolute inset-0 bg-background rounded-md border border-border shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10">{model.label}</span>
        </button>
      ))}
    </div>
  );
}
