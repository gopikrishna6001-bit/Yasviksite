/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			cormorant: ['var(--font-cormorant)'],
  			inter: ['var(--font-inter)'],
  		},
  		fontSize: {
  			'ysv-xs': 'var(--ysv-text-xs)',
  			'ysv-sm': 'var(--ysv-text-sm)',
  			'ysv-base': 'var(--ysv-text-base)',
  			'ysv-lg': 'var(--ysv-text-lg)',
  			'ysv-xl': 'var(--ysv-text-xl)',
  			'ysv-2xl': 'var(--ysv-text-2xl)',
  			'ysv-3xl': 'var(--ysv-text-3xl)',
  			'ysv-4xl': 'var(--ysv-text-4xl)',
  		},
  		spacing: {
  			'ysv-1': 'var(--ysv-space-1)',
  			'ysv-2': 'var(--ysv-space-2)',
  			'ysv-3': 'var(--ysv-space-3)',
  			'ysv-4': 'var(--ysv-space-4)',
  			'ysv-5': 'var(--ysv-space-5)',
  			'ysv-6': 'var(--ysv-space-6)',
  			'ysv-8': 'var(--ysv-space-8)',
  			'ysv-10': 'var(--ysv-space-10)',
  			'ysv-12': 'var(--ysv-space-12)',
  			'ysv-16': 'var(--ysv-space-16)',
  			'ysv-20': 'var(--ysv-space-20)',
  			'section-y': 'var(--ysv-section-y)',
  			'section-y-md': 'var(--ysv-section-y-md)',
  			'section-x': 'var(--ysv-section-x)',
  			'section-x-md': 'var(--ysv-section-x-md)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'ysv-sm': '0.75rem',
  			'ysv-md': '1rem',
  			'ysv-lg': 'var(--ysv-card-radius)',
  			'ysv-xl': '1.75rem',
  			'ysv-pill': 'var(--ysv-button-radius)',
  		},
  		boxShadow: {
  			'ysv-card': 'var(--ysv-shadow-paper)',
  			'ysv-card-hover': 'var(--ysv-shadow-paper-hover)',
  			'ysv-button': 'var(--ysv-shadow-button)',
  			'ysv-button-hover': 'var(--ysv-shadow-button-hover)',
  			'logo-glow': '0 0 24px rgba(52, 194, 48, 0.18)',
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			/* Monsoon-natural canonical palette */
  			'alabaster-bone': '#FAF7EF',
  			'raw-oatmeal': '#F3EDE0',
  			'deep-espresso': '#1F3D2B',
  			'sun-dried-clay': '#4B2D22',
  			'monsoon-indigo': '#FAF7EF',
  			'neon-paddy': '#34C230',
  			'fresh-green': '#62D75F',
  			'raw-copper': '#4B2D22',
  			'clean-silver': '#1F3D2B',
  			'warm-cream': '#FAF7EF',
  			'soft-border': '#E8E1D5',
  			'deep-forest': '#1F3D2B',
  			'earth-brown': '#4B2D22',
  			'primary-green': '#34C230',

  			/* Backward-compatible aliases — remapped to monsoon-natural */
  			'rain-mist': '#FAF7EF',
  			'temple-stone': '#E8E1D5',
  			'rain-cloud': '#1F3D2B',
  			'wet-earth': '#4B2D22',
  			'forest-canopy': '#1F3D2B',
  			'moss-green': '#34C230',
  			'warm-turmeric': '#4B2D22',
  			'rust-red': '#d8664e',
  			'rice-paper': '#FFFFFF',
  			'kraft-paper': '#F3EDE0',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
