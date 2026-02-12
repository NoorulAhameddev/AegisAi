
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-200 gap-4 p-4 text-center">
            <div className="p-6 rounded-full bg-zinc-900 border border-zinc-800">
                <Wrench className="h-12 w-12 text-yellow-500 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold">Under Maintenance</h1>
            <p className="text-zinc-500 max-w-md">
                We are currently performing scheduled maintenance.
                Please check back in a few minutes.
            </p>
        </div>
    );
}
