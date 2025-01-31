"use client";
import { FaFeather } from "react-icons/fa";

import React, { useMemo } from "react";

const LoadingScreen = () => {
  const randomLoadingText = useMemo(() => {
    const loadingMessages = [
      "Journeying to Harmony...",
      "Tuning the waves of connection...",
      "Synchronizing peaceful vibes...",
      "Bringing voices together...",
      "Calibrating serenity...",
      "Aligning the echoes of harmony...",
      "Setting the rhythm of conversation...",
      "Unfolding a tranquil space...",
      "Brewing calm connections...",
      "Weaving threads of unity...",
      "Balancing the symphony of words...",
      "Finding the perfect frequency...",
      "Floating towards peaceful discourse...",
      "Merging whispers and laughter...",
      "Blending voices into melody...",
      "Inviting warmth into words...",
      "Opening the gates to harmony...",
      "Filling the air with kindness...",
      "Painting conversations in soft hues...",
      "Letting words flow like a gentle stream...",
      "Softening the silence with presence...",
      "Creating space for gentle echoes...",
      "Orchestrating the dance of voices...",
      "Flowing into mindful dialogue...",
      "Carrying words like a soothing breeze...",
      "Sailing towards peaceful shores...",
      "Warming up the room for heartfelt talks...",
      "Gathering calm before the chat begins...",
      "Blossoming conversations, one word at a time...",
      "Illuminating the path to meaningful chats...",
    ];
    return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  }, []);

  return (
    <>
      <div className="animate-fadeIn bg-gradient-to-r from-lime-500 to-lime-600 dark:from-lime-400 dark:to-lime-300 w-[100vw] h-[100vh] fixed z-[100] grid place-content-center text-base sm:text-lg md:text-xl lg:text-3xl text-lime-400 text-center">
        <div className="text-center flex justify-center mb-4 animate-loadingScreenIcon z-10 sm:hidden">
          <FaFeather size={64} />
        </div>
        <div className="text-center justify-center mb-4 animate-loadingScreenIcon z-10 hidden sm:flex">
          <FaFeather size={128} />
        </div>

        <p className="text-center" suppressHydrationWarning>
          {randomLoadingText}
        </p>
      </div>
    </>
  );
};

export default LoadingScreen;
