import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function HomePage() {
    const { userId } = await auth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white">
            <nav className="flex justify-between items-center p-6">
                <h1 className="text-2xl font-bold">PlayFlow</h1>
                <div className="flex items-center gap-4">
                    {userId ? (
                        <>
                            <Link href="/dashboard" className="hover:underline">
                                Dashboard
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </>
                    ) : (
                        <>
                            <Link href="/sign-in" className="hover:underline">
                                Sign In
                            </Link>
                            <Link
                                href="/sign-up"
                                className="bg-white text-purple-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            <main className="container mx-auto px-6 pt-20 text-center">
                <h2 className="text-5xl font-bold mb-6">
                    Gamified Marketing Automation
                </h2>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
                    Create engaging games and interactive experiences to capture leads,
                    boost conversions, and delight your customers.
                </p>
                <Link
                    href={userId ? '/dashboard' : '/sign-up'}
                    className="bg-gradient-to-r from-pink-500 to-orange-500 px-8 py-4 rounded-full text-lg font-semibold hover:opacity-90 transition"
                >
                    {userId ? 'Go to Dashboard' : 'Start Free Trial'}
                </Link>
            </main>
        </div>
    );
}
