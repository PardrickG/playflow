import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserWorkspaces, syncUserToDatabase } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    // Sync user and get workspaces
    await syncUserToDatabase(userId);
    const memberships = await getUserWorkspaces(userId);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="border-b border-gray-800 p-6">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold">PlayFlow Dashboard</h1>
                    <Link href="/" className="text-gray-400 hover:text-white">
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="container mx-auto p-6">
                <section className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Your Workspaces</h2>
                        <Link
                            href="/workspaces/new"
                            className="bg-gradient-to-r from-pink-500 to-orange-500 px-4 py-2 rounded-lg hover:opacity-90 transition"
                        >
                            Create Workspace
                        </Link>
                    </div>

                    {memberships.length === 0 ? (
                        <div className="bg-gray-800/50 rounded-xl p-12 text-center">
                            <p className="text-gray-400 mb-4">You don't have any workspaces yet.</p>
                            <Link
                                href="/workspaces/new"
                                className="text-pink-400 hover:underline"
                            >
                                Create your first workspace →
                            </Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {memberships.map((m) => (
                                <Link
                                    key={m.workspace.id}
                                    href={`/workspaces/${m.workspace.slug}`}
                                    className="bg-gray-800/50 rounded-xl p-6 hover:bg-gray-800 transition border border-gray-700 hover:border-pink-500"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        {m.workspace.logoUrl ? (
                                            <img
                                                src={m.workspace.logoUrl}
                                                alt={m.workspace.name}
                                                className="w-12 h-12 rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-xl font-bold">
                                                {m.workspace.name[0]}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold">{m.workspace.name}</h3>
                                            <p className="text-sm text-gray-400">{m.role}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
