"use client";

export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex justify-center gap-3.5 my-5">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`h-3.5 w-3.5 rounded-full border-[1.5px] ${
            i < filled ? "bg-brand-blue border-brand-blue" : "border-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export function NumPad({
  onPress,
  onBackspace,
}: {
  onPress: (digit: string) => void;
  onBackspace: () => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-3.5 px-8">
      {keys.map((k, i) => {
        if (k === "") return <div key={i} />;
        if (k === "back") {
          return (
            <button
              key={i}
              onClick={onBackspace}
              className="h-13 flex items-center justify-center text-sm text-gray-400"
            >
              ⌫
            </button>
          );
        }
        return (
          <button
            key={i}
            onClick={() => onPress(k)}
            className="h-13 rounded-2xl border border-gray-200 bg-white text-lg font-display font-semibold dark:bg-gray-900 dark:border-gray-700 dark:text-white"
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
