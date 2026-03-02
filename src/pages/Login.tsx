import { SignIn } from '@clerk/clerk-react';

export default function Login() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <SignIn
                routing="path"
                path="/login"
                afterSignInUrl="/"
                afterSignUpUrl="/"
                appearance={{
                    elements: {
                        card: 'bg-card text-card-foreground shadow-sm border border-border rounded-lg',
                        headerTitle: 'text-foreground',
                        headerSubtitle: 'text-muted-foreground',
                        formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
                        formFieldInput: 'bg-background border-input text-foreground',
                        formFieldLabel: 'text-foreground',
                        footerActionLink: 'text-primary hover:text-primary/90',
                    },
                }}
            />
        </div>
    );
}

