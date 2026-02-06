import {
    ClerkProvider,
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
} from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'PlayFlow - Gamified Marketing Automation',
    description: 'Create engaging games and interactive experiences to capture leads and boost conversions.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body>
                    <header className="fixed top-0 right-0 p-4 z-50">
                        <SignedOut>
                            <div className="flex gap-3">
                                <SignInButton mode="modal">
                                    <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                                        Sign In
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500 transition-colors">
                                        Sign Up
                                    </button>
                                </SignUpButton>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            <UserButton
                                appearance={{
                                    elements: {
                                        avatarBox: 'w-10 h-10',
                                    },
                                }}
                            />
                        </SignedIn>
                    </header>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}

