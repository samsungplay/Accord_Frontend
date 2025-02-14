import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    nightwind: {
      colors: {
        white: "lime.700",
      },
    },
    extend: {
      screens: {
        mdh: {
          raw: "(min-height: 640px)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        loadBar: {
          "0%": {
            transform: "scaleX(0)",
          },
          "100%": {
            transform: "scaleX(100%)",
          },
        },
        fadeIn: {
          "0%": {
            opacity: "0.0",
          },
          "100%": {
            opacity: "1.0",
          },
        },
        fadeOut: {
          "0%": {
            opacity: "1.0",
          },
          "100%": {
            opacity: "0.0",
          },
        },
        volumeControllerAppear: {
          "0%": {
            transform: "rotate(-90deg)",
            opacity: "0.0",
          },
          "100%": {
            transform: "rotate(-90deg)",
            opacity: "1.0",
          },
        },
        volumeControllerDisappear: {
          "0%": {
            transform: "rotate(-90deg)",
            opacity: "1.0",
          },
          "100%": {
            transform: "rotate(-90deg)",
            opacity: "0.0",
          },
        },
        popOutCentered: {
          "0%": {
            transform: "scale(0) translateX(-50%)",
          },
          "100%": {
            transform: "scale(1) translateX(-50%)",
          },
        },
        popInCentered: {
          "0%": {
            transform: "scale(1) translateX(-50%)",
          },
          "100%": {
            transform: "scale(0) translateX(-50%)",
          },
        },
        loadingScreenIcon: {
          "0%": {
            transform: "rotate(80deg) translateY(2rem) translateX(2rem)",
          },
          "100%": {
            transform: "rotate(-400deg) translateY(-2rem) translateX(-2rem)",
          },
        },
        popOut: {
          "0%": {
            transform: "scale(0)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
        popIn: {
          "0%": {
            transform: "scale(1)",
          },
          "100%": {
            transform: "scale(0)",
          },
        },
        popOutWithWidth: {
          "0%": {
            transform: "scale(0)",
            maxWidth: "0",
            borderColor: "rgb(217,249,157)",
          },
          "50%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "rgb(217,249,157)",
          },
          "100%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "transparent",
          },
        },
        popOutWithWidthLightTheme: {
          "0%": {
            transform: "scale(0)",
            maxWidth: "0",
            borderColor: "rgb(77,124,15)",
          },
          "50%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "rgb(77,124,15)",
          },
          "100%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "transparent",
          },
        },

        pulseStronger: {
          "25%": {
            opacity: "0.4",
            backgroundColor: "white",
          },
          "75%": {
            opacity: "0.4",
            backgroundColor: "rgb(217,249,157)",
          },
        },

        pulseStrongerLightTheme: {
          "25%": {
            opacity: "0.4",
            backgroundColor: "white",
          },
          "75%": {
            opacity: "0.4",
            backgroundColor: "rgb(77, 124, 15)",
          },
        },

        popInWithScaleUp: {
          "0%": {
            transform: "scale(1)",
          },
          "20%": {
            transform: "scale(1.25)",
          },
          "100%": {
            transform: "scale(0)",
          },
        },
        music: {
          "0%": {
            transform: "scale(1) rotateZ(0)",
            color: "white",
          },
          "50%": {
            transform: "scale(1.25) rotateZ(15deg)",
            color: "rgb(163,230,53)",
          },
          "100%": {
            transform: "scale(1) rotateZ(-15deg)",
            color: "white",
          },
        },
        musicLightTheme: {
          "0%": {
            transform: "scale(1) rotateZ(0)",
            color: "rgb(77,124,15)",
          },
          "50%": {
            transform: "scale(1.25) rotateZ(15deg)",
            color: "rgb(132,204,22)",
          },
          "100%": {
            transform: "scale(1) rotateZ(-15deg)",
            color: "rgb(77,124,15)",
          },
        },

        popInWithWidth: {
          "0%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "rgb(77,124,15)",
          },
          "50%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "rgb(77,124,15)",
          },
          "100%": {
            transform: "scale(0)",
            maxWidth: "0",
            borderColor: "transparent",
          },
        },
        popInWithWidthLightTheme: {
          "0%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "rgb(217,249,157)",
          },
          "50%": {
            transform: "scale(1)",
            maxWidth: "5rem",
            borderColor: "rgb(217,249,157)",
          },
          "100%": {
            transform: "scale(0)",
            maxWidth: "0",
            borderColor: "transparent",
          },
        },
        fadeInAndUp: {
          "0%": { opacity: "0.0", transform: "translateY(1rem)" },
          "100%": { opacity: "1.0", transform: "translateY(0rem)" },
        },
        fadeInAndUpHalfOpacity: {
          "0%": { opacity: "0.0", transform: "translateY(1rem)" },
          "100%": { opacity: "0.5", transform: "translateY(0rem)" },
        },
        fadeInAndDown: {
          "0%": { opacity: "0.0", transform: "translateY(-1rem)" },
          "100%": { opacity: "1.0", transform: "translateY(0rem)" },
        },
        fadeOutAndDown: {
          "0%": { opacity: "1.0", transform: "translateY(0rem)" },
          "100%": { opacity: "0.0", transform: "translateY(1rem)" },
        },
        fadeInAndLeft: {
          "0%": { opacity: "0.0", transform: "translateX(1rem)" },
          "100%": { opacity: "1.0", transform: "translateX(0rem)" },
        },
        fadeInAndRight: {
          "0%": { opacity: "0.0", transform: "translateX(-1rem)" },
          "100%": { opacity: "1.0", transform: "translateX(0rem)" },
        },

        jiggle: {
          "0%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-0.5rem) " },
          "50%": { transform: "translateX(-0.5rem)" },
          "75%": { transform: "translateX(0.5rem) " },
          "100%": { transform: "translateX(0) " },
        },
        drawFromLeft: {
          "0%": {
            transform: "translateX(-15rem)",
          },
          "100%": {
            transform: "translateX(0rem)",
          },
        },
        drawToLeft: {
          "0%": {
            transform: "translateX(0rem)",
          },
          "100%": {
            transform: "translateX(-15rem)",
          },
        },
        drawFromLeftFurther: {
          "0%": {
            transform: "translateX(-18rem)",
          },
          "100%": {
            transform: "translateX(-3rem)",
          },
        },
        drawToLeftFurther: {
          "0%": {
            transform: "translateX(-3rem)",
          },
          "100%": {
            transform: "translateX(-18rem)",
          },
        },
        spinClockwise: {
          "0%": {
            transform: "rotateZ(0)",
          },
          "100%": {
            transform: "rotateZ(360deg)",
          },
        },
        jumpAndWave: {
          "0%, 100%": {
            transform: "rotate(0deg) translateY(0)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
          "12.5%": {
            transform: "rotate(10deg) translateY(-5px)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
          "25%": {
            transform: "rotate(20deg) translateY(-10px)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
          "37.5%": {
            transform: "rotate(10deg) translateY(-15px)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
          "50%": {
            transform: "rotate(0deg) translateY(-20px)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
          "62.5%": {
            transform: "rotate(-10deg) translateY(-15px)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
          "75%": {
            transform: "rotate(-20deg) translateY(-10px)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
          "87.5%": {
            transform: "rotate(-10deg) translateY(-5px)",
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
          },
        },
        tiltBackAndForth: {
          "0%": {
            transform: "rotateZ(0deg)",
          },
          "25%": {
            transform: "rotateZ(-10deg)",
          },
          "50%": {
            transform: "rotateZ(0deg)",
          },
          "75%": {
            transform: "rotateZ(10deg)",
          },
          "100%": {
            transform: "rotateZ(0deg)",
          },
        },
      },
      animation: {
        fadeInUp: "fadeInAndUp 0.5s ease-in-out",
        fadeInUpHalfOpacity: "fadeInAndUpHalfOpacity 0.5s ease-in-out",
        fadeInUpFaster: "fadeInAndUp 0.2s ease-in-out",
        fadeOutDown: "fadeOutAndDown 0.5s ease-in-out",
        jiggle: "jiggle 0.1s 7 ease-in-out",
        drawFromLeft: "drawFromLeft 0.3s ease-in-out forwards",
        drawToLeft: "drawToLeft 0.3s ease-in-out forwards",
        drawFromLeftFurther: "drawFromLeftFurther 0.3s ease-in-out forwards",
        drawToLeftFurther: "drawToLeftFurther 0.3s ease-in-out forwards",
        popOut: "popOut 0.1s ease-in-out forwards",
        spinClockwise: "spinClockwise 0.5s ease-in-out forwards",
        fadeInDown: "fadeInAndDown 0.5s ease-in-out",
        fadeInLeft: "fadeInAndLeft 0.5s ease-in-out",
        fadeInRight: "fadeInAndRight 0.5s ease-in-out",

        loadingScreenIcon:
          "loadingScreenIcon 3.0s ease-in-out infinite alternate",
        popIn: "popIn 0.3s ease-in-out forwards",
        popOutCentered: "popOutCentered 0.1s ease-in-out forwards",
        popInCentered: "popInCentered 0.3s ease-in-out forwards",
        volumeControllerAppear:
          "volumeControllerAppear 0.3s ease-in-out forwards",
        volumeControllerDisappear:
          "volumeControllerDisappear 0.3s ease-in-out forwards",
        fadeIn: "fadeIn 0.3s ease-in-out forwards",
        fadeOut: "fadeOut 0.3s ease-in-out forwards",
        jumpAndWave: "jumpAndWave 0.6s forwards",
        tiltBackAndForth: "tiltBackAndForth 0.75s ease-in-out forwards",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("nightwind")],
};
export default config;
