import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <img 
          src="/Fluency Lab.png" 
          alt="Fluency Lab" 
          className="mx-auto max-w-sm w-full h-auto mix-blend-multiply"
        />
        <p className="text-2xl text-gray-600 dark:text-gray-300 -mt-30">
          Improve your English speaking skills with AI-powered feedback
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button>Login</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">Register</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
