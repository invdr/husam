import { useEffect, useMemo, useReducer, useState } from "react";

function typewriterReducer(state, action) {
  switch (action.type) {
    case "SET_CHAR_INDEX":
      return { ...state, charIndex: action.charIndex };
    case "SET_DELETING":
      return { ...state, isDeleting: action.isDeleting };
    case "NEXT_WORD":
      return {
        ...state,
        isDeleting: false,
        wordIndex: action.wordIndex,
        charIndex: 0,
      };
    default:
      return state;
  }
}

export function Typewriter({
  words,
  speed = 100,
  delayBetweenWords = 2000,
  cursor = true,
  cursorChar = "|",
}) {
  const [state, dispatch] = useReducer(typewriterReducer, {
    isDeleting: false,
    wordIndex: 0,
    charIndex: 0,
  });
  const [showCursor, setShowCursor] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const safeWords = useMemo(() => (Array.isArray(words) ? words : []), [words]);
  const currentWord = safeWords[state.wordIndex] || "";
  const displayText = isHovered
    ? currentWord
    : currentWord.substring(0, state.charIndex);

  useEffect(() => {
    if (isHovered) return;
    if (safeWords.length === 0) return;

    const isAtWordEnd = state.charIndex >= currentWord.length;
    const isAtStart = state.charIndex <= 0;

    const timeoutMs = state.isDeleting
      ? speed / 2
      : isAtWordEnd
        ? delayBetweenWords
        : speed;

    const timeout = setTimeout(() => {
      if (!state.isDeleting) {
        if (!isAtWordEnd) {
          dispatch({
            type: "SET_CHAR_INDEX",
            charIndex: state.charIndex + 1,
          });
        } else {
          dispatch({ type: "SET_DELETING", isDeleting: true });
        }
        return;
      }

      // Deleting mode
      if (!isAtStart) {
        dispatch({
          type: "SET_CHAR_INDEX",
          charIndex: state.charIndex - 1,
        });
        return;
      }

      // Finish deleting -> go next word
      const nextWordIndex = (state.wordIndex + 1) % safeWords.length;
      dispatch({ type: "NEXT_WORD", wordIndex: nextWordIndex });
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [
    state.charIndex,
    state.isDeleting,
    state.wordIndex,
    currentWord,
    speed,
    delayBetweenWords,
    safeWords,
    isHovered,
  ]);

  useEffect(() => {
    if (!cursor) return;

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [cursor]);

  return (
    <div
      className="inline-block whitespace-nowrap"
      onMouseEnter={() => {
        setIsHovered(true);
        setShowCursor(false);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowCursor(true);
      }}
    >
      <span>
        {displayText}
        {cursor && (
          <span
            className="ml-1 transition-opacity duration-75 text-brand"
            style={{ opacity: showCursor ? 1 : 0 }}
          >
            {cursorChar}
          </span>
        )}
      </span>
    </div>
  );
}

