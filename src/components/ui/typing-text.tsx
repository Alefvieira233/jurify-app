import React, { useState, useEffect } from 'react';

interface TypingTextProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
    className?: string;
}

const TypingText: React.FC<TypingTextProps> = ({
    text,
    speed = 20,
    onComplete,
    className = ''
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        } else if (currentIndex === text.length && onComplete) {
            onComplete();
        }
        return undefined;
    }, [currentIndex, text, speed, onComplete]);

    return (
        <span className={className}>
            {displayedText}
            {currentIndex < text.length && (
                <span className="inline-block w-1 h-4 bg-blue-500 ml-1 animate-pulse"></span>
            )}
        </span>
    );
};

export default TypingText;
