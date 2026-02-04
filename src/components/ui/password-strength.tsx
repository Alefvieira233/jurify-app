import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PasswordStrengthProps {
    password: string;
    showRequirements?: boolean;
}

type Requirement = {
    met: boolean;
    text: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({
    password,
    showRequirements = true
}) => {
    const [strength, setStrength] = useState<{
        score: number;
        requirements: Requirement[];
    }>({ score: 0, requirements: [] });

    useEffect(() => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasMinLength = password.length >= 6;

        const requirements = [
            { met: hasMinLength, text: 'Mínimo 6 caracteres', icon: hasMinLength ? CheckCircle2 : XCircle },
            { met: hasUpperCase, text: 'Letra maiúscula', icon: hasUpperCase ? CheckCircle2 : XCircle },
            { met: hasLowerCase, text: 'Letra minúscula', icon: hasLowerCase ? CheckCircle2 : XCircle },
            { met: hasNumbers, text: 'Número', icon: hasNumbers ? CheckCircle2 : XCircle },
            { met: hasSpecialChar, text: 'Caractere especial', icon: hasSpecialChar ? CheckCircle2 : XCircle },
        ];

        const score = requirements.filter(req => req.met).length;
        setStrength({ score, requirements });
    }, [password]);

    if (!password || !showRequirements) return null;

    const getStrengthColor = () => {
        if (strength.score >= 4) return 'text-emerald-200';
        if (strength.score >= 3) return 'text-amber-200';
        return 'text-red-300';
    };

    const getStrengthText = () => {
        if (strength.score >= 4) return 'Forte';
        if (strength.score >= 3) return 'Média';
        return 'Fraca';
    };

    return (
        <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Força da senha:</span>
                <span className={`text-xs font-semibold ${getStrengthColor()}`}>
                    {getStrengthText()}
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ${strength.score >= 4 ? 'bg-emerald-400' :
                            strength.score >= 3 ? 'bg-amber-400' :
                                'bg-red-400'
                        }`}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                />
            </div>

            {/* Requirements list */}
            <div className="space-y-1">
                {strength.requirements.map((req, index) => {
                    const Icon = req.icon;
                    return (
                        <div key={index} className="flex items-center space-x-2 text-xs">
                            <Icon className={`h-3 w-3 ${req.met ? 'text-emerald-200' : 'text-[hsl(var(--muted-foreground))]'}`} />
                            <span className={req.met ? 'text-emerald-200' : 'text-[hsl(var(--muted-foreground))]'}>
                                {req.text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PasswordStrength;

