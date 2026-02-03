/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        'sans': ['Orbitron', 'system-ui', 'sans-serif'],
        'display': ['Orbitron', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      colors: {
        neon: {
          yellow: '#FFF700',
          blue: '#00F0FF',
          red: '#FF003C',
          green: '#39FF14',
          pink: '#FF10F0',
          orange: '#FF6B00',
          pink: '#FF10F0',
        },
        dark: {
          950: '#0A0A0A',
          900: '#121212',
          850: '#1A1A1A',
          800: '#1E1E1E',
          700: '#2A2A2A',
          600: '#363636',
        }
      },
      boxShadow: {
        'neon-yellow': '0 0 10px rgba(255, 247, 0, 0.3), 0 0 20px rgba(255, 247, 0, 0.2)',
        'neon-blue': '0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(0, 240, 255, 0.2)',
        'neon-red': '0 0 10px rgba(255, 0, 60, 0.3), 0 0 20px rgba(255, 0, 60, 0.2)',
        'neon-yellow-lg': '0 0 20px rgba(255, 247, 0, 0.4), 0 0 40px rgba(255, 247, 0, 0.2)',
        'neon-blue-lg': '0 0 20px rgba(0, 240, 255, 0.4), 0 0 40px rgba(0, 240, 255, 0.2)',
        'neon-red-lg': '0 0 20px rgba(255, 0, 60, 0.4), 0 0 40px rgba(255, 0, 60, 0.2)',
        'neon-green': '0 0 10px rgba(57, 255, 20, 0.3), 0 0 20px rgba(57, 255, 20, 0.2)',
        'neon-green-lg': '0 0 20px rgba(57, 255, 20, 0.4), 0 0 40px rgba(57, 255, 20, 0.2)',
        'neon-orange': '0 0 10px rgba(255, 107, 0, 0.3), 0 0 20px rgba(255, 107, 0, 0.2)',
        'neon-orange-lg': '0 0 20px rgba(255, 107, 0, 0.4), 0 0 40px rgba(255, 107, 0, 0.2)',
        'neon-pink': '0 0 10px rgba(255, 16, 240, 0.3), 0 0 20px rgba(255, 16, 240, 0.2)',
        'neon-pink-lg': '0 0 20px rgba(255, 16, 240, 0.4), 0 0 40px rgba(255, 16, 240, 0.2)',
      },
      borderRadius: {
        'card': '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideUp': 'slideUp 0.3s ease-out',
        'bounce-slow': 'bounce 3s infinite',
        'slideRoad': 'slideRoad 0.5s linear infinite',
        'slideRoadReverse': 'slideRoadReverse 0.5s linear infinite',
        'slideRoadInfinite': 'slideRoadInfinite 3s linear infinite',
        'bikeFast': 'bikeFast 3.5s ease-in-out forwards',
        'bikeMedium': 'bikeMedium 4s ease-in-out forwards',
        'bikeSlow': 'bikeSlow 4.5s ease-in-out forwards',
        'bikeReverseFast': 'bikeReverseFast 3.5s ease-in-out forwards',
        'bikeReverseMedium': 'bikeReverseMedium 4s ease-in-out forwards',
        'bikeReverseSlow': 'bikeReverseSlow 4.5s ease-in-out forwards',
        'speedLine': 'speedLine 0.3s linear infinite',
        'speedLineReverse': 'speedLineReverse 0.3s linear infinite',
        'goText': 'goText 0.6s ease-out 2.5s forwards',

      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRoad: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-8rem)' },
        },
        slideRoadInfinite: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        slideRoadReverse: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(8rem)' },
        },
        bikeFast: {
          '0%': { transform: 'translateX(-100px)' },
          '100%': { transform: 'translateX(calc(100vw + 100px))' },
        },
        bikeMedium: {
          '0%': { transform: 'translateX(-150px)' },
          '100%': { transform: 'translateX(calc(100vw + 100px))' },
        },
        bikeSlow: {
          '0%': { transform: 'translateX(-200px)' },
          '100%': { transform: 'translateX(calc(100vw + 100px))' },
        },
        bikeReverseFast: {
          '0%': { transform: 'translateX(calc(100vw + 100px))' },
          '100%': { transform: 'translateX(-100px)' },
        },
        bikeReverseMedium: {
          '0%': { transform: 'translateX(calc(100vw + 100px))' },
          '100%': { transform: 'translateX(-150px)' },
        },
        bikeReverseSlow: {
          '0%': { transform: 'translateX(calc(100vw + 100px))' },
          '100%': { transform: 'translateX(-200px)' },
        },
        speedLine: {
          '0%': { transform: 'translateX(0) scaleX(1)', opacity: '1' },
          '100%': { transform: 'translateX(-30px) scaleX(0.5)', opacity: '0' },
        },
        speedLineReverse: {
          '0%': { transform: 'translateX(0) scaleX(1)', opacity: '1' },
          '100%': { transform: 'translateX(30px) scaleX(0.5)', opacity: '0' },
        },
        goText: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      maxWidth: {
        'mobile': '480px',
        'tablet': '768px',
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        // Ocultar controles de input number
        'input[type="number"]::-webkit-inner-spin-button': {
          '-webkit-appearance': 'none',
          'margin': '0',
        },
        'input[type="number"]::-webkit-outer-spin-button': {
          '-webkit-appearance': 'none',
          'margin': '0',
        },
        'input[type="number"]': {
          '-moz-appearance': 'textfield',
        },
      });
    },
  ],

}
