import React, { createContext, useState, useContext, useEffect } from 'react';

type Theme = 'dark' | 'pink';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        return savedTheme || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('app-theme', theme);
        if (theme === 'pink') {
            document.body.classList.add('theme-pink');
        } else {
            document.body.classList.remove('theme-pink');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'pink' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
